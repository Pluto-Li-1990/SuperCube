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

function rowExcept(y: number, gapX: number): { x: number; y: number; element: Element }[] {
  return Array.from({ length: 10 }, (_, x) => ({ x, y, element: Element.Earth })).filter((c) => c.x !== gapX);
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
  {
    id: 3,
    title: "第3关 · 水催生木",
    teach: Element.Water,
    intro: "水：放到木头旁边（边对边），过几回合会催生新木。晴天会长得更猛。",
    goalText: "目标：让水与木头相邻，触发生长",
    successText: "木头长出来了！水能改变地形，为后续消除铺路。",
    initial: [
      { x: 4, y: 19, element: Element.Wood },
      { x: 5, y: 19, element: Element.Wood },
      { x: 6, y: 19, element: Element.Wood },
      { x: 0, y: 19, element: Element.Earth },
      { x: 1, y: 19, element: Element.Earth },
      { x: 2, y: 19, element: Element.Earth },
    ],
    script: [
      tp("Water", [[0, 0, Element.Water]]),
      tp("E1", [[0, 0, Element.Earth]]),
      tp("E2", [[0, 0, Element.Earth]]),
      tp("E3", [[0, 0, Element.Earth]]),
      tp("E4", [[0, 0, Element.Earth]]),
    ],
    goal: (_g, last) => !!last?.events.some((e) => e.type === "water-grow"),
  },
  {
    id: 4,
    title: "第4关 · 金属下压",
    teach: Element.Metal,
    intro: "金属：停在木头或冰上方几回合，会压碎下方一层并让整列下移。",
    goalText: "目标：把金属压在木头上方，等待下压",
    successText: "金属压碎了下层！它适合破坏支撑、制造地形变化。",
    initial: [
      { x: 4, y: 19, element: Element.Wood },
      { x: 0, y: 19, element: Element.Earth },
      { x: 1, y: 19, element: Element.Earth },
      { x: 2, y: 19, element: Element.Earth },
      { x: 7, y: 19, element: Element.Earth },
      { x: 8, y: 19, element: Element.Earth },
      { x: 9, y: 19, element: Element.Earth },
    ],
    script: [
      tp("Metal", [[0, 0, Element.Metal]]),
      tp("E1", [[0, 0, Element.Earth]]),
      tp("E2", [[0, 0, Element.Earth]]),
      tp("E3", [[0, 0, Element.Earth]]),
    ],
    goal: (_g, last) => !!last?.events.some((e) => e.type === "metal-crush"),
  },
  {
    id: 5,
    title: "第5关 · 连锁消除",
    intro: "消除后，上方方块会落下来。如果掉落后再次凑齐整行，就会形成连锁，分数翻倍。",
    goalText: "目标：一次落子清掉 2 行",
    successText: "漂亮的双行消除！这就是连锁思路的基础。",
    initial: [...rowExcept(18, 4), ...rowExcept(19, 4)],
    script: [tp("Chain", [[0, 0, Element.Earth], [0, 1, Element.Earth]])],
    goal: (_g, last) => (last?.linesCleared ?? 0) >= 2,
  },
  {
    id: 6,
    title: "第6关 · 生命方块",
    teach: Element.Life,
    intro: "生命：终极大招。集齐 5 个生命方块并存活数回合，就会召唤远古生命清屏并获得海量积分。",
    goalText: "目标：成功放下一个生命方块",
    successText: "生命方块已经入场。保护它们，才能等到远古生命苏醒。",
    initial: [
      { x: 0, y: 19, element: Element.Earth },
      { x: 1, y: 19, element: Element.Earth },
      { x: 8, y: 19, element: Element.Earth },
      { x: 9, y: 19, element: Element.Earth },
    ],
    script: [tp("Life", [[0, 0, Element.Life]])],
    goal: (g) => g.grid.countElement(Element.Life) > 0,
  },
];
