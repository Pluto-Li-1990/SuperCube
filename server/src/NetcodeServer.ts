import {
  createServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse
} from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import { AccountStore } from "./AccountStore.js";
import { AppleTokenVerifier } from "./AppleTokenVerifier.js";
import type { ClientMessage, PieceDefDTO, PlayerSide, ServerMessage } from "./types.js";

type ClientMode = "IDLE" | "WAITING" | "PLAYING";

const MAX_WS_PAYLOAD_BYTES = 16 * 1024;
const MAX_HTTP_BODY_BYTES = 16 * 1024;
const MAX_PLAYER_NAME_CHARS = 24;
const MAX_CUSTOM_BAG_PIECES = 16;
const MAX_PIECE_CELLS = 4;
const MAX_PIECE_TEXT_CHARS = 48;
const MIN_ELEMENT = 0;
const MAX_ELEMENT = 8;
const MIN_CELL_COORD = -4;
const MAX_CELL_COORD = 4;

interface ClientState {
  id: string;
  ws: WebSocket;
  mode: ClientMode;
  name: string;
  accountId?: string;
  bag: PieceDefDTO[];
  matchId?: string;
  side?: PlayerSide;
  lastPingAt: number;
}

interface MatchState {
  id: string;
  seed: number;
  expectedTurnIndex: number;
  players: Record<PlayerSide, ClientState>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBoundedInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function sanitizeText(value: unknown, fallback: string, maxChars: number): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return fallback;
  }

  return Array.from(normalized).slice(0, maxChars).join("");
}

function sanitizeBag(value: unknown): PieceDefDTO[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const pieces: PieceDefDTO[] = [];
  for (const rawPiece of value.slice(0, MAX_CUSTOM_BAG_PIECES)) {
    if (!isRecord(rawPiece) || !Array.isArray(rawPiece.cells)) {
      continue;
    }

    if (rawPiece.cells.length < 1 || rawPiece.cells.length > MAX_PIECE_CELLS) {
      continue;
    }

    const cells = rawPiece.cells
      .filter(isRecord)
      .map((cell) => {
        if (
          !isBoundedInteger(cell.x, MIN_CELL_COORD, MAX_CELL_COORD) ||
          !isBoundedInteger(cell.y, MIN_CELL_COORD, MAX_CELL_COORD) ||
          !isBoundedInteger(cell.element, MIN_ELEMENT, MAX_ELEMENT)
        ) {
          return null;
        }
        return { x: cell.x, y: cell.y, element: cell.element };
      })
      .filter((cell): cell is { x: number; y: number; element: number } => cell !== null);

    if (cells.length !== rawPiece.cells.length) {
      continue;
    }

    pieces.push({
      id: sanitizeText(rawPiece.id, "custom", MAX_PIECE_TEXT_CHARS),
      name: sanitizeText(rawPiece.name, "Custom", MAX_PIECE_TEXT_CHARS),
      custom: rawPiece.custom === true,
      cells
    });
  }

  return pieces;
}

export interface NetcodeServerOptions {
  port?: number;
  host?: string;
  heartbeatTimeoutMs?: number;
  heartbeatSweepMs?: number;
  accountStorePath?: string;
  appleAudience?: string;
}

export class NetcodeServer {
  private readonly clients = new Set<ClientState>();
  private readonly waitingQueue: ClientState[] = [];
  private readonly matches = new Map<string, MatchState>();
  private readonly httpServer: HttpServer;
  private readonly wss: WebSocketServer;
  private readonly accountStore: AccountStore;
  private readonly appleTokenVerifier: AppleTokenVerifier;
  private readonly heartbeatTimeoutMs: number;
  private readonly heartbeatSweepMs: number;
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(private readonly options: NetcodeServerOptions = {}) {
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 15_000;
    this.heartbeatSweepMs = options.heartbeatSweepMs ?? 1_000;
    this.accountStore = new AccountStore(options.accountStorePath);
    this.appleTokenVerifier = new AppleTokenVerifier(options.appleAudience ?? "com.pluto.supercube");
    this.httpServer = createServer((req, res) => {
      void this.handleHttpRequest(req, res);
    });
    this.wss = new WebSocketServer({ server: this.httpServer, maxPayload: MAX_WS_PAYLOAD_BYTES });
    this.wss.on("connection", (ws) => this.handleConnection(ws));
  }

