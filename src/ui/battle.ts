import { Game, GameMode } from "../core/engine";
import { PieceDef, WEATHER_NAMES, WEATHER_DESC, ELEMENT_NAMES } from "../core/types";
import { aiPlayTurn, AIDifficulty } from "../ai/ai";
import { drawGrid, drawPieceCells, DrawOpts } from "./render";
import { WEATHER_ICON, ELEMENT_COLORS } from "./colors";
import { ELEMENT_GLYPH } from "./colors";

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
      <div class="mode-badge">${modeName(this.opts.mode)}</div>`;
    wrap.append(top);

    // 中部：A 面板 | 棋盘 | B 面板
    const mid = document.createElement("div");
    mid.className = "battle-mid";
    mid.innerHTML = `
      <div class="ppanel" id="panel-A"></div>
      <div class="board-col">
        <canvas id="board-canvas"></canvas>
      </div>
      <div class="ppanel" id="panel-B"></div>`;
    wrap.append(mid);

    // 底部：触控按钮 + 日志
    const ctrl = document.createElement("div");
    ctrl.className = "battle-ctrl";
    ctrl.innerHTML = `
      <button class="ctrl-btn" data-act="left">◀</button>
      <button class="ctrl-btn" data-act="rotate">⟳</button>
      <button class="ctrl-btn" data-act="right">▶</button>
      <button class="ctrl-btn" data-act="down">▼</button>
      <button class="ctrl-btn drop" data-act="drop">落子 ⤓</button>`;
    wrap.append(ctrl);

    const logEl = document.createElement("div");
    logEl.className = "battle-log";
    logEl.id = "battle-log";
    wrap.append(logEl);

    this.root.append(wrap);

    this.canvas = document.getElementById("board-canvas") as HTMLCanvasElement;
    this.canvas.width = this.game.grid.w * this.cell;
    this.canvas.height = this.game.grid.h * this.cell;
    this.ctx = this.canvas.getContext("2d")!;

    document.getElementById("b-exit")!.onclick = () => {
      cancelAnimationFrame(this.raf);
      this.opts.onExit();
    };
    ctrl.querySelectorAll(".ctrl-btn").forEach((b) => {
      (b as HTMLElement).onclick = () => this.act((b as HTMLElement).dataset.act!);
    });
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
    if (this.game.current !== "A") return; // 仅人类回合可操作
    switch (act) {
      case "left":
        this.game.move(-1);
        break;
      case "right":
        this.game.move(1);
        break;
      case "rotate":
        this.game.rotate();
        break;
      case "down":
        this.game.step();
        break;
      case "drop":
        this.humanCommit();
        break;
    }
  }

  private humanCommit(): void {
    const before = this.game.players.A.score;
    const res = this.game.commitTurn();
    const gained = this.game.players.A.score - before;
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
        const before = this.game.players.B.score;
        const res = aiPlayTurn(this.game, this.opts.difficulty);
        const gained = this.game.players.B.score - before;
        if (res.linesCleared > 0) this.pushLog(`B(AI) 消除 ${res.linesCleared} 行 +${gained}`);
        if (res.ancientLife) this.pushLog(`⚡B 召唤远古生命！`);
        this.busy = false;
        if (this.game.gameOver) this.showResult();
      }, 450);
    }
  }

  private pushLog(s: string): void {
    this.log.unshift(s);
    this.log = this.log.slice(0, 6);
    const el = document.getElementById("battle-log");
    if (el) el.innerHTML = this.log.map((l) => `<div>${l}</div>`).join("");
  }

  private showResult(): void {
    const a = this.game.players.A.score;
    const b = this.game.players.B.score;
    let title = "平局";
    if (this.game.winner === "A" || a > b) title = "🏆 你赢了！";
    else if (this.game.winner === "B" || b > a) title = "AI 获胜";
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
      drawPieceCells(this.ctx, this.game.ghostCells(), opts, 0.18);
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
  }

  private renderPanels(): void {
    for (const id of ["A", "B"] as const) {
      const el = document.getElementById(`panel-${id}`)!;
      const p = this.game.players[id];
      const active = this.game.current === id;
      const next = this.game.peekNext(id);
      el.className = `ppanel ${active ? "active" : ""} side-${id}`;
      el.innerHTML = `
        <div class="pavatar">${id === "A" ? "🧑" : "🤖"}</div>
        <div class="pname">${id === "A" ? "你" : "AI"} ${active ? "<span class='turn-dot'>●</span>" : ""}</div>
        <div class="pscore">${p.score}</div>
        <div class="plabel">分数</div>
        <div class="next-box">${miniPiece(next)}</div>
        <div class="plabel">Next</div>`;
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
      const g = el ? ELEMENT_GLYPH[el as keyof typeof ELEMENT_GLYPH] : "";
      grid.push(
        `<i style="background:${color}" title="${el ? ELEMENT_NAMES[el as keyof typeof ELEMENT_NAMES] : ""}">${g}</i>`,
      );
    }
  return `<div class="mini4">${grid.join("")}</div>`;
}
