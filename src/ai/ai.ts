import { Game, ActivePiece } from "../core/engine";
import { Grid } from "../core/grid";
import { isEmpty } from "../core/types";
import { rotateCells, normalizePiece, pieceBounds } from "../core/pieces";
import { baseLineScore } from "../core/scoring";

export interface AIMove {
  rotation: number; // 旋转次数 0..3
  px: number; // 目标列锚点
}

export type AIDifficulty = "easy" | "normal" | "hard";

const WEIGHTS = {
  easy: { lines: 4, height: -0.3, holes: -0.4, bumpiness: -0.1, noise: 1.2 },
  normal: { lines: 8, height: -0.51, holes: -0.9, bumpiness: -0.18, noise: 0.4 },
  hard: { lines: 12, height: -0.66, holes: -1.4, bumpiness: -0.28, noise: 0.0 },
};

// 评估一个棋盘状态（越大越好）
function evaluate(g: Grid, linesCleared: number, w: typeof WEIGHTS.normal): number {
  const heights = colHeights(g);
  const aggHeight = heights.reduce((a, b) => a + b, 0);
  const holes = countHoles(g, heights);
  let bump = 0;
  for (let i = 0; i < heights.length - 1; i++) bump += Math.abs(heights[i] - heights[i + 1]);
  // 抢分导向：消除行直接给高权重（指数级与 GDD 一致）
  const lineScore = linesCleared > 0 ? baseLineScore(linesCleared) * w.lines : 0;
  return lineScore + w.height * aggHeight + w.holes * holes + w.bumpiness * bump;
}

function colHeights(g: Grid): number[] {
  const h: number[] = [];
  for (let x = 0; x < g.w; x++) {
    let top = g.h;
    for (let y = 0; y < g.h; y++) {
      if (!isEmpty(g.get(x, y))) {
        top = y;
        break;
      }
    }
    h.push(g.h - top);
  }
  return h;
}

function countHoles(g: Grid, heights: number[]): number {
  let holes = 0;
  for (let x = 0; x < g.w; x++) {
    const surfaceY = g.h - heights[x];
    for (let y = surfaceY + 1; y < g.h; y++) {
      if (isEmpty(g.get(x, y))) holes++;
    }
  }
  return holes;
}

// 模拟把当前活动棋子放到 (rotation, px)，返回评估分（不可行则 -Infinity）
function simulate(game: Game, rotation: number, px: number, w: typeof WEIGHTS.normal): number {
  if (!game.active) return -Infinity;
  let cells = game.active.cells.map((c) => ({ ...c }));
  for (let r = 0; r < rotation; r++) cells = rotateCells(cells);
  cells = normalizePiece(cells);
  const { w: pw } = pieceBounds(cells);
  if (px < 0 || px + pw > game.grid.w) return -Infinity;

  // 下落到底
  const test: ActivePiece = { def: game.active.def, cells, px, py: 0 };
  if (game.collides(test, 0, 0)) return -Infinity;
  let dy = 0;
  while (!game.collides(test, 0, dy + 1)) dy++;

  // 落盘到克隆棋盘
  const g = game.grid.clone();
  for (const c of cells) {
    const x = px + c.x;
    const y = dy + c.y;
    if (y >= 0 && y < g.h && x >= 0 && x < g.w) g.setElement(x, y, c.element);
  }
  // 计算可消除行数（不做完整反应模拟，AI 只看几何）
  const rows = g.fullRows();
  if (rows.length) g.removeRows(rows);
  g.applyGravity();
  return evaluate(g, rows.length, w);
}

// 选出最佳落点
export function chooseMove(game: Game, difficulty: AIDifficulty = "normal"): AIMove {
  const w = WEIGHTS[difficulty];
  let best: AIMove = { rotation: 0, px: 0 };
  let bestScore = -Infinity;
  for (let rot = 0; rot < 4; rot++) {
    for (let px = 0; px < game.grid.w; px++) {
      let s = simulate(game, rot, px, w);
      if (s === -Infinity) continue;
      if (w.noise) s += (Math.random() - 0.5) * w.noise * 10;
      if (s > bestScore) {
        bestScore = s;
        best = { rotation: rot, px };
      }
    }
  }
  return best;
}

// 让 AI 执行一整个回合（应用旋转/平移后硬降结算）
export function aiPlayTurn(game: Game, difficulty: AIDifficulty = "normal") {
  const mv = chooseMove(game, difficulty);
  for (let r = 0; r < mv.rotation; r++) game.rotate();
  if (game.active) {
    const cur = game.active.px;
    const delta = mv.px - cur;
    const dir = delta > 0 ? 1 : -1;
    for (let i = 0; i < Math.abs(delta); i++) if (!game.move(dir)) break;
  }
  return game.commitTurn();
}
