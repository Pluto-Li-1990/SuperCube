import { Element } from "./types";

export const ELEMENT_DESC: Record<Element, { name: string; tagline: string; detail: string }> = {
  [Element.Empty]: { name: "空", tagline: "", detail: "" },
  [Element.Earth]: { name: "砖土", tagline: "惰性基石", detail: "不参与任何反应，用来当地基和隔离带。" },
  [Element.Fire]: {
    name: "火焰",
    tagline: "蔓延",
    detail: "与相邻木头反应，3回合后蔓延、烧掉木头变成新火；遇水则与水共同湮灭消失；雨天会熄灭。元素反应不得分。",
  },
  [Element.Water]: {
    name: "水",
    tagline: "催生·爆破",
    detail: "让相邻木头上方长出新木（晴天长2格）；遇到带电金属立即触发3×3爆炸；雪天结成冰。",
  },
  [Element.Wood]: {
    name: "木",
    tagline: "可燃·可生长",
    detail: "会被火点燃、被水催生。是火与水反应的核心载体。",
  },
  [Element.Metal]: {
    name: "金属",
    tagline: "超重·导电",
    detail: "停在木头/冰上方3回合会压碎下方一层并整列下移；雷暴天带电，引爆相邻水、并把相邻生命退化成砖土。",
  },
  [Element.Ice]: {
    name: "冰",
    tagline: "滑动",
    detail: "触底后会随机向左或向右滑到底；与水相邻3回合后自己化成水。",
  },
  [Element.Sticky]: {
    name: "粘粘",
    tagline: "悬停",
    detail: "反重力。两块粘粘一碰就立刻粘住、停在半空不再下落。",
  },
  [Element.Life]: {
    name: "生命",
    tagline: "终极大招",
    detail: "全场最多5个。集齐5个并存活5回合，第6回合召唤远古生命清屏、给海量积分；被火/冰/电/消除摧毁则变砖土。每个自定义棋子最多放1个。",
  },
};
