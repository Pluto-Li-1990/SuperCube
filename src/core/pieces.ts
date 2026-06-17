import { Element, PieceCellDef, PieceDef } from "./types";

// ===== 7 个传统俄罗斯方块 (4x4 坐标系，默认元素=砖土) =====
// 坐标 (x,y)，y 向下。形状取常见 SRS 朝向。

function p(coords: [number, number][], el: Element = Element.Earth): PieceCellDef[] {
  return coords.map(([x, y]) => ({ x, y, element: el }));
}

export const STANDARD_PIECES: PieceDef[] = [
  { id: "I", name: "I", custom: false, cells: p([[0, 1], [1, 1], [2, 1], [3, 1]]) },
  { id: "O", name: "O", custom: false, cells: p([[1, 0], [2, 0], [1, 1], [2, 1]]) },
  { id: "T", name: "T", custom: false, cells: p([[1, 0], [0, 1], [1, 1], [2, 1]]) },
  { id: "S", name: "S", custom: false, cells: p([[1, 0], [2, 0], [0, 1], [1, 1]]) },
  { id: "Z", name: "Z", custom: false, cells: p([[0, 0], [1, 0], [1, 1], [2, 1]]) },
  { id: "J", name: "J", custom: false, cells: p([[0, 0], [0, 1], [1, 1], [2, 1]]) },
  { id: "L", name: "L", custom: false, cells: p([[2, 0], [0, 1], [1, 1], [2, 1]]) },
];

// ===== 自定义棋子校验 (源力工坊核心规则) =====
// 规则：4x4 画布内，最多 4 个方块，每个方块之间至少一个"角相连"（含对角线）。
// 即所有方块构成一个 8-连通(king-move)的连通图。
// 另外：每个棋子最多 1 个生命方块。

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateCustomPiece(cells: PieceCellDef[]): ValidationResult {
  if (cells.length === 0) return { ok: false, reason: "至少放置 1 个方块" };
  if (cells.length > 4) return { ok: false, reason: "最多 4 个方块" };

  // 边界检查 0..3
  for (const c of cells) {
    if (c.x < 0 || c.x > 3 || c.y < 0 || c.y > 3)
      return { ok: false, reason: "必须在 4x4 画布内" };
  }

  // 重复检查
  const seen = new Set<string>();
  for (const c of cells) {
    const k = `${c.x},${c.y}`;
    if (seen.has(k)) return { ok: false, reason: "方块位置重复" };
    seen.add(k);
  }

  // 生命方块上限 1
  const lifeCount = cells.filter((c) => c.element === Element.Life).length;
  if (lifeCount > 1) return { ok: false, reason: "每个棋子最多 1 个生命方块" };

  // 8-连通校验
  if (!isKingConnected(cells))
    return { ok: false, reason: "每个方块之间必须至少一个角相连" };

  return { ok: true };
}

// king-move (8 方向) 连通性
export function isKingConnected(cells: PieceCellDef[]): boolean {
  if (cells.length <= 1) return true;
  const key = (x: number, y: number) => `${x},${y}`;
  const present = new Set(cells.map((c) => key(c.x, c.y)));
  const visited = new Set<string>();
  const start = cells[0];
  const stack: [number, number][] = [[start.x, start.y]];
  visited.add(key(start.x, start.y));
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        const k = key(nx, ny);
        if (present.has(k) && !visited.has(k)) {
          visited.add(k);
          stack.push([nx, ny]);
        }
      }
    }
  }
  return visited.size === cells.length;
}

// 将棋子归一化到左上角 (最小 x,y 移到 0)，便于落子计算
export function normalizePiece(cells: PieceCellDef[]): PieceCellDef[] {
  if (cells.length === 0) return [];
  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  return cells.map((c) => ({ x: c.x - minX, y: c.y - minY, element: c.element }));
}

// 旋转 (顺时针 90°)；在 4x4 内旋转
export function rotateCells(cells: PieceCellDef[]): PieceCellDef[] {
  // 以 4x4 中心旋转：newX = 3 - y, newY = x  （之后再归一化）
  const rotated = cells.map((c) => ({ x: 3 - c.y, y: c.x, element: c.element }));
  return normalizePiece(rotated);
}

let customCounter = 0;
export function makeCustomPiece(name: string, cells: PieceCellDef[]): PieceDef {
  return {
    id: `custom_${++customCounter}`,
    name: name || `自定义${customCounter}`,
    custom: true,
    cells: normalizePiece(cells),
  };
}

// 棋子的包围盒宽高
export function pieceBounds(cells: PieceCellDef[]): { w: number; h: number } {
  if (cells.length === 0) return { w: 0, h: 0 };
  const maxX = Math.max(...cells.map((c) => c.x));
  const maxY = Math.max(...cells.map((c) => c.y));
  return { w: maxX + 1, h: maxY + 1 };
}
