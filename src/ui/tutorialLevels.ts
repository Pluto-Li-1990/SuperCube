import { Game, TurnResult } from "../core/engine";
import { PieceDef, Element } from "../core/types";

function tp(name: string, cells: [number, number, Element][]): PieceDef {
  return {
    id: "tut_" + name,
    name,
    custom: true,
    cells: cells.map(([x, y, element]) => ({ x, y, element })),
  };
}

export interface TutorialLevel {
  id: number;
  title: string;
  intro: string;
  goalText: string;
  successText: string;
  initial: { x: number; y: number; element: Element }[];
  script: PieceDef[];
  goal: (g: Game, last: TurnResult | null) => boolean;
}

export const LEVELS: TutorialLevel[] = [
  {
    id: 1,
    title: "第1关 · 落子与消除",
    intro: "拖动方块到缺口那一列，向下滑落子。填满一整行就会消除并得分。",
    goalText: "目标：消除 1 行得分",
    successText: "漂亮！填满整行即可消除得分。",
    // 底行 x0..7 预置砖土，留 x8、x9 缺口
    initial: Array.from({ length: 8 }, (_, x) => ({ x, y: 19, element: Element.Earth })),
    script: [tp("O", [[0, 0, Element.Earth], [1, 0, Element.Earth], [0, 1, Element.Earth], [1, 1, Element.Earth]])],
    goal: (g) => g.players.A.score > 0,
  },
  {
    id: 2,
    title: "第2关 · 火烧连营",
    intro: "元素相邻（边对边）会反应。把火放到木头旁边，就会点燃它（3 回合后蔓延）。注意：元素反应不得分，只改地形。",
    goalText: "目标：让火与木头相邻、点燃反应",
    successText: "成功点燃！反应会延时 3 回合发生。",
    // 底部放 3 个木头
    initial: [
      { x: 4, y: 19, element: Element.Wood },
      { x: 5, y: 19, element: Element.Wood },
      { x: 6, y: 19, element: Element.Wood },
      { x: 0, y: 19, element: Element.Earth },
      { x: 1, y: 19, element: Element.Earth },
      { x: 2, y: 19, element: Element.Earth },
    ],
    script: [tp("Fire", [[0, 0, Element.Fire]])],
    // 棋盘上出现"带反应计时的火"即算点燃成功
    goal: (g) => {
      for (let y = 0; y < g.grid.h; y++)
        for (let x = 0; x < g.grid.w; x++) {
          const c = g.grid.get(x, y);
          if (c.element === Element.Fire && c.timer > 0) return true;
        }
      return false;
    },
  },
];
