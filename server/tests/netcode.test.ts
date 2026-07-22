import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createNetcodeServer, type NetcodeServer } from "../src/NetcodeServer.js";
import type { MoveDTO, PieceDefDTO, ServerMessage } from "../src/types.js";

const testBagA: PieceDefDTO[] = [
  {
    id: "custom-a",
    name: "Alpha",
    custom: true,
    cells: [
      { x: 0, y: 0, element: 1 },
      { x: 1, y: 0, element: 2 }
    ]
  }
];

const testBagB: PieceDefDTO[] = [
  {
    id: "custom-b",
    name: "Beta",
    custom: true,
    cells: [{ x: 0, y: 0, element: 3 }]
  }
];

class TestClient {
  private readonly inbox: ServerMessage[] = [];
  private readonly waiters: {
    predicate: (message: ServerMessage) => boolean;
    resolve: (message: ServerMessage) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }[] = [];

  private constructor(readonly ws: WebSocket) {
    ws.on("message", (raw) => this.receive(JSON.parse(raw.toString()) as ServerMessage));
    ws.on("error", (error) => {
      for (const waiter of this.waiters.splice(0)) {
        clearTimeout(waiter.timeout);
        waiter.reject(error);
      }
    });
  }

  static connect(url: string): Promise<TestClient> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.once("open", () => resolve(new TestClient(ws)));
      ws.once("error", reject);
    });
  }

  send(message: unknown): void {
    this.ws.send(JSON.stringify(message));
  }

  waitFor(predicate: (message: ServerMessage) => boolean = () => true): Promise<ServerMessage> {
    const existingIndex = this.inbox.findIndex(predicate);
    if (existingIndex >= 0) {
      const [message] = this.inbox.splice(existingIndex, 1);
      return Promise.resolve(message);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waiters.findIndex((waiter) => waiter.resolve === resolve);
        if (index >= 0) {
          this.waiters.splice(index, 1);
        }
        reject(new Error("Timed out waiting for WebSocket message."));
      }, 2_000);
      this.waiters.push({ predicate, resolve, reject, timeout });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }
      this.ws.once("close", () => resolve());
      this.ws.close();
    });
  }

  private receive(message: ServerMessage): void {
    const waiterIndex = this.waiters.findIndex((waiter) => waiter.predicate(message));
    if (waiterIndex >= 0) {
      const [waiter] = this.waiters.splice(waiterIndex, 1);
      clearTimeout(waiter.timeout);
      waiter.resolve(message);
      return;
    }
    this.inbox.push(message);
  }
}

async function waitForMatch(a: TestClient, b: TestClient) {
  const matchA = (await a.waitFor((message) => message.type === "matchFound")) as Extract<
    ServerMessage,
    { type: "matchFound" }
  >;
  const matchB = (await b.waitFor((message) => message.type === "matchFound")) as Extract<
    ServerMessage,
    { type: "matchFound" }
  >;
  return { matchA, matchB };
}

function closeAll(clients: TestClient[]): Promise<void[]> {
  return Promise.all(clients.map((client) => client.close()));
}

