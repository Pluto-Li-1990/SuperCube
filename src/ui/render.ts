import { Grid } from "../core/grid";
import { Cell, Element, isEmpty } from "../core/types";
import { ELEMENT_COLORS, ELEMENT_GLYPH, lighten } from "./colors";

export interface DrawOpts {
  ox: number;
  oy: number;
  cell: number;
}

export function drawCellBlock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  cell: Cell,
  alpha = 1,
): void {
  const base = ELEMENT_COLORS[cell.element];
  ctx.globalAlpha = alpha;
  // 主体
  ctx.fillStyle = base;
  roundRect(ctx, cx + 1, cy + 1, size - 2, size - 2, Math.max(2, size * 0.12));
  ctx.fill();
  // 高光
  ctx.fillStyle = lighten(base, 0.35);
  roundRect(ctx, cx + 1, cy + 1, size - 2, (size - 2) * 0.32, Math.max(2, size * 0.12));
  ctx.fill();
  // 带电描边
  if (cell.charged) {
    ctx.strokeStyle = "#fff45a";
    ctx.lineWidth = 2;
    roundRect(ctx, cx + 2, cy + 2, size - 4, size - 4, Math.max(2, size * 0.1));
    ctx.stroke();
  }
  // 反应倒计时数字
  if (cell.timer > 0) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.arc(cx + size / 2, cy + size / 2, size * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.floor(size * 0.42)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(cell.timer), cx + size / 2, cy + size / 2 + 1);
  } else {
    // 元素字形
    const glyph = ELEMENT_GLYPH[cell.element];
    if (glyph && size >= 18) {
      ctx.globalAlpha = 0.9;
      ctx.font = `${Math.floor(size * 0.5)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(glyph, cx + size / 2, cy + size / 2 + 1);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawGrid(ctx: CanvasRenderingContext2D, grid: Grid, opts: DrawOpts): void {
  const { ox, oy, cell } = opts;
  // 背板
  ctx.fillStyle = "#0c0e14";
  ctx.fillRect(ox, oy, grid.w * cell, grid.h * cell);
  // 网格线
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= grid.w; x++) {
    ctx.beginPath();
    ctx.moveTo(ox + x * cell, oy);
    ctx.lineTo(ox + x * cell, oy + grid.h * cell);
    ctx.stroke();
  }
  for (let y = 0; y <= grid.h; y++) {
    ctx.beginPath();
    ctx.moveTo(ox, oy + y * cell);
    ctx.lineTo(ox + grid.w * cell, oy + y * cell);
    ctx.stroke();
  }
  // 方块
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const c = grid.get(x, y);
      if (!isEmpty(c)) drawCellBlock(ctx, ox + x * cell, oy + y * cell, cell, c);
    }
  }
}

export function drawPieceCells(
  ctx: CanvasRenderingContext2D,
  cells: { x: number; y: number; element: Element }[],
  opts: DrawOpts,
  alpha = 1,
): void {
  for (const c of cells) {
    if (c.y < 0) continue;
    drawCellBlock(
      ctx,
      opts.ox + c.x * opts.cell,
      opts.oy + c.y * opts.cell,
      opts.cell,
      { element: c.element, timer: -1, transformTo: null, willDestroy: false, charged: false, owner: null },
      alpha,
    );
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