  async start(): Promise<number> {
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(() => this.sweepHeartbeats(), this.heartbeatSweepMs);
    }

    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        this.httpServer.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        this.httpServer.off("error", onError);
        resolve();
      };

      this.httpServer.once("error", onError);
      this.httpServer.once("listening", onListening);
      this.httpServer.listen(this.options.port ?? 8090, this.options.host);
    });

    const address = this.httpServer.address();
    if (typeof address === "object" && address) {
      return address.port;
    }
    return this.options.port ?? 8090;
  }

  async stop(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    for (const client of [...this.clients]) {
      client.ws.close();
    }
    this.clients.clear();
    this.waitingQueue.splice(0);
    this.matches.clear();

    await new Promise<void>((resolve, reject) => {
      this.wss.close((wsError) => {
        if (wsError) {
          reject(wsError);
          return;
        }
        if (!this.httpServer.listening) {
          resolve();
          return;
        }

        this.httpServer.close((httpError) => {
          if (httpError) {
            reject(httpError);
            return;
          }
          resolve();
        });
      });
    });
  }

  private async handleHttpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    this.setCorsHeaders(res);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", "http://localhost");

    try {
      if (req.method === "GET" && url.pathname === "/healthz") {
        this.writeJSON(res, 200, {
          ok: true,
          clients: this.clients.size,
          waiting: this.waitingQueue.filter((client) => client.mode === "WAITING").length,
          matches: this.matches.size
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/auth/guest") {
        const body = await this.readJSON(req);
        const { account, token } = this.accountStore.createGuest(body.displayName);
        this.writeJSON(res, 200, { account: this.accountStore.publicAccount(account), token });
        return;
      }

      if (req.method === "POST" && url.pathname === "/auth/apple") {
        const body = await this.readJSON(req);
        const verified = await this.appleTokenVerifier.verify(body.identityToken);
        if (!verified) {
          this.writeJSON(res, 401, { error: "INVALID_APPLE_TOKEN" });
          return;
        }

        const { account, token } = this.accountStore.upsertApple(
          verified.subject,
          body.displayName,
          verified.email
        );
        this.writeJSON(res, 200, { account: this.accountStore.publicAccount(account), token });
        return;
      }

      if (req.method === "GET" && url.pathname === "/auth/me") {
        const account = this.accountStore.getByToken(this.getBearerToken(req));
        if (!account) {
          this.writeJSON(res, 401, { error: "UNAUTHORIZED" });
          return;
        }

        this.writeJSON(res, 200, { account: this.accountStore.publicAccount(account) });
        return;
      }

      if (req.method === "POST" && url.pathname === "/auth/delete") {
        const deleted = this.accountStore.deleteByToken(this.getBearerToken(req));
        if (!deleted) {
          this.writeJSON(res, 401, { error: "UNAUTHORIZED" });
          return;
        }

        this.writeJSON(res, 200, { ok: true });
        return;
      }

      this.writeJSON(res, 404, { error: "NOT_FOUND" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "SERVER_ERROR";
      this.writeJSON(res, message === "REQUEST_TOO_LARGE" || message === "BAD_JSON" ? 400 : 500, {
        error: message
      });
    }
  }

  private readJSON(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      let total = 0;
      const chunks: Buffer[] = [];

      req.on("data", (chunk: Buffer) => {
        total += chunk.length;
        if (total > MAX_HTTP_BODY_BYTES) {
          reject(new Error("REQUEST_TOO_LARGE"));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });

      req.on("end", () => {
        try {
          const body = Buffer.concat(chunks).toString("utf8") || "{}";
          const parsed = JSON.parse(body) as unknown;
          resolve(isRecord(parsed) ? parsed : {});
        } catch {
          reject(new Error("BAD_JSON"));
        }
      });

      req.on("error", reject);
    });
  }

  private getBearerToken(req: IncomingMessage): string | null {
    const header = req.headers.authorization;
    if (!header) {
      return null;
    }

    const match = /^Bearer\s+(.+)$/i.exec(header);
    return match?.[1] ?? null;
  }

  private setCorsHeaders(res: ServerResponse): void {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type,authorization");
  }

  private writeJSON(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    });
    res.end(JSON.stringify(body));
  }

  private handleConnection(ws: WebSocket): void {
    const client: ClientState = {
      id: randomUUID(),
      ws,
      mode: "IDLE",
      name: "Player",
      bag: [],
      lastPingAt: Date.now()
    };
    this.clients.add(client);

    ws.on("message", (raw, isBinary) => this.handleWsMessage(client, raw, isBinary));
    ws.on("close", () => this.handleDisconnect(client));
    ws.on("error", () => this.handleDisconnect(client));
  }

  private handleWsMessage(client: ClientState, raw: RawData, isBinary: boolean): void {
    if (isBinary) {
      this.sendError(client, "BAD_MESSAGE", "Binary messages are not supported.");
      return;
    }

    this.handleRawMessage(client, raw.toString());
  }

  private handleRawMessage(client: ClientState, raw: string): void {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw) as ClientMessage;
    } catch {
      this.sendError(client, "BAD_JSON", "Message must be valid JSON.");
      return;
    }

    if (!message || typeof message.type !== "string") {
      this.sendError(client, "BAD_MESSAGE", "Message must include a type field.");
      return;
    }

    switch (message.type) {
      case "queue":
        this.queueClient(client, message);
        break;
      case "cancelQueue":
        this.cancelQueue(client);
        break;
      case "turn":
        this.handleTurn(client, message);
        break;
      case "leave":
        this.handleLeave(client, message.matchId);
        break;
      case "ping":
        client.lastPingAt = Date.now();
        this.send(client, { type: "pong", t: message.t });
        break;
      default:
        this.sendError(client, "BAD_MESSAGE", "Unknown message type.");
        break;
    }
  }

  private queueClient(client: ClientState, message: Extract<ClientMessage, { type: "queue" }>): void {
    if (client.mode === "PLAYING") {
      this.sendError(client, "ALREADY_PLAYING", "Client is already in a match.");
      return;
    }

    if (client.mode === "WAITING") {
      this.send(client, { type: "queued" });
      return;
    }

    const account = this.accountStore.getByToken(message.accountToken);
    client.accountId = account?.id;
    client.name = account?.displayName ?? sanitizeText(message.name, "Player", MAX_PLAYER_NAME_CHARS);
    client.bag = sanitizeBag(message.bag);
    client.mode = "WAITING";
    this.waitingQueue.push(client);
    this.send(client, { type: "queued" });
    this.tryCreateMatches();
  }

  private cancelQueue(client: ClientState): void {
    if (client.mode !== "WAITING") {
      return;
    }

    this.removeFromQueue(client);
    client.mode = "IDLE";
  }

  private tryCreateMatches(): void {
    while (this.waitingQueue.length >= 2) {
      const playerA = this.nextWaitingClient();
      const playerB = this.nextWaitingClient();

      if (!playerA || !playerB) {
        return;
      }

      const match: MatchState = {
        id: randomUUID(),
        seed: randomBytes(4).readUInt32BE(0),
        expectedTurnIndex: 0,
        players: { A: playerA, B: playerB }
      };

      this.matches.set(match.id, match);
      this.markPlaying(playerA, match.id, "A");
      this.markPlaying(playerB, match.id, "B");

      const bags = { A: playerA.bag, B: playerB.bag };
      this.send(playerA, {
        type: "matchFound",
        matchId: match.id,
        seed: match.seed,
        you: "A",
        opponent: { name: playerB.name },
        bags
      });
      this.send(playerB, {
        type: "matchFound",
        matchId: match.id,
        seed: match.seed,
        you: "B",
        opponent: { name: playerA.name },
        bags
      });
    }
  }

  private nextWaitingClient(): ClientState | undefined {
    while (this.waitingQueue.length > 0) {
      const client = this.waitingQueue.shift();
      if (client && client.mode === "WAITING" && client.ws.readyState === WebSocket.OPEN) {
        return client;
      }
    }
    return undefined;
  }

  private markPlaying(client: ClientState, matchId: string, side: PlayerSide): void {
    client.mode = "PLAYING";
    client.matchId = matchId;
    client.side = side;
  }

  private handleTurn(client: ClientState, message: Extract<ClientMessage, { type: "turn" }>): void {
    const match = this.matches.get(message.matchId);
    if (
      !match ||
      client.mode !== "PLAYING" ||
      client.matchId !== message.matchId
    ) {
      this.sendError(client, "OUT_OF_ORDER", "Turn is not the next expected turn for this player.");
      return;
    }

    const expectedSide: PlayerSide = match.expectedTurnIndex % 2 === 0 ? "A" : "B";
    if (client.side !== expectedSide || message.turnIndex !== match.expectedTurnIndex) {
      this.sendError(client, "OUT_OF_ORDER", "Turn is not the next expected turn for this player.");
      return;
    }

    const payload: ServerMessage = {
      type: "turn",
      matchId: match.id,
      turnIndex: message.turnIndex,
      by: client.side,
      move: message.move
    };
    this.broadcast(match, payload);
    match.expectedTurnIndex += 1;
  }

  private handleLeave(client: ClientState, matchId?: string): void {
    if (client.mode === "WAITING") {
      this.cancelQueue(client);
      return;
    }

    if (client.mode === "PLAYING" && client.matchId === matchId) {
      this.finishMatch(client, true);
    }
  }

  private handleDisconnect(client: ClientState): void {
    if (!this.clients.has(client)) {
      return;
    }

    if (client.mode === "WAITING") {
      this.removeFromQueue(client);
    } else if (client.mode === "PLAYING") {
      this.finishMatch(client, false);
    }

    this.clients.delete(client);
  }

  private finishMatch(leaver: ClientState, resetLeaver: boolean): void {
    if (!leaver.matchId) {
      return;
    }

    const match = this.matches.get(leaver.matchId);
    if (!match) {
      this.resetClientMatchState(leaver);
      return;
    }

    this.matches.delete(match.id);
    const opponent = match.players.A === leaver ? match.players.B : match.players.A;
    if (opponent.ws.readyState === WebSocket.OPEN) {
      this.send(opponent, { type: "opponentLeft", matchId: match.id });
    }
    this.resetClientMatchState(opponent);

    if (resetLeaver) {
      this.resetClientMatchState(leaver);
    }
  }

  private resetClientMatchState(client: ClientState): void {
    client.mode = "IDLE";
    client.matchId = undefined;
    client.side = undefined;
  }

  private removeFromQueue(client: ClientState): void {
    const index = this.waitingQueue.indexOf(client);
    if (index >= 0) {
      this.waitingQueue.splice(index, 1);
    }
  }

  private sweepHeartbeats(): void {
    const now = Date.now();
    for (const client of [...this.clients]) {
      if (now - client.lastPingAt > this.heartbeatTimeoutMs) {
        client.ws.terminate();
        this.handleDisconnect(client);
      }
    }
  }

  private broadcast(match: MatchState, message: ServerMessage): void {
    this.send(match.players.A, message);
    this.send(match.players.B, message);
  }

  private send(client: ClientState, message: ServerMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  private sendError(client: ClientState, code: string, message: string): void {
    this.send(client, { type: "error", code, message });
  }
}

export function createNetcodeServer(options?: NetcodeServerOptions): NetcodeServer {
  return new NetcodeServer(options);
}
