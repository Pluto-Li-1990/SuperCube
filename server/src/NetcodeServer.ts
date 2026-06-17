import { createServer, type Server as HttpServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import type { ClientMessage, PieceDefDTO, PlayerSide, ServerMessage } from "./types.js";

type ClientMode = "IDLE" | "WAITING" | "PLAYING";

interface ClientState {
  id: string;
  ws: WebSocket;
  mode: ClientMode;
  name: string;
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

export interface NetcodeServerOptions {
  port?: number;
  host?: string;
  heartbeatTimeoutMs?: number;
  heartbeatSweepMs?: number;
}

export class NetcodeServer {
  private readonly clients = new Set<ClientState>();
  private readonly waitingQueue: ClientState[] = [];
  private readonly matches = new Map<string, MatchState>();
  private readonly httpServer: HttpServer;
  private readonly wss: WebSocketServer;
  private readonly heartbeatTimeoutMs: number;
  private readonly heartbeatSweepMs: number;
  private heartbeatTimer?: NodeJS.Timeout;

  constructor(private readonly options: NetcodeServerOptions = {}) {
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 15_000;
    this.heartbeatSweepMs = options.heartbeatSweepMs ?? 1_000;
    this.httpServer = createServer();
    this.wss = new WebSocketServer({ server: this.httpServer });
    this.wss.on("connection", (ws) => this.handleConnection(ws));
  }

  async start(): Promise<number> {
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(() => this.sweepHeartbeats(), this.heartbeatSweepMs);
    }

    await new Promise<void>((resolve) => {
      this.httpServer.listen(this.options.port ?? 8090, this.options.host, resolve);
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

    ws.on("message", (raw) => this.handleRawMessage(client, raw.toString()));
    ws.on("close", () => this.handleDisconnect(client));
    ws.on("error", () => this.handleDisconnect(client));
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

    client.name = typeof message.name === "string" && message.name.trim() ? message.name : "Player";
    client.bag = Array.isArray(message.bag) ? message.bag : [];
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
