import { Game } from "../core/engine";
import { Element } from "../core/types";
import { drawGrid, drawPieceCells, DrawOpts } from "./render";
import { settings } from "./settings";
import { audio } from "./audio";
import { TutorialLevel, LEVELS } from "./tutorialLevels";
import { markTutorialLevelComplete } from "./tutorialSelect";

export class TutorialRun {
  private game: Game;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private cell = 26;
  private raf = 0;
  private fallTimer?: ReturnType<typeof setInterval>;
  private lockPending = false;
  private done = false;
  private flashes: { x: number; y: number; t: number; destroy: boolean }[] = [];
  private touch = { active: false, sx: 0, sy: 0, lx: 0, ly: 0, startPx: 0, lock: "" as "" | "h" | "v", t0: 0 };
  private keyHandler?: (e: KeyboardEvent) => void;

  constructor(
    private root: HTMLElement,
    private level: TutorialLevel,
    private opts: { onExit: () => void; onNext: (level: TutorialLevel) => void },
  ) {
    this.game = new Game({ solo: true, script: level.script, seed: 1 });
    for (const c of level.initial) this.game.grid.setElement(c.x, c.y, c.element);
    this.build();
    this.bindKeys();
    this.loop();
    this.fallTimer = setInterval(() => this.fallTick(), settings.fallMs);
    audio.syncBgm();
    this.showIntro();
  }

  private build(): void {
    this.root.innerHTML = `
      <div class="battle-wrap tutorial-run">
        <div class="battle-top">
          <button class="btn-exit" id="tr-exit">‹ 关卡</button>
          <div class="tutorial-goal" id="tr-goal">${this.level.goalText}</div>
          <div class="mode-badge">教学</div>
        </div>
        <div class="tutorial-level-title">${this.level.title}</div>
        <div class="battle-mid"><div class="board-col"><canvas id="tutorial-canvas"></canvas></div></div>
        <div class="gesture-hint">拖动棋子左右移动 · 轻点旋转 · 向下滑落子</div>
        <div class="battle-ctrl">
          <button class="ctrl-btn" data-act="left">◀</button>
          <button class="ctrl-btn" data-act="rotate">⟳</button>
          <button class="ctrl-btn" data-act="right">▶</button>
          <button class="ctrl-btn drop" data-act="drop">落子 ⤓</button>
        </div>
      </div>`;

    const avail = Math.min(window.innerWidth, 460) - 24;
    this.cell = Math.max(18, Math.min(34, Math.floor(avail / this.game.grid.w)));
    this.canvas = document.getElementById("tutorial-canvas") as HTMLCanvasElement;
    const cssW = this.game.grid.w * this.cell;
    const cssH = this.game.grid.h * this.cell;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = cssW + "px";
    this.canvas.style.height = cssH + "px";
    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.scale(dpr, dpr);
    this.bindTouch();

    (document.getElementById("tr-exit") as HTMLElement).onclick = () => {
      this.destroy();
      this.opts.onExit();
    };
    this.root.querySelectorAll(".ctrl-btn").forEach((b) => {
      (b as HTMLElement).onclick = () => this.act((b as HTMLElement).dataset.act!);
    });
  }

  private showIntro(): void {
    const overlay = document.createElement("div");
    overlay.className = "tut-overlay";
    overlay.innerHTML = `
      <div class="tut-card">
        <div class="tut-icon">🎓</div>
        <h2 class="tut-title">${this.level.title}</h2>
        <p class="tut-body">${this.level.intro}</p>
        <div class="tut-btns"><button class="tut-next" id="tr-intro-ok">知道了</button></div>
      </div>`;
    this.root.append(overlay);
    (overlay.querySelector("#tr-intro-ok") as HTMLElement).onclick = () => overlay.remove();
  }

  private bindTouch(): void {
    this.canvas.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener("touchend", (e) => this.onTouchEnd(e), { passive: false });
  }

  private canDrive(): boolean {
    return !this.done && !this.game.gameOver && this.game.current === "A" && !!this.game.active;
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
      this.commit();
    } else if (!this.touch.lock && dt < 300) {
      if (this.game.rotate()) audio.rotate();
    }
  }

  private bindKeys(): void {
    this.keyHandler = (e: KeyboardEvent) => {
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
    window.addEventListener("keydown", this.keyHandler);
  }

  private act(act: string): void {
    if (!this.canDrive()) return;
    audio.resume();
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
        this.commit();
        break;
    }
  }

  private fallTick(): void {
    if (!this.canDrive()) return;
    const moved = this.game.step();
    if (!moved) {
      if (this.lockPending) {
        this.lockPending = false;
        this.commit();
      } else {
        this.lockPending = true;
      }
    } else {
      this.lockPending = false;
    }
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
          this.flashes.push({ x, y, t: now, destroy: after[y][x] === Element.Empty });
  }

  private commit(): void {
    this.lockPending = false;
    const before = this.snapElements();
    const res = this.game.commitTurn();
    this.addFlashes(before);
    audio.lock();
    if (res.events.some((e) => e.type !== "weather")) audio.reaction();
    if (res.linesCleared > 0) audio.clear(res.linesCleared);
    if (this.level.goal(this.game, res)) this.showSuccess();
  }

  private showSuccess(): void {
    if (this.done) return;
    this.done = true;
    markTutorialLevelComplete(this.level.id);
    const next = LEVELS.find((level) => level.id === this.level.id + 1);
    const overlay = document.createElement("div");
    overlay.className = "result-overlay";
    overlay.innerHTML = `
      <div class="result-card">
        <h2>完成！</h2>
        <p>${this.level.successText}</p>
        ${next ? `<button id="tr-next">下一关</button>` : `<button id="tr-next">完成</button>`}
        <button id="tr-back">返回</button>
      </div>`;
    this.root.append(overlay);
    (overlay.querySelector("#tr-next") as HTMLElement).onclick = () => {
      this.destroy();
      if (next) this.opts.onNext(next);
      else this.opts.onExit();
    };
    (overlay.querySelector("#tr-back") as HTMLElement).onclick = () => {
      this.destroy();
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
    if (this.game.active) {
      if (settings.ghost) drawPieceCells(this.ctx, this.game.ghostCells(), opts, 0.18);
      const abs = this.game.active.cells.map((c) => ({
        x: this.game.active!.px + c.x,
        y: this.game.active!.py + c.y,
        element: c.element,
      }));
      drawPieceCells(this.ctx, abs, opts, 1);
    }
    this.drawFlashes();
  }

  private drawFlashes(): void {
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

  destroy(): void {
    cancelAnimationFrame(this.raf);
    if (this.fallTimer) clearInterval(this.fallTimer);
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
  }
}
