import { Game } from "../core/engine";
import { PieceDef, WEATHER_NAMES, WEATHER_DESC } from "../core/types";
import { drawGrid, drawPieceCells, DrawOpts } from "./render";
import { WEATHER_ICON } from "./colors";
import { NetClient } from "../net/netClient";
import { applyMove, pieceToDTO } from "../net/lockstep";
import { PlayerSide } from "../net/netTypes";
import { audio } from "./audio";

export interface OnlineOpts {
  serverUrl: string;
  name: string;
  playerBag: PieceDef[];
  onExit: () => void;
}

// 在线对战：真人 vs 真人，经服务器锁步同步
export class OnlineBattle {
  root: HTMLElement;
  opts: OnlineOpts;
  client: NetClient;
  game: Game | null = null;
  mySide: PlayerSide = "A";
  matchId = "";
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  cell = 28;
  raf = 0;
  rotations = 0; // 本回合已成功旋转次数
  fallTimer?: ReturnType<typeof setInterval>;
  lockPending = false;
  resultShown = false;
  private flashes: { x: number; y: number; t: number; destroy: boolean }[] = [];
  touch = { active: false, sx: 0, sy: 0, lx: 0, ly: 0, startPx: 0, lock: "" as "" | "h" | "v" };

  constructor(root: HTMLElement, opts: OnlineOpts) {
    this.root = root;
    this.opts = opts;
    this.showStatus("正在连接服务器…");
    this.client = new NetClient(opts.serverUrl);
    this.client.on("open", () => {
      this.showStatus("匹配中…（等待对手）");
      this.client.queue(opts.name, opts.playerBag.map(pieceToDTO));
    });
    this.client.on("error", (_c, m) => this.showStatus(`连接失败：${m}。请检查服务器地址。`, true));
    this.client.on("close", () => {
      if (!this.game) this.showStatus("连接已断开。", true);
    });
    this.client.on("matchFound", (m) => this.onMatchFound(m));
    this.client.on("turn", (msg) => this.onRemoteTurn(msg.by, msg.move));
    this.client.on("opponentLeft", () => this.endMatch("对手已离开，你获胜！"));
  }

  private showStatus(text: string, error = false): void {
    this.root.innerHTML = `
      <div class="ob-status">
        <button class="btn-exit" id="ob-back">‹ 大厅</button>
        <div class="ob-spinner ${error ? "err" : ""}"></div>
        <p>${text}</p>
      </div>`;
    document.getElementById("ob-back")!.onclick = () => this.quit();
  }

  private onMatchFound(m: { matchId: string; seed: number; you: PlayerSide; bags: { A: PieceDef[] | { id: string }[]; B: unknown[] }; opponent: { name: string } }): void {
    this.mySide = m.you;
    this.matchId = m.matchId;
    const toBag = (arr: unknown[]) =>
      (arr as { id: string; name: string; custom: boolean; cells: { x: number; y: number; element: number }[] }[]).map(
        (d) => ({ id: d.id, name: d.name, custom: d.custom, cells: d.cells.map((c) => ({ x: c.x, y: c.y, element: c.element })) }) as unknown as PieceDef,
      );
    this.game = new Game({ seed: m.seed, mode: "shared-turn", customBagA: toBag(m.bags.A), customBagB: toBag(m.bags.B) });
    this.buildBoard(m.opponent.name);
    this.loop();
    this.fallTimer = setInterval(() => this.fallTick(), 800);
    audio.syncBgm();
  }

  private isMyTurn(): boolean {
    return !!this.game && !this.game.gameOver && this.game.current === this.mySide;
  }

  // ===== 我方落子：乐观提交本地 + 上报；对手回合：收到后重放 =====
  private commitMine(): void {
    if (!this.game || !this.isMyTurn()) return;
    const move = { rotation: this.rotations, px: this.game.active!.px, hardDrop: true as const };
    this.client.sendTurn(this.matchId, this.game.turn, move);
    const before = this.snapElements();
    const res = this.game.commitTurn(); // 乐观本地提交
    this.addFlashes(before);
    audio.lock();
    if (res.linesCleared > 0) audio.clear(res.linesCleared);
    this.rotations = 0;
    this.lockPending = false;
    this.afterAnyTurn();
  }

