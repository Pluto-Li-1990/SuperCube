import { Element, ELEMENT_NAMES, PLAYABLE_ELEMENTS, PieceCellDef, PieceDef } from "../core/types";
import { validateCustomPiece, makeCustomPiece, normalizePiece } from "../core/pieces";
import { ELEMENT_COLORS } from "./colors";
import { drawCellBlock } from "./render";

const MAX_SHELF = 9;

// 源力工坊：4x4 棋子设计器
export class Workshop {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  grid: (Element | null)[][]; // 4x4
  selected: Element = Element.Earth;
  shelf: PieceDef[] = [];
  onChange: () => void;
  cell = 70;

  constructor(root: HTMLElement, onChange: () => void) {
    this.root = root;
    this.onChange = onChange;
    this.grid = Array.from({ length: 4 }, () => Array(4).fill(null));
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.cell * 4;
    this.canvas.height = this.cell * 4;
    this.canvas.className = "ws-canvas";
    this.ctx = this.canvas.getContext("2d")!;
    this.build();
    this.draw();
  }

  private currentCells(): PieceCellDef[] {
    const cells: PieceCellDef[] = [];
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const el = this.grid[y][x];
        if (el !== null) cells.push({ x, y, element: el });
      }
    return cells;
  }

  private build(): void {
    this.root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "ws-wrap";

    // 左：画布
    const left = document.createElement("div");
    left.className = "ws-left";
    const title = document.createElement("h2");
    title.textContent = "源力工坊";
    const hint = document.createElement("p");
    hint.className = "ws-hint";
    hint.textContent = "4×4 画布 · 最多 4 块 · 每块至少一个角相连（可对角）";
    left.append(title, hint, this.canvas);

    const status = document.createElement("div");
    status.className = "ws-status";
    status.id = "ws-status";
    left.append(status);

    const btnRow = document.createElement("div");
    btnRow.className = "ws-btnrow";
    const clearBtn = btn("清空", () => {
      this.grid = Array.from({ length: 4 }, () => Array(4).fill(null));
      this.draw();
    });
    const castBtn = btn("⚒ 铸造入库", () => this.cast());
    castBtn.classList.add("primary");
    btnRow.append(clearBtn, castBtn);
    left.append(btnRow);

    // 右：调色盘
    const right = document.createElement("div");
    right.className = "ws-right";
    const palTitle = document.createElement("h3");
    palTitle.textContent = "元素调色盘";
    right.append(palTitle);
    const pal = document.createElement("div");
    pal.className = "ws-palette";
    for (const el of PLAYABLE_ELEMENTS) {
      const swatch = document.createElement("button");
      swatch.className = "ws-swatch";
      swatch.style.background = ELEMENT_COLORS[el];
      swatch.title = ELEMENT_NAMES[el];
      swatch.textContent = ELEMENT_NAMES[el][0];
      swatch.onclick = () => {
        this.selected = el;
        this.refreshSwatches(pal);
      };
      swatch.dataset.el = String(el);
      pal.append(swatch);
    }
    right.append(pal);

    // 陈列滚轴
    const shelfTitle = document.createElement("h3");
    shelfTitle.textContent = `陈列滚轴 (${this.shelf.length}/${MAX_SHELF})`;
    shelfTitle.id = "ws-shelf-title";
    right.append(shelfTitle);
    const shelfEl = document.createElement("div");
    shelfEl.className = "ws-shelf";
    shelfEl.id = "ws-shelf";
    right.append(shelfEl);

    wrap.append(left, right);
    this.root.append(wrap);
    this.refreshSwatches(pal);
    this.renderShelf();

    // 画布交互
    const handle = (ev: MouseEvent | Touch) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor(((ev.clientX - rect.left) / rect.width) * 4);
      const y = Math.floor(((ev.clientY - rect.top) / rect.height) * 4);
      if (x < 0 || x > 3 || y < 0 || y > 3) return;
      this.toggle(x, y);
    };
    this.canvas.addEventListener("mousedown", (e) => handle(e));
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      handle(e.touches[0]);
    });
  }

  private refreshSwatches(pal: HTMLElement): void {
    pal.querySelectorAll(".ws-swatch").forEach((s) => {
      const el = Number((s as HTMLElement).dataset.el);
      s.classList.toggle("sel", el === this.selected);
    });
  }

  private toggle(x: number, y: number): void {
    if (this.grid[y][x] === this.selected) {
      this.grid[y][x] = null;
    } else if (this.grid[y][x] !== null) {
      this.grid[y][x] = this.selected; // 换元素
    } else {
      this.grid[y][x] = this.selected;
    }
    this.draw();
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#0c0e14";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.cell, 0);
      ctx.lineTo(i * this.cell, 4 * this.cell);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * this.cell);
      ctx.lineTo(4 * this.cell, i * this.cell);
      ctx.stroke();
    }
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const el = this.grid[y][x];
        if (el !== null)
          drawCellBlock(ctx, x * this.cell, y * this.cell, this.cell, {
            element: el,
            timer: -1,
            transformTo: null,
            willDestroy: false,
            charged: false,
            owner: null,
          });
      }
    this.updateStatus();
  }

  private updateStatus(): void {
    const status = document.getElementById("ws-status");
    if (!status) return;
    const cells = this.currentCells();
    if (cells.length === 0) {
      status.textContent = "放置方块开始设计";
      status.className = "ws-status";
      return;
    }
    const r = validateCustomPiece(cells);
    if (r.ok) {
      status.textContent = `✓ 合法棋子（${cells.length} 块）`;
      status.className = "ws-status ok";
    } else {
      status.textContent = `✗ ${r.reason}`;
      status.className = "ws-status bad";
    }
  }

  private cast(): void {
    const cells = this.currentCells();
    const r = validateCustomPiece(cells);
    if (!r.ok) {
      alert("无法铸造：" + r.reason);
      return;
    }
    if (this.shelf.length >= MAX_SHELF) {
      alert("陈列滚轴已满（9 枚），请先删除再新建");
      return;
    }
    const piece = makeCustomPiece(`源力#${this.shelf.length + 1}`, normalizePiece(cells));
    this.shelf.push(piece);
    this.grid = Array.from({ length: 4 }, () => Array(4).fill(null));
    this.draw();
    this.renderShelf();
    this.onChange();
  }

  private renderShelf(): void {
    const shelfEl = document.getElementById("ws-shelf");
    const title = document.getElementById("ws-shelf-title");
    if (title) title.textContent = `陈列滚轴 (${this.shelf.length}/${MAX_SHELF})`;
    if (!shelfEl) return;
    shelfEl.innerHTML = "";
    this.shelf.forEach((p, i) => {
      const item = document.createElement("div");
      item.className = "ws-shelf-item";
      const mini = document.createElement("canvas");
      mini.width = 64;
      mini.height = 64;
      const mc = mini.getContext("2d")!;
      mc.fillStyle = "#0c0e14";
      mc.fillRect(0, 0, 64, 64);
      const cs = 14;
      for (const c of p.cells)
        drawCellBlock(mc, 4 + c.x * cs, 4 + c.y * cs, cs, {
          element: c.element,
          timer: -1,
          transformTo: null,
          willDestroy: false,
          charged: false,
          owner: null,
        });
      const del = document.createElement("button");
      del.className = "ws-del";
      del.textContent = "✕";
      del.onclick = () => {
        this.shelf.splice(i, 1);
        this.renderShelf();
        this.onChange();
      };
      const name = document.createElement("span");
      name.textContent = p.name;
      item.append(mini, name, del);
      shelfEl.append(item);
    });
  }

  getShelf(): PieceDef[] {
    return [...this.shelf];
  }
}

function btn(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "ws-btn";
  b.textContent = label;
  b.onclick = onClick;
  return b;
}
