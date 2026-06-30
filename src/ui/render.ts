import { Grid } from "../core/grid";
import { Cell, Element, isEmpty } from "../core/types";
import { ELEMENT_COLORS, lighten } from "./colors";
import { elementImages, imgReady } from "./elementsArt";

export interface DrawOpts {
  ox: number;
  oy: number;
  cell: number;
}

function shade(hex: string, amt: number): string {
  if (amt >= 0) return lighten(hex, amt);
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  const f = 1 + amt;
  r = Math.round(r * f);
  g = Math.round(g * f);
  b = Math.round(b * f);
  return `rgb(${r},${g},${b})`;
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

// ===== 元素极简线性图标（居中绘制于 s×s 区域）=====
function drawIcon(
  ctx: CanvasRenderingContext2D,
  el: Element,
  x: number,
  y: number,
  s: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(x + s / 2, y + s / 2);
  const u = s * 0.5;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s * 0.07;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  switch (el) {
    case Element.Fire:
      ctx.beginPath();
      ctx.moveTo(0, -u * 0.55);
      ctx.quadraticCurveTo(u * 0.5, 0, 0, u * 0.55);
      ctx.quadraticCurveTo(-u * 0.5, 0, 0, -u * 0.55);
      ctx.fill();
      break;
    case Element.Water:
      ctx.beginPath();
      ctx.moveTo(0, -u * 0.6);
      ctx.quadraticCurveTo(u * 0.55, u * 0.1, 0, u * 0.55);
      ctx.quadraticCurveTo(-u * 0.55, u * 0.1, 0, -u * 0.6);
      ctx.fill();
      break;
    case Element.Wood:
      ctx.beginPath();
      ctx.moveTo(0, u * 0.55);
      ctx.lineTo(0, -u * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(u * 0.18, -u * 0.35, u * 0.28, u * 0.45, Math.PI / 5, 0, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-u * 0.18, -u * 0.35, u * 0.28, u * 0.45, -Math.PI / 5, 0, 7);
      ctx.fill();
      break;
    case Element.Metal:
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const px = Math.cos(a) * u * 0.6;
        const py = Math.sin(a) * u * 0.6;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, u * 0.18, 0, 7);
      ctx.stroke();
      break;
    case Element.Ice:
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((Math.PI / 3) * i);
        ctx.beginPath();
        ctx.moveTo(0, -u * 0.6);
        ctx.lineTo(0, u * 0.6);
        ctx.stroke();
        ctx.restore();
      }
      break;
    case Element.Sticky:
      ctx.beginPath();
      ctx.arc(-u * 0.2, -u * 0.05, u * 0.3, 0, 7);
      ctx.arc(u * 0.22, u * 0.12, u * 0.24, 0, 7);
      ctx.fill();
      break;
    case Element.Life:
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (Math.PI / 5) * k - Math.PI / 2;
        const rad = k % 2 ? u * 0.25 : u * 0.62;
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    case Element.Earth:
      ctx.lineWidth = s * 0.05;
      for (const gy of [-u * 0.3, u * 0.1]) {
        ctx.beginPath();
        ctx.moveTo(-u * 0.6, gy);
        ctx.lineTo(u * 0.6, gy);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, -u * 0.6);
      ctx.lineTo(0, -u * 0.3);
      ctx.moveTo(-u * 0.3, -u * 0.3);
      ctx.lineTo(-u * 0.3, u * 0.1);
      ctx.moveTo(u * 0.3, -u * 0.3);
      ctx.lineTo(u * 0.3, u * 0.1);
      ctx.stroke();
      break;
    default:
      break;
  }
  ctx.restore();
}

export function drawCellBlock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  cell: Cell,
  alpha = 1,
): void {
  if (cell.element === Element.Empty) return;
  const base = ELEMENT_COLORS[cell.element];
  ctx.globalAlpha = alpha;
  const r = Math.max(2, size * 0.2);

  const sprite = elementImages[cell.element];
  if (imgReady(sprite)) {
    // 手绘贴图（圆角裁剪）
    ctx.save();
    roundRect(ctx, cx + 0.5, cy + 0.5, size - 1, size - 1, r);
    ctx.clip();
    ctx.drawImage(sprite as CanvasImageSource, cx + 0.5, cy + 0.5, size - 1, size - 1);
    ctx.restore();
  } else {
    // 贴图未就绪时的程序化兜底（宝石底 + 图标）
    const g = ctx.createLinearGradient(cx, cy, cx, cy + size);
    g.addColorStop(0, shade(base, 0.32));
    g.addColorStop(0.5, base);
    g.addColorStop(1, shade(base, -0.24));
    ctx.fillStyle = g;
    roundRect(ctx, cx + 1.5, cy + 1.5, size - 3, size - 3, r);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    roundRect(ctx, cx + size * 0.16, cy + size * 0.1, size * 0.68, size * 0.2, size * 0.1);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 1;
    roundRect(ctx, cx + 1.5, cy + 1.5, size - 3, size - 3, r);
    ctx.stroke();
    drawIcon(ctx, cell.element, cx + size * 0.2, cy + size * 0.2, size * 0.6, "rgba(255,255,255,0.92)");
  }

  // 带电描边
  if (cell.charged) {
    ctx.strokeStyle = "#fff45a";
    ctx.lineWidth = 2;
    roundRect(ctx, cx + 2.5, cy + 2.5, size - 5, size - 5, r * 0.8);
    ctx.stroke();
  }

  // 反应倒计时
  if (cell.timer > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.beginPath();
    ctx.arc(cx + size / 2, cy + size / 2, size * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.floor(size * 0.4)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(cell.timer), cx + size / 2, cy + size / 2 + 1);
  }
  ctx.globalAlpha = 1;
}

function drawLifeReadyGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const now = typeof performance === "undefined" ? Date.now() : performance.now();
  const pulse = (Math.sin(now / 180) + 1) / 2;
  const inset = 1.5 + pulse * 2;
  const r = Math.max(3, size * 0.24);
  ctx.save();
  ctx.globalAlpha = 0.62 + pulse * 0.28;
  ctx.strokeStyle = "#eaff7a";
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.shadowColor = "#d7ff57";
  ctx.shadowBlur = size * (0.42 + pulse * 0.38);
  roundRect(ctx, cx + inset, cy + inset, size - inset * 2, size - inset * 2, r);
  ctx.stroke();
  ctx.globalAlpha = 0.28 + pulse * 0.18;
  ctx.fillStyle = "#f6ff9a";
  roundRect(ctx, cx + size * 0.18, cy + size * 0.14, size * 0.64, size * 0.16, size * 0.08);
  ctx.fill();
  ctx.restore();
}

export function drawGrid(ctx: CanvasRenderingContext2D, grid: Grid, opts: DrawOpts): void {
  const { ox, oy, cell } = opts;
  const lifeReady = grid.countElement(Element.Life) >= 5;
  ctx.fillStyle = "#0c0e14";
  ctx.fillRect(ox, oy, grid.w * cell, grid.h * cell);
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
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
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const c = grid.get(x, y);
      if (!isEmpty(c)) {
        const cx = ox + x * cell;
        const cy = oy + y * cell;
        drawCellBlock(ctx, cx, cy, cell, c);
        if (lifeReady && c.element === Element.Life) drawLifeReadyGlow(ctx, cx, cy, cell);
      }
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