  private onRemoteTurn(by: PlayerSide, move: { rotation: number; px: number; hardDrop: true }): void {
    if (!this.game) return;
    if (by === this.mySide) return; // 自己的回合已乐观提交，忽略回显
    const before = this.snapElements();
    const res = applyMove(this.game, move);
    this.addFlashes(before);
    audio.lock();
    if (res.linesCleared > 0) audio.clear(res.linesCleared);
    this.rotations = 0;
    this.afterAnyTurn();
  }

  private afterAnyTurn(): void {
    if (this.game!.gameOver) this.endMatch();
  }

  private snapElements(): number[][] {
    return this.game!.grid.cells.map((row) => row.map((c) => c.element));
  }

  private addFlashes(before: number[][]): void {
    const after = this.snapElements();
    const now = performance.now();
    for (let y = 0; y < after.length; y++)
      for (let x = 0; x < after[y].length; x++)
        if (before[y]?.[x] !== after[y][x])
          this.flashes.push({ x, y, t: now, destroy: after[y][x] === 0 });
  }

  private fallTick(): void {
    if (!this.isMyTurn() || !this.game!.active) return;
    if (!this.game!.step()) {
      if (this.lockPending) this.commitMine();
      else this.lockPending = true;
    } else this.lockPending = false;
  }

  private buildBoard(oppName: string): void {
    this.root.innerHTML = `
      <div class="battle-wrap">
        <div class="battle-top">
          <button class="btn-exit" id="ob-exit">‹ 离开</button>
          <div class="weather-station" id="ob-weather"></div>
          <div class="mode-badge">在线</div>
        </div>
        <div class="players-row">
          <div class="ppanel" id="ob-me"></div>
          <div class="ppanel side-B" id="ob-opp"></div>
        </div>
        <div class="battle-mid"><div class="board-col"><canvas id="ob-canvas"></canvas></div></div>
        <div class="gesture-hint">你的回合才能操作 · 拖动移动 · 轻点旋转 · 下滑落子</div>
      </div>`;
    document.getElementById("ob-exit")!.onclick = () => this.quit();
    this.canvas = document.getElementById("ob-canvas") as HTMLCanvasElement;
    const cssW = this.game!.grid.w * this.cell;
    const cssH = this.game!.grid.h * this.cell;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = cssW + "px";
    this.canvas.style.height = cssH + "px";
    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.scale(dpr, dpr);
    this.oppName = oppName;
    this.bindInput();
  }
  private oppName = "对手";

  private bindInput(): void {
    const c = this.canvas;
    c.addEventListener("touchstart", (e) => { audio.resume(); this.tStart(e); }, { passive: false });
    c.addEventListener("touchmove", (e) => this.tMove(e), { passive: false });
    c.addEventListener("touchend", (e) => this.tEnd(e), { passive: false });
    this._key = (e: KeyboardEvent) => {
      if (!this.isMyTurn() || !this.game!.active) return;
      if (e.key === "ArrowLeft") { if (this.game!.move(-1)) audio.move(); }
      else if (e.key === "ArrowRight") { if (this.game!.move(1)) audio.move(); }
      else if (e.key === "ArrowUp") { if (this.game!.rotate()) { this.rotations++; audio.rotate(); } }
      else if (e.key === " ") { e.preventDefault(); this.commitMine(); }
    };
    window.addEventListener("keydown", this._key);
  }
  private _key?: (e: KeyboardEvent) => void;

  private tStart(e: TouchEvent): void {
    if (!this.isMyTurn() || !this.game!.active) return;
    const t = e.touches[0];
    this.touch = { active: true, sx: t.clientX, sy: t.clientY, lx: t.clientX, ly: t.clientY, startPx: this.game!.active!.px, lock: "" };
  }
  private tMove(e: TouchEvent): void {
    if (!this.touch.active || !this.isMyTurn()) return;
    e.preventDefault();
    const t = e.touches[0];
    this.touch.lx = t.clientX; this.touch.ly = t.clientY;
    const dx = t.clientX - this.touch.sx, dy = t.clientY - this.touch.sy;
    if (!this.touch.lock && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) this.touch.lock = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    if (this.touch.lock === "h") {
      const rect = this.canvas.getBoundingClientRect();
      const desired = this.touch.startPx + Math.round(dx / (rect.width / this.game!.grid.w));
      while (this.game!.active!.px < desired && this.game!.move(1)) { /* */ }
      while (this.game!.active!.px > desired && this.game!.move(-1)) { /* */ }
    }
  }
  private tEnd(_e: TouchEvent): void {
    if (!this.touch.active) return;
    this.touch.active = false;
    if (!this.isMyTurn()) return;
    const dx = this.touch.lx - this.touch.sx, dy = this.touch.ly - this.touch.sy;
    if (this.touch.lock === "v" && dy > 0 && Math.abs(dy) > Math.abs(dx)) this.commitMine();
    else if (!this.touch.lock) { if (this.game!.rotate()) { this.rotations++; audio.rotate(); } }
  }

