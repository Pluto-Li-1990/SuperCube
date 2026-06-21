import { ClientMessage, ServerMessage, MoveDTO, PieceDefDTO } from "./netTypes";

// 兼容浏览器 WebSocket 与 node `ws` 的最小接口（均支持 on* 属性）
export interface WebSocketLike {
  send(data: string): void;
  close(): void;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
}
export type WebSocketCtor = new (url: string) => WebSocketLike;

type Handlers = {
  open?: () => void;
  matchFound?: (m: Extract<ServerMessage, { type: "matchFound" }>) => void;
  turn?: (m: Extract<ServerMessage, { type: "turn" }>) => void;
  opponentLeft?: () => void;
  error?: (code: string, message: string) => void;
  close?: () => void;
};

export class NetClient {
  private ws: WebSocketLike;
  private handlers: Handlers = {};
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(url: string, wsCtor?: WebSocketCtor) {
    const Ctor =
      wsCtor ?? (globalThis as unknown as { WebSocket: WebSocketCtor }).WebSocket;
    this.ws = new Ctor(url);
    this.ws.onopen = () => {
      this.startPing();
      this.handlers.open?.();
    };
    this.ws.onmessage = (ev) => this.onMessage(String(ev.data));
    this.ws.onclose = () => {
      this.stopPing();
      this.handlers.close?.();
    };
    this.ws.onerror = () => this.handlers.error?.("WS_ERROR", "连接错误");
  }

  on<K extends keyof Handlers>(event: K, cb: Handlers[K]): void {
    this.handlers[event] = cb;
  }

  private onMessage(raw: string): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }
    switch (msg.type) {
      case "matchFound":
        this.handlers.matchFound?.(msg);
        break;
      case "turn":
        this.handlers.turn?.(msg);
        break;
      case "opponentLeft":
        this.handlers.opponentLeft?.();
        break;
      case "error":
        this.handlers.error?.(msg.code, msg.message);
        break;
      default:
        break;
    }
  }

  private send(m: ClientMessage): void {
    this.ws.send(JSON.stringify(m));
  }

  queue(name: string, bag?: PieceDefDTO[]): void {
    this.send({ type: "queue", name, bag });
  }
  cancelQueue(): void {
    this.send({ type: "cancelQueue" });
  }
  sendTurn(matchId: string, turnIndex: number, move: MoveDTO): void {
    this.send({ type: "turn", matchId, turnIndex, move });
  }
  leave(matchId: string): void {
    this.send({ type: "leave", matchId });
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => this.send({ type: "ping", t: Date.now() }), 5000);
  }
  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  close(): void {
    this.stopPing();
    this.ws.close();
  }
}
