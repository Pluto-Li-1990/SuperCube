// ===== SuperCube 核心类型定义 =====
// 沿用原 Unity 工程的元素枚举语义

export enum Element {
  Empty = 0, // 空格
  Earth = 1, // 砖土：惰性基石
  Fire = 2, // 火焰
  Water = 3, // 水
  Wood = 4, // 木
  Metal = 5, // 金属
  Ice = 6, // 冰
  Sticky = 7, // 粘粘
  Life = 8, // 生命
}

export const ELEMENT_NAMES: Record<Element, string> = {
  [Element.Empty]: "空",
  [Element.Earth]: "砖土",
  [Element.Fire]: "火焰",
  [Element.Water]: "水",
  [Element.Wood]: "木",
  [Element.Metal]: "金属",
  [Element.Ice]: "冰",
  [Element.Sticky]: "粘粘",
  [Element.Life]: "生命",
};

// 可在棋子里使用的元素（不含 Empty）
export const PLAYABLE_ELEMENTS: Element[] = [
  Element.Earth,
  Element.Fire,
  Element.Water,
  Element.Wood,
  Element.Metal,
  Element.Ice,
  Element.Sticky,
  Element.Life,
];

// 棋盘上的单个格子
export interface Cell {
  element: Element;
  // 化学反应倒计时；-1 表示无计时
  timer: number;
  // 计时结束后要变成的元素（willDestroy 为 true 时忽略）
  transformTo: Element | null;
  // 计时结束后是否销毁（湮灭）
  willDestroy: boolean;
  // 带电标记（雷暴 / 水+金属判定用）
  charged: boolean;
  // 哪个玩家放下的这一格（用于截胡判定的着色，可选）
  owner: PlayerId | null;
}

export type PlayerId = "A" | "B";

export function emptyCell(): Cell {
  return {
    element: Element.Empty,
    timer: -1,
    transformTo: null,
    willDestroy: false,
    charged: false,
    owner: null,
  };
}

export function makeCell(element: Element, owner: PlayerId | null = null): Cell {
  const c = emptyCell();
  c.element = element;
  c.owner = owner;
  return c;
}

export function isEmpty(c: Cell): boolean {
  return c.element === Element.Empty;
}

// ===== 棋子定义 =====
// 棋子是 4x4 网格内的一组相对坐标 + 每格元素

export interface PieceCellDef {
  x: number; // 0..3
  y: number; // 0..3
  element: Element;
}

export interface PieceDef {
  id: string;
  name: string;
  cells: PieceCellDef[];
  // 是否为玩家自定义棋子
  custom: boolean;
}

// ===== 天气 =====
export enum Weather {
  Sunny = "sunny", // 晴天
  Rain = "rain", // 雨天
  Snow = "snow", // 雪天
  Thunder = "thunder", // 雷暴
  Volcano = "volcano", // 火山
}

export const WEATHER_NAMES: Record<Weather, string> = {
  [Weather.Sunny]: "晴天",
  [Weather.Rain]: "雨天",
  [Weather.Snow]: "雪天",
  [Weather.Thunder]: "雷暴",
  [Weather.Volcano]: "火山",
};

export const WEATHER_DESC: Record<Weather, string> = {
  [Weather.Sunny]: "水+木催生翻倍（顶起 2 格）",
  [Weather.Rain]: "1 回合后全场熄火",
  [Weather.Snow]: "1 回合后水变冰；新水直接成冰",
  [Weather.Thunder]: "金属全部带电（引信 & 生命杀手）",
  [Weather.Volcano]: "1 回合后洗盘：木变火/生命变砖/冰变水/水蒸发",
};
