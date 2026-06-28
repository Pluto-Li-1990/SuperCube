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
  teach?: Element;
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
    teach: Element.Fire,
    intro: "火焰：放到木头旁边（边对边），过几回合会蔓延、烧掉木头。记住元素反应延时发生、而且不得分。",
    goalText: "目标：把火放到木头旁边，等它蔓延烧掉木头",
    successText: "看到了吗？火蔓延烧掉了木头——这就是元素反应。",
    // 底部放 3 个木头
    initial: [
      { x: 4, y: 19, element: Element.Wood },
      { x: 5, y: 19, element: Element.Wood },
      { x: 6, y: 19, element: Element.Wood },
      { x: 0, y: 19, element: Element.Earth },
      { x: 1, y: 19, element: Element.Earth },
      { x: 2, y: 19, element: Element.Earth },
    ],
    script: [
      tp("Fire", [[0, 0, Element.Fire]]),
      tp("E1", [[0, 0, Element.Earth]]),
      tp("E2", [[0, 0, Element.Earth]]),
      tp("E3", [[0, 0, Element.Earth]]),
      tp("E4", [[0, 0, Element.Earth]]),
    ],
    goal: (_g, last) => !!last?.events.some((e) => e.type === "fire-spread"),
  },
];