describe("SuperCube netcode server", () => {
  let server: NetcodeServer;
  let url: string;
  let clients: TestClient[];

  beforeEach(async () => {
    clients = [];
    server = createNetcodeServer({ port: 0, host: "127.0.0.1", heartbeatTimeoutMs: 5_000 });
    const port = await server.start();
    url = `ws://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await closeAll(clients);
    await server.stop();
  });

  async function newClient(): Promise<TestClient> {
    const client = await TestClient.connect(url);
    clients.push(client);
    return client;
  }

  it("matches two queued players with shared seed, sides, opponents, and bags", async () => {
    const a = await newClient();
    const b = await newClient();

    a.send({ type: "queue", name: "Alice", bag: testBagA });
    await expect(a.waitFor((message) => message.type === "queued")).resolves.toMatchObject({
      type: "queued"
    });
    b.send({ type: "queue", name: "Bob", bag: testBagB });
    await expect(b.waitFor((message) => message.type === "queued")).resolves.toMatchObject({
      type: "queued"
    });

    const { matchA, matchB } = await waitForMatch(a, b);

    expect(matchA.matchId).toBe(matchB.matchId);
    expect(matchA.seed).toBe(matchB.seed);
    expect(Number.isInteger(matchA.seed)).toBe(true);
    expect(matchA.seed).toBeGreaterThanOrEqual(0);
    expect(matchA.seed).toBeLessThanOrEqual(0xffffffff);
    expect(new Set([matchA.you, matchB.you])).toEqual(new Set(["A", "B"]));
    expect(matchA.opponent).toEqual({ name: "Bob" });
    expect(matchB.opponent).toEqual({ name: "Alice" });
    expect(matchA.bags).toEqual({ A: testBagA, B: testBagB });
    expect(matchB.bags).toEqual({ A: testBagA, B: testBagB });
  });

  it("serves health status for ECS and reverse proxy checks", async () => {
    const response = await fetch(`http://127.0.0.1:${new URL(url).port}/healthz`);
    await expect(response.status).toBe(200);
    await expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      clients: 0,
      waiting: 0,
      matches: 0
    });
  });

  it("enforces side parity and monotonically increasing turn order", async () => {
    const a = await newClient();
    const b = await newClient();
    a.send({ type: "queue", name: "Alice" });
    b.send({ type: "queue", name: "Bob" });
    const { matchA } = await waitForMatch(a, b);
    const move: MoveDTO = { rotation: 0, px: 4, hardDrop: true };

    a.send({ type: "turn", matchId: matchA.matchId, turnIndex: 0, move });
    await expect(a.waitFor((message) => message.type === "turn")).resolves.toMatchObject({
      type: "turn",
      matchId: matchA.matchId,
      turnIndex: 0,
      by: "A",
      move
    });
    await expect(b.waitFor((message) => message.type === "turn")).resolves.toMatchObject({
      type: "turn",
      matchId: matchA.matchId,
      turnIndex: 0,
      by: "A",
      move
    });

    b.send({ type: "turn", matchId: matchA.matchId, turnIndex: 0, move });
    await expect(b.waitFor((message) => message.type === "error")).resolves.toMatchObject({
      type: "error",
      code: "OUT_OF_ORDER"
    });

    for (let turnIndex = 1; turnIndex < 4; turnIndex += 1) {
      const player = turnIndex % 2 === 0 ? a : b;
      const by = turnIndex % 2 === 0 ? "A" : "B";
      const turnMove: MoveDTO = { rotation: turnIndex % 4, px: turnIndex + 1, hardDrop: true };
      player.send({ type: "turn", matchId: matchA.matchId, turnIndex, move: turnMove });

      await expect(a.waitFor((message) => message.type === "turn")).resolves.toMatchObject({
        type: "turn",
        matchId: matchA.matchId,
        turnIndex,
        by,
        move: turnMove
      });
      await expect(b.waitFor((message) => message.type === "turn")).resolves.toMatchObject({
        type: "turn",
        matchId: matchA.matchId,
        turnIndex,
        by,
        move: turnMove
      });
    }
  });

  it("forwards moves without changing fields", async () => {
    const a = await newClient();
    const b = await newClient();
    a.send({ type: "queue", name: "Alice" });
    b.send({ type: "queue", name: "Bob" });
    const { matchA } = await waitForMatch(a, b);
    const move: MoveDTO = { rotation: 3, px: -1, hardDrop: true };

    a.send({ type: "turn", matchId: matchA.matchId, turnIndex: 0, move });

    const forwarded = (await b.waitFor(
      (message) => message.type === "turn"
    )) as Extract<ServerMessage, { type: "turn" }>;
    expect(forwarded.move).toEqual(move);
    expect(Object.keys(forwarded.move).sort()).toEqual(["hardDrop", "px", "rotation"]);
  });

  it("notifies the opponent when a player disconnects", async () => {
    const a = await newClient();
    const b = await newClient();
    a.send({ type: "queue", name: "Alice" });
    b.send({ type: "queue", name: "Bob" });
    const { matchA } = await waitForMatch(a, b);

    await a.close();

    await expect(b.waitFor((message) => message.type === "opponentLeft")).resolves.toEqual({
      type: "opponentLeft",
      matchId: matchA.matchId
    });
  });

  it("removes canceled players from matchmaking", async () => {
    const canceled = await newClient();
    const a = await newClient();
    const b = await newClient();

    canceled.send({ type: "queue", name: "Canceled" });
    await canceled.waitFor((message) => message.type === "queued");
    canceled.send({ type: "cancelQueue" });

    a.send({ type: "queue", name: "Alice" });
    await a.waitFor((message) => message.type === "queued");
    b.send({ type: "queue", name: "Bob" });
    await b.waitFor((message) => message.type === "queued");

    const { matchA, matchB } = await waitForMatch(a, b);
    expect(matchA.opponent).toEqual({ name: "Bob" });
    expect(matchB.opponent).toEqual({ name: "Alice" });

    canceled.send({ type: "ping", t: 123 });
    await expect(canceled.waitFor((message) => message.type === "pong")).resolves.toEqual({
      type: "pong",
      t: 123
    });
  });

  it("matches 50 pairs and relays 20 turns each without cross-talk", async () => {
    const pairs: { a: TestClient; b: TestClient; matchId: string }[] = [];

    for (let index = 0; index < 50; index += 1) {
      const a = await newClient();
      const b = await newClient();
      a.send({ type: "queue", name: `A-${index}` });
      b.send({ type: "queue", name: `B-${index}` });
      const { matchA, matchB } = await waitForMatch(a, b);
      expect(matchA.matchId).toBe(matchB.matchId);
      expect(matchA.opponent.name).toBe(`B-${index}`);
      expect(matchB.opponent.name).toBe(`A-${index}`);
      pairs.push({ a, b, matchId: matchA.matchId });
    }

    const seenMatchIds = new Set(pairs.map((pair) => pair.matchId));
    expect(seenMatchIds.size).toBe(50);

    for (const pair of pairs) {
      for (let turnIndex = 0; turnIndex < 20; turnIndex += 1) {
        const player = turnIndex % 2 === 0 ? pair.a : pair.b;
        const by = turnIndex % 2 === 0 ? "A" : "B";
        const move: MoveDTO = { rotation: turnIndex % 4, px: turnIndex, hardDrop: true };
        player.send({ type: "turn", matchId: pair.matchId, turnIndex, move });

        const messages = await Promise.all([
          pair.a.waitFor((message) => message.type === "turn"),
          pair.b.waitFor((message) => message.type === "turn")
        ]);
        for (const message of messages) {
          expect(message).toMatchObject({
            type: "turn",
            matchId: pair.matchId,
            turnIndex,
            by,
            move
          });
        }
      }
    }
  }, 20_000);
});
