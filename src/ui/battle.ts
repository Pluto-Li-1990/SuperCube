import { Game, GameMode, TurnResult } from "../core/engine";
import { PieceDef, WEATHER_NAMES, WEATHER_DESC, ELEMENT_NAMES } from "../core/types";
import { aiPlayTurn, AIDifficulty } from "../ai/ai";
import { drawGrid, drawPieceCells, DrawOpts } from "./render";
import { WEATHER_ICON, ELEMENT_COLORS } from "./colors";
import { settings } from "./settings";
import { audio } from "./audio";

export interface BattleOpts {
  mode: GameMode;
  difficulty: AIDifficulty;
  playerBag: PieceDef[];
  aiBag?: PieceDef[]; // Loadout Debuff：强塞进对手掉落池的棋子
  seed?: number;
  onExit: () => void;
}

export class Battle {
  root: HTMLElement;
  game: Game;
  opts: BattleOpts;
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  cell = 26;
  raf = 0;
  busy = false; // AI 回合锁
  log: string[] = [];
  fallTimer?: ReturnType<typeof setInterval>;
  lockPending = false; // 落地缓冲：再过一拍才锁定，期间可微调
  matchTimer?: ReturnType<typeof setInterval>;
  timeLeft = 0;
  resultShown = false;
  private flashes: { x: number; y: number; t: number; destroy: boolean }[] = [];

  constructor(root: HTMLElement, opts: BattleOpts) {
    this.root = root;
    this.opts = opts;
    this.game = new Game({
      seed: opts.seed,
      mode: opts.mode,
      aiPlayer: "B",
      customBagA: opts.playerBag,
      customBagB: opts.aiBag,
    });
    this.build();
    this.bindKeys();
    this.loop();
    this.startFall();
    audio.syncBgm();
    if (this.opts.mode === "time-attack") this.startMatchTimer();
  }

  private startMatchTimer(): void {
    this.timeLeft = 90;
    this.updateTimerUI();
    this.matchTimer = setInterval(() => {
      this.timeLeft--;
      this.updateTimerUI();
      if (this.timeLeft <= 0) {
        if (this.matchTimer) clearInterval(this.matchTimer);
        this.game.gameOver = true;
        const a = this.game.players.A.score;
        const b = this.game.players.B.score;
        this.game.winner = a > b ? "A" : b > a ? "B" : null;
        this.showResult();
      }
    }, 1000);
  }

  private updateTimerUI(): void {
    const el = document.getElementById("mode-badge");
    if (el) el.textContent = `⏱ ${this.timeLeft}s`;
  }

  private startFall(): void {
    this.fallTimer = setInterval(() => this.fallTick(), settings.fallMs);
  }

  // 自动下落一格；到底后给一拍缓冲，仍不能下落则锁定
  private fallTick(): void {
    if (this.game.gameOver || this.busy) return;
    if (this.game.current !== "A" || !this.game.active) return;
    const moved = this.game.step();
    if (!moved) {
      if (this.lockPending) {
        this.lockPending = false;
        this.humanCommit();
      } else {
        this.lockPending = true;
      }
    } else {
      this.lockPending = false;
    }
  }

