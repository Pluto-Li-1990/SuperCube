import { Grid } from "../core/grid";
import { Cell, Element, isEmpty } from "../core/types";
import { ELEMENT_COLORS, lighten } from "./colors";

export interface DrawOpts {
  ox: number;
  oy: number;
  cell: number;
}

function shade(hex: string, amt: number): string {
  // amt<0 变暗，amt>0 变亮
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

// ===== 每种元素的程序化纹理 =====
function drawTexture(
  ctx: CanvasRenderingContext2D,
  el: Element,
  x: number,
  y: number,
  s: number,
): void {
  const base = ELEMENT_COLORS[el];
  ctx.save();
  // 用圆角裁剪，纹理不溢出
  roundRect(ctx, x + 1, y + 1, s - 2, s - 2, Math.max(2, s * 0.16));
  ctx.clip();
  ctx.lineWidth = Math.max(1, s * 0.05);

  switch (el) {
    case Element.Earth: {
      // 砖墙：错缝砖块
      ctx.strokeStyle = shade(base, -0.28);
      const bh = s / 2;
      ctx.beginPath();
      // 中间横缝
      ctx.moveTo(x, y + bh);
      ctx.lineTo(x + s, y + bh);
      // 上排竖缝（居中）
      ctx.moveTo(x + s * 0.5, y);
      ctx.lineTo(x + s * 0.5, y + bh);
      // 下排竖缝（错半砖）
      ctx.moveTo(x + s * 0.25, y + bh);
      ctx.lineTo(x + s * 0.25, y + s);
      ctx.moveTo(x + s * 0.75, y + bh);
      ctx.lineTo(x + s * 0.75, y + s);
      ctx.stroke();
      break;
    }
    case Element.Fire: {
      // 火焰：上亮下暗渐变 + 舌焰
      const g = ctx.createLinearGradient(x, y + s, x, y);
      g.addColorStop(0, shade(base, -0.25));
      g.addColorStop(1, "#ffd24a");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = "rgba(255,90,40,0.85)";
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, y + s * 0.2);
      ctx.quadraticCurveTo(x + s * 0.78, y + s * 0.5, x + s * 0.5, y + s * 0.82);
      ctx.quadraticCurveTo(x + s * 0.22, y + s * 0.5, x + s * 0.5, y + s * 0.2);
      ctx.fill();
      break;
    }
    case Element.Water: {
      // 水：横向波纹
      ctx.strokeStyle = shade(base, 0.45);
      for (let i = 1; i <= 3; i++) {
        const wy = y + (s * i) / 4;
        ctx.beginPath();
        ctx.moveTo(x, wy);
        ctx.quadraticCurveTo(x + s * 0.25, wy - s * 0.1, x + s * 0.5, wy);
        ctx.quadraticCurveTo(x + s * 0.75, wy + s * 0.1, x + s, wy);
        ctx.stroke();
      }
      break;
    }
    case Element.Wood: {
      // 木：竖向纹理 + 节疤
      ctx.strokeStyle = shade(base, -0.3);
      for (let i = 1; i <= 3; i++) {
        const wx = x + (s * i) / 4;
        ctx.beginPath();
        ctx.moveTo(wx, y);
        ctx.lineTo(wx, y + s);
        ctx.stroke();
      }
      ctx.fillStyle = shade(base, -0.35);
      ctx.beginPath();
      ctx.ellipse(x + s * 0.5, y + s * 0.5, s * 0.12, s * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case Element.Metal: {
      // 金属：对角高光 + 四角铆钉
      const g = ctx.createLinearGradient(x, y, x + s, y + s);
      g.addColorStop(0, shade(base, 0.4));
      g.addColorStop(0.5, base);
      g.addColorStop(1, shade(base, -0.3));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = shade(base, -0.4);
      const r = s * 0.08;
      for (const [rx, ry] of [
        [0.22, 0.22],
        [0.78, 0.22],
        [0.22, 0.78],
        [0.78, 0.78],
      ]) {
        ctx.beginPath();
        ctx.arc(x + s * rx, y + s * ry, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case Element.Ice: {
      // 冰：晶面三角 + 高光
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, y + s * 0.15);
      ctx.lineTo(x + s * 0.8, y + s * 0.55);
      ctx.lineTo(x + s * 0.5, y + s * 0.85);
      ctx.lineTo(x + s * 0.2, y + s * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.stroke();
      break;
    }
    case Element.Sticky: {
      // 粘粘：气泡点
      ctx.fillStyle = shade(base, 0.4);
      for (const [rx, ry, rr] of [
        [0.3, 0.32, 0.13],
        [0.68, 0.4, 0.1],
        [0.45, 0.68, 0.12],
      ]) {
        ctx.beginPath();
        ctx.arc(x + s * rx, y + s * ry, s * rr, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case Element.Life: {
      // 生命：四芒星符文 + 光晕
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const cx = x + s * 0.5,
        cy = y + s * 0.5;
      const o = s * 0.34,
        i = s * 0.12;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const ang = (Math.PI / 4) * k - Math.PI / 2;
        const rad = k % 2 === 0 ? o : i;
        const px = cx + Math.cos(ang) * rad;
        const py = cy + Math.sin(ang) * rad;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
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
  const base = ELEMENT_COLORS[cell.element];
  ctx.globalAlpha = alpha;

  // 主体底色
  ctx.fillStyle = base;
  roundRect(ctx, cx + 1, cy + 1, size - 2, size - 2, Math.max(2, size * 0.16));
  ctx.fill();

  // 元素纹理
  if (cell.element !== Element.Empty) drawTexture(ctx, cell.element, cx, cy, size);

  // 顶部高光 + 描边，统一立体感
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  roundRect(ctx, cx + 2, cy + 2, size - 4, (size - 4) * 0.28, Math.max(2, size * 0.14));
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  roundRect(ctx, cx + 1, cy + 1, size - 2, size - 2, Math.max(2, size * 0.16));
  ctx.stroke();

  // 带电描边
  if (cell.charged) {
    ctx.strokeStyle = "#fff45a";
    ctx.lineWidth = 2;
    roundRect(ctx, cx + 2, cy + 2, size - 4, size - 4, Math.max(2, size * 0.12));
    ctx.stroke();
  }

  // 反应倒计时
  if (cell.timer > 0) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
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

export function drawGrid(ctx: CanvasRenderingContext2D, grid: Grid, opts: DrawOpts): void {
  const { ox, oy, cell } = opts;
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