  private loop = (): void => {
    if (this.game) this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private render(): void {
    const opts: DrawOpts = { ox: 0, oy: 0, cell: this.cell };
    drawGrid(this.ctx, this.game!.grid, opts);
    if (this.game!.active) {
      const abs = this.game!.active.cells.map((c) => ({ x: this.game!.active!.px + c.x, y: this.game!.active!.py + c.y, element: c.element }));
      drawPieceCells(this.ctx, abs, opts, this.isMyTurn() ? 1 : 0.8);
    }
    this.renderPanels();
    const w = this.game!.weather;
    const el = document.getElementById("ob-weather");
    if (el) el.innerHTML = `<div class="w-now">${WEATHER_ICON[w.current]} <b>${WEATHER_NAMES[w.current]}</b></div><div class="w-desc">${WEATHER_DESC[w.current]}</div>`;
    const now = performance.now();
    this.flashes = this.flashes.filter((f) => now - f.t < 650);
    for (const f of this.flashes) {
      const k = 1 - (now - f.t) / 650;
      const x0 = f.x * this.cell + 1.5, y0 = f.y * this.cell + 1.5;
      const w = this.cell - 3, h = this.cell - 3, r = this.cell * 0.2;
      this.ctx.save();
      this.ctx.globalAlpha = Math.min(1, k * 1.1);
      this.ctx.strokeStyle = f.destroy ? "#ff9a3c" : "#aee9ff";
      this.ctx.lineWidth = 2 + k * 2.5;
      this.ctx.shadowColor = f.destroy ? "#ff7a3c" : "#6fc8ff";
      this.ctx.shadowBlur = 14 * k;
      this.ctx.beginPath();
      this.ctx.moveTo(x0 + r, y0);
      this.ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
      this.ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
      this.ctx.arcTo(x0, y0 + h, x0, y0, r);
      this.ctx.arcTo(x0, y0, x0 + w, y0, r);
      this.ctx.closePath();
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private renderPanels(): void {
    const me = document.getElementById("ob-me");
    const opp = document.getElementById("ob-opp");
    if (!me || !opp || !this.game) return;
    const mine = this.game.players[this.mySide];
    const other = this.game.players[this.mySide === "A" ? "B" : "A"];
    me.className = `ppanel ${this.isMyTurn() ? "active" : ""}`;
    me.innerHTML = `<div class="p-id"><span class="pavatar">🧑</span><span class="pname">你${this.isMyTurn() ? " <span class='turn-dot'>●</span>" : ""}</span></div><div class="p-score-wrap"><div class="pscore">${mine.score}</div><div class="plabel">分</div></div>`;
    opp.className = `ppanel side-B ${!this.isMyTurn() && !this.game.gameOver ? "active" : ""}`;
    opp.innerHTML = `<div class="p-id"><span class="pavatar">🧑</span><span class="pname">${this.oppName}</span></div><div class="p-score-wrap"><div class="pscore">${other.score}</div><div class="plabel">分</div></div>`;
  }

  private endMatch(forced?: string): void {
    if (this.resultShown) return;
    this.resultShown = true;
    const mine = this.game ? this.game.players[this.mySide].score : 0;
    const other = this.game ? this.game.players[this.mySide === "A" ? "B" : "A"].score : 0;
    let title = forced ?? (mine > other ? "🏆 你赢了！" : other > mine ? "对手获胜" : "平局");
    audio.gameOver(mine >= other);
    const overlay = document.createElement("div");
    overlay.className = "result-overlay";
    overlay.innerHTML = `<div class="result-card"><h2>${title}</h2><p>你 ${mine} : ${other} 对手</p><button id="ob-r-exit">返回大厅</button></div>`;
    this.root.append(overlay);
    document.getElementById("ob-r-exit")!.onclick = () => this.quit();
  }

  private quit(): void {
    if (this.matchId) this.client.leave(this.matchId);
    this.destroy();
    this.opts.onExit();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    if (this.fallTimer) clearInterval(this.fallTimer);
    if (this._key) window.removeEventListener("keydown", this._key);
    this.client.close();
  }
}