  private build(): void {
    this.root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "battle-wrap";

    // 顶部：天气预报站 + 退出
    const top = document.createElement("div");
    top.className = "battle-top";
    top.innerHTML = `<button class="btn-exit" id="b-exit">‹ 大厅</button>
      <div class="weather-station" id="weather-station"></div>
      <div class="mode-badge" id="mode-badge">${modeName(this.opts.mode)}</div>`;
    wrap.append(top);

    // 双方信息一排（棋盘上方，竖屏友好）
    const players = document.createElement("div");
    players.className = "players-row";
    players.innerHTML = `
      <div class="ppanel" id="panel-A"></div>
      <div class="ppanel" id="panel-B"></div>`;
    wrap.append(players);

    // 棋盘
    const mid = document.createElement("div");
    mid.className = "battle-mid";
    mid.innerHTML = `<div class="board-col"><canvas id="board-canvas"></canvas></div>`;
    wrap.append(mid);

    // 手势提示
    const hint = document.createElement("div");
    hint.className = "gesture-hint";
    hint.textContent = "拖动棋子左右移动 · 轻点旋转 · 向下滑落子";
    wrap.append(hint);

    // 底部：触控按钮（备用）+ 日志
    const ctrl = document.createElement("div");
    ctrl.className = "battle-ctrl";
    ctrl.innerHTML = `
      <button class="ctrl-btn" data-act="left">◀</button>
      <button class="ctrl-btn" data-act="rotate">⟳</button>
      <button class="ctrl-btn" data-act="right">▶</button>
      <button class="ctrl-btn drop" data-act="drop">落子 ⤓</button>`;
    wrap.append(ctrl);

    const logEl = document.createElement("div");
    logEl.className = "battle-log";
    logEl.id = "battle-log";
    wrap.append(logEl);

    this.root.append(wrap);

    // 响应式格子尺寸：竖屏占满宽度
    const avail = Math.min(window.innerWidth, 460) - 24;
    this.cell = Math.max(18, Math.min(34, Math.floor(avail / this.game.grid.w)));

    this.canvas = document.getElementById("board-canvas") as HTMLCanvasElement;
    const cssW = this.game.grid.w * this.cell;
    const cssH = this.game.grid.h * this.cell;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = cssW + "px";
    this.canvas.style.height = cssH + "px";
    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.scale(dpr, dpr); // 高分屏清晰渲染
    this.bindTouch();

    document.getElementById("b-exit")!.onclick = () => {
      cancelAnimationFrame(this.raf);
      this.opts.onExit();
    };
    ctrl.querySelectorAll(".ctrl-btn").forEach((b) => {
      (b as HTMLElement).onclick = () => this.act((b as HTMLElement).dataset.act!);
    });
  }

  // ===== 直接拖拽 + 手势 =====
  private touch = { active: false, sx: 0, sy: 0, lx: 0, ly: 0, startPx: 0, lock: "" as "" | "h" | "v", t0: 0 };

  private bindTouch(): void {
    const c = this.canvas;
    c.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
    c.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
    c.addEventListener("touchend", (e) => this.onTouchEnd(e), { passive: false });
  }

  private canDrive(): boolean {
    return !this.game.gameOver && !this.busy && this.game.current === "A" && !!this.game.active;
  }

  private onTouchStart(e: TouchEvent): void {
    audio.resume();
    if (!this.canDrive()) return;
    const t = e.touches[0];
    this.touch = {
      active: true, sx: t.clientX, sy: t.clientY, lx: t.clientX, ly: t.clientY,
      startPx: this.game.active!.px, lock: "", t0: performance.now(),
    };
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.touch.active || !this.canDrive()) return;
    e.preventDefault();
    const t = e.touches[0];
    this.touch.lx = t.clientX;
    this.touch.ly = t.clientY;
    const dx = t.clientX - this.touch.sx;
    const dy = t.clientY - this.touch.sy;
    if (!this.touch.lock && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      this.touch.lock = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (this.touch.lock === "h") {
      const rect = this.canvas.getBoundingClientRect();
      const cellPx = rect.width / this.game.grid.w;
      const desired = this.touch.startPx + Math.round(dx / cellPx);
      while (this.game.active!.px < desired && this.game.move(1)) { /* 右移 */ }
      while (this.game.active!.px > desired && this.game.move(-1)) { /* 左移 */ }
    }
  }

  private onTouchEnd(_e: TouchEvent): void {
    if (!this.touch.active) return;
    this.touch.active = false;
    if (!this.canDrive()) return;
    const dt = performance.now() - this.touch.t0;
    const dx = this.touch.lx - this.touch.sx;
    const dy = this.touch.ly - this.touch.sy;
    if (this.touch.lock === "v" && dy > 0 && Math.abs(dy) > Math.abs(dx)) {
      this.humanCommit(); // 向下滑 → 硬降落子
    } else if (!this.touch.lock && dt < 300) {
      if (this.game.rotate()) audio.rotate(); // 轻点 → 旋转
    }
  }

  private bindKeys(): void {
    this._keyHandler = (e: KeyboardEvent) => {
      if (this.game.gameOver) return;
      const map: Record<string, string> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "rotate",
        ArrowDown: "down",
        " ": "drop",
      };
      const act = map[e.key];
      if (act) {
        e.preventDefault();
        this.act(act);
      }
    };
    window.addEventListener("keydown", this._keyHandler);
  }
  private _keyHandler?: (e: KeyboardEvent) => void;

  private act(act: string): void {
    if (this.busy || this.game.gameOver) return;
    audio.resume();
    if (this.game.current !== "A") return; // 仅人类回合可操作
    switch (act) {
      case "left":
        if (this.game.move(-1)) audio.move();
        break;
      case "right":
        if (this.game.move(1)) audio.move();
        break;
      case "rotate":
        if (this.game.rotate()) audio.rotate();
        break;
      case "down":
        this.game.step();
        break;
      case "drop":
        this.humanCommit();
        break;
    }
  }

  private playTurnSfx(res: TurnResult): void {
    audio.lock();
    if (res.events.some((e) => e.type !== "weather")) audio.reaction();
    if (res.linesCleared > 0) audio.clear(res.linesCleared);
    if (res.ancientLife) audio.ancient();
  }

  private snapElements(): number[][] {
    return this.game.grid.cells.map((row) => row.map((c) => c.element));
  }

  private addFlashes(before: number[][]): void {
    const after = this.snapElements();
    const now = performance.now();
    for (let y = 0; y < after.length; y++)
      for (let x = 0; x < after[y].length; x++)
        if (before[y]?.[x] !== after[y][x])
          this.flashes.push({ x, y, t: now, destroy: after[y][x] === 0 });
  }

  private humanCommit(): void {
    this.lockPending = false;
    const before = this.snapElements();
    const scoreBefore = this.game.players.A.score;
    const res = this.game.commitTurn();
    this.addFlashes(before);
    const gained = this.game.players.A.score - scoreBefore;
    this.playTurnSfx(res);
    if (res.linesCleared > 0) this.pushLog(`A 消除 ${res.linesCleared} 行 +${gained}`);
    if (res.ancientLife) this.pushLog(`⚡A 召唤远古生命！清屏 +海量积分`);
    this.afterTurn();
  }

  private afterTurn(): void {
    if (this.game.gameOver) return this.showResult();
    // 若轮到 AI，延时自动落子
    if (this.game.current === "B") {
      this.busy = true;
      setTimeout(() => {
        if (this.game.gameOver) {
          this.busy = false;
          return this.showResult();
        }
        const before = this.snapElements();
        const scoreBefore = this.game.players.B.score;
        const res = aiPlayTurn(this.game, this.opts.difficulty);
        this.addFlashes(before);
        const gained = this.game.players.B.score - scoreBefore;
        this.playTurnSfx(res);
        if (res.linesCleared > 0) this.pushLog(`B(AI) 消除 ${res.linesCleared} 行 +${gained}`);
        if (res.ancientLife) this.pushLog(`⚡B 召唤远古生命！`);
        this.busy = false;
        if (this.game.gameOver) this.showResult();
      }, 700);
    }
  }

  private pushLog(s: string): void {
    this.log.unshift(s);
    this.log = this.log.slice(0, 6);
    const el = document.getElementById("battle-log");
    if (el) el.innerHTML = this.log.map((l) => `<div>${l}</div>`).join("");
  }

  private showResult(): void {
    if (this.resultShown) return;
    this.resultShown = true;
    if (this.matchTimer) clearInterval(this.matchTimer);
    const a = this.game.players.A.score;
    const b = this.game.players.B.score;
    let title = "平局";
    const win = this.game.winner === "A" || (this.game.winner === null && a > b);
    if (win) title = "🏆 你赢了！";
    else if (this.game.winner === "B" || b > a) title = "AI 获胜";
    audio.gameOver(win);
    const overlay = document.createElement("div");
    overlay.className = "result-overlay";
    overlay.innerHTML = `<div class="result-card">
      <h2>${title}</h2>
      <p>你 ${a} : ${b} AI</p>
      <button id="r-again">再来一局</button>
      <button id="r-exit">返回大厅</button>
    </div>`;
    this.root.append(overlay);
    document.getElementById("r-again")!.onclick = () => {
      overlay.remove();
      this.game = new Game({
        mode: this.opts.mode,
        aiPlayer: "B",
        customBagA: this.opts.playerBag,
        customBagB: this.opts.aiBag,
      });
      this.busy = false;
      this.log = [];
      this.resultShown = false;
      if (this.opts.mode === "time-attack") this.startMatchTimer();
    };
    document.getElementById("r-exit")!.onclick = () => {
      cancelAnimationFrame(this.raf);
      this.opts.onExit();
    };
  }

  private loop = (): void => {
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private render(): void {
    const opts: DrawOpts = { ox: 0, oy: 0, cell: this.cell };
    drawGrid(this.ctx, this.game.grid, opts);
    // ghost + active
    if (this.game.active && this.game.current === "A") {
      if (settings.ghost) drawPieceCells(this.ctx, this.game.ghostCells(), opts, 0.18);
      const abs = this.game.active.cells.map((c) => ({
        x: this.game.active!.px + c.x,
        y: this.game.active!.py + c.y,
        element: c.element,
      }));
      drawPieceCells(this.ctx, abs, opts, 1);
    } else if (this.game.active) {
      const abs = this.game.active.cells.map((c) => ({
        x: this.game.active!.px + c.x,
        y: this.game.active!.py + c.y,
        element: c.element,
      }));
      drawPieceCells(this.ctx, abs, opts, 0.85);
    }
    this.renderPanels();
    this.renderWeather();
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
    for (const id of ["A", "B"] as const) {
      const el = document.getElementById(`panel-${id}`)!;
      const p = this.game.players[id];
      const active = this.game.current === id;
      const next = this.game.peekNext(id);
      el.className = `ppanel ${active ? "active" : ""} side-${id}`;
      el.innerHTML = `
        <div class="p-id">
          <span class="pavatar">${id === "A" ? "🧑" : "🤖"}</span>
          <span class="pname">${id === "A" ? "你" : "AI"}${active ? " <span class='turn-dot'>●</span>" : ""}</span>
        </div>
        <div class="p-score-wrap"><div class="pscore">${p.score}</div><div class="plabel">分</div></div>
        <div class="p-next"><div class="next-box">${miniPiece(next)}</div><div class="plabel">Next</div></div>`;
    }
  }

  private renderWeather(): void {
    const w = this.game.weather;
    const el = document.getElementById("weather-station")!;
    el.innerHTML = `
      <div class="w-now">${WEATHER_ICON[w.current]} <b>${WEATHER_NAMES[w.current]}</b>
        <span class="w-turns">${w.turnsUntilSwitch} 回合后变天</span></div>
      <div class="w-desc">${WEATHER_DESC[w.current]}</div>
      <div class="w-forecast">预报: ${WEATHER_ICON[w.nextForecast]} ${WEATHER_NAMES[w.nextForecast]} <span class="w-warn">(可能不准)</span></div>`;
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    if (this.fallTimer) clearInterval(this.fallTimer);
    if (this.matchTimer) clearInterval(this.matchTimer);
    if (this._keyHandler) window.removeEventListener("keydown", this._keyHandler);
  }
}

function modeName(m: GameMode): string {
  return m === "shared-turn" ? "同屏回合制" : m === "survival" ? "生存竞技" : "限时狂欢";
}

function miniPiece(p: PieceDef): string {
  // 用 4x4 的小色块 HTML 表示 Next
  const grid: string[] = [];
  const map = new Map<string, number>();
  for (const c of p.cells) map.set(`${c.x},${c.y}`, c.element);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const el = map.get(`${x},${y}`);
      const color = el ? ELEMENT_COLORS[el as keyof typeof ELEMENT_COLORS] : "transparent";
      grid.push(
        `<i style="background:${color}" title="${el ? ELEMENT_NAMES[el as keyof typeof ELEMENT_NAMES] : ""}"></i>`,
      );
    }
  return `<div class="mini4">${grid.join("")}</div>`;
}
