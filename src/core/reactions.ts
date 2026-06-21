import { Grid } from "./grid";
import { Element, Weather, Cell, isEmpty, emptyCell, makeCell } from "./types";
import { RNG } from "./rng";

export const REACTION_DELAY = 3; // 化学反应延时回合数

export interface ReactionEvent {
  type:
    | "fire-spread"
    | "fire-water-annihilate"
    | "water-grow"
    | "metal-explode"
    | "metal-crush"
    | "metal-life-degrade"
    | "ice-melt"
    | "weather";
  x: number;
  y: number;
  detail?: string;
}

// 4 邻接是否存在某元素
function hasEdgeNeighbor(g: Grid, x: number, y: number, el: Element): boolean {
  for (const [nx, ny] of Grid.neighbors4(x, y)) {
    if (g.inBounds(nx, ny) && g.get(nx, ny).element === el) return true;
  }
  return false;
}

function edgeNeighborsOf(g: Grid, x: number, y: number, el: Element): [number, number][] {
  const out: [number, number][] = [];
  for (const [nx, ny] of Grid.neighbors4(x, y)) {
    if (g.inBounds(nx, ny) && g.get(nx, ny).element === el) out.push([nx, ny]);
  }
  return out;
}

// ===== 主入口：每回合结算一次化学反应 =====
// 返回本回合发生的反应事件（用于 UI 特效 / 日志）。
export function resolveReactions(g: Grid, weather: Weather, rng: RNG): ReactionEvent[] {
  const events: ReactionEvent[] = [];

  // 1) 推进已有计时器，成熟的执行
  matureTimers(g, weather, rng, events);

  // 2) 天气持续效果
  applyWeather(g, weather, events);

  // 3) 即时反应：水 + 带电金属 → 3x3 爆炸（瞬间）
  immediateExplosions(g, events);

  // 4) 探测新反应，挂载计时器（仅对无计时的格子）
  detectNewReactions(g, weather, rng, events);

  return events;
}

// --- 步骤 1：成熟计时器执行 ---
function matureTimers(g: Grid, weather: Weather, rng: RNG, events: ReactionEvent[]): void {
  const matured: [number, number][] = [];
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const c = g.get(x, y);
      if (c.timer > 0) {
        c.timer--;
        if (c.timer === 0) matured.push([x, y]);
      }
    }
  }

  for (const [x, y] of matured) {
    const c = g.get(x, y);
    if (c.timer !== 0) continue; // 可能已被其它反应改写
    const reaction = c.transformTo === null && c.willDestroy ? "destroy" : "transform";

    if (c.element === Element.Fire && c.transformTo === Element.Fire) {
      // 火蔓延：原火销毁，相连木头变新火
      const woods = edgeNeighborsOf(g, x, y, Element.Wood);
      g.set(x, y, emptyCell());
      for (const [wx, wy] of woods) {
        const nc = makeCell(Element.Fire);
        nc.timer = REACTION_DELAY;
        nc.transformTo = Element.Fire;
        g.set(wx, wy, nc);
      }
      events.push({ type: "fire-spread", x, y });
    } else if (c.willDestroy) {
      // 湮灭（火+水）
      g.set(x, y, emptyCell());
      events.push({ type: "fire-water-annihilate", x, y });
    } else if (c.element === Element.Water && c.transformTo === Element.Wood) {
      // 水催生木：消耗水，相连木上方长新木
      doWaterGrowth(g, x, y, weather, rng, events);
    } else if (c.element === Element.Metal && c.transformTo === Element.Metal) {
      // 金属下压：压碎正下方一层
      doMetalCrush(g, x, y, events);
    } else if (c.transformTo === Element.Earth && c.element === Element.Life) {
      // 金属/电使生命退化为砖土
      g.set(x, y, makeCell(Element.Earth));
      events.push({ type: "metal-life-degrade", x, y });
    } else if (c.element === Element.Ice && c.transformTo === Element.Water) {
      // 冰遇水：冰变水
      g.set(x, y, makeCell(Element.Water));
      events.push({ type: "ice-melt", x, y });
    } else if (reaction === "transform" && c.transformTo !== null) {
      g.set(x, y, makeCell(c.transformTo));
    } else {
      // 兜底：清掉计时
      c.timer = -1;
      c.transformTo = null;
      c.willDestroy = false;
    }
  }
}

function doWaterGrowth(
  g: Grid,
  x: number,
  y: number,
  weather: Weather,
  rng: RNG,
  events: ReactionEvent[],
): void {
  const woods = edgeNeighborsOf(g, x, y, Element.Wood);
  // 消耗水
  g.set(x, y, emptyCell());
  const growth = weather === Weather.Sunny ? 2 : 1; // 晴天翻倍
  for (const [wx, wy] of woods) {
    // 在木头上方生长
    for (let i = 1; i <= growth; i++) {
      const ny = wy - i;
      if (!g.inBounds(wx, ny)) break;
      if (isEmpty(g.get(wx, ny))) {
        g.set(wx, ny, makeCell(Element.Wood));
      } else {
        // 上方有物 → 整列顶起一格（RNG 防无限增生）
        if (rng.next() < 0.6) pushColumnUp(g, wx, wy - i + 1);
        break;
      }
    }
    events.push({ type: "water-grow", x: wx, y: wy });
  }
}

// 把某列从某行起整体上移一格（顶端溢出丢弃）
function pushColumnUp(g: Grid, x: number, fromY: number): void {
  for (let y = 0; y < fromY; y++) {
    g.set(x, y, g.get(x, y + 1));
  }
}

function doMetalCrush(g: Grid, x: number, y: number, events: ReactionEvent[]): void {
  const by = y + 1;
  if (g.inBounds(x, by) && !isEmpty(g.get(x, by))) {
    // 压碎下方一层，整列下移：金属及以上下沉一格
    for (let yy = by; yy > 0; yy--) {
      g.set(x, yy, g.get(x, yy - 1));
    }
    g.set(x, 0, emptyCell());
    events.push({ type: "metal-crush", x, y: by });
  } else {
    const c = g.get(x, y);
    c.timer = -1;
    c.transformTo = null;
  }
}

// --- 步骤 2：天气持续效果 ---
function applyWeather(g: Grid, weather: Weather, events: ReactionEvent[]): void {
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const c = g.get(x, y);
      switch (weather) {
        case Weather.Rain:
          if (c.element === Element.Fire) {
            g.set(x, y, makeCell(Element.Earth)); // 熄火成灰
            events.push({ type: "weather", x, y, detail: "rain-extinguish" });
          }
          break;
        case Weather.Snow:
          if (c.element === Element.Water) {
            g.set(x, y, makeCell(Element.Ice));
            events.push({ type: "weather", x, y, detail: "snow-freeze" });
          }
          break;
        case Weather.Thunder:
          if (c.element === Element.Metal) c.charged = true;
          break;
        case Weather.Volcano:
          if (c.element === Element.Wood) {
            const nc = makeCell(Element.Fire);
            nc.timer = REACTION_DELAY;
            nc.transformTo = Element.Fire;
            g.set(x, y, nc);
          } else if (c.element === Element.Life) {
            g.set(x, y, makeCell(Element.Earth));
          } else if (c.element === Element.Ice) {
            g.set(x, y, makeCell(Element.Water));
          } else if (c.element === Element.Water) {
            g.set(x, y, emptyCell()); // 蒸发
          }
          break;
        case Weather.Sunny:
        default:
          break;
      }
    }
  }
}

// --- 步骤 3：即时爆炸（水 + 带电金属）---
function immediateExplosions(g: Grid, events: ReactionEvent[]): void {
  const detonations: [number, number][] = [];
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const c = g.get(x, y);
      if (c.element === Element.Metal && c.charged && hasEdgeNeighbor(g, x, y, Element.Water)) {
        detonations.push([x, y]);
      }
    }
  }
  for (const [x, y] of detonations) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (g.inBounds(nx, ny)) g.set(nx, ny, emptyCell());
      }
    }
    events.push({ type: "metal-explode", x, y });
  }
}

// --- 步骤 4：探测新反应并挂载计时器 ---
function detectNewReactions(
  g: Grid,
  weather: Weather,
  rng: RNG,
  _events: ReactionEvent[],
): void {
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const c = g.get(x, y);
      if (c.timer !== -1) continue; // 已有反应在计时
      switch (c.element) {
        case Element.Fire: {
          if (hasEdgeNeighbor(g, x, y, Element.Water)) {
            // 火 + 水 湮灭
            startDestroy(c);
            // 同时给相邻水挂湮灭
            for (const [nx, ny] of edgeNeighborsOf(g, x, y, Element.Water)) {
              const w = g.get(nx, ny);
              if (w.timer === -1) startDestroy(w);
            }
          } else if (hasEdgeNeighbor(g, x, y, Element.Wood)) {
            // 火蔓延
            c.timer = REACTION_DELAY;
            c.transformTo = Element.Fire;
          }
          break;
        }
        case Element.Water: {
          if (hasEdgeNeighbor(g, x, y, Element.Wood)) {
            c.timer = REACTION_DELAY;
            c.transformTo = Element.Wood; // 标记为催生
          }
          break;
        }
        case Element.Metal: {
          const by = y + 1;
          const below = g.inBounds(x, by) ? g.get(x, by).element : Element.Empty;
          if ((below === Element.Wood || below === Element.Ice) && c.timer === -1) {
            // 物理下压
            c.timer = REACTION_DELAY;
            c.transformTo = Element.Metal; // 标记为下压
          }
          if (hasEdgeNeighbor(g, x, y, Element.Life) && (weather === Weather.Thunder || c.charged)) {
            // 雷暴导电使生命退化（给相邻生命挂计时）
            for (const [nx, ny] of edgeNeighborsOf(g, x, y, Element.Life)) {
              const lc = g.get(nx, ny);
              if (lc.timer === -1) {
                lc.timer = REACTION_DELAY;
                lc.transformTo = Element.Earth;
              }
            }
          }
          break;
        }
        case Element.Ice: {
          if (hasEdgeNeighbor(g, x, y, Element.Water)) {
            c.timer = REACTION_DELAY;
            c.transformTo = Element.Water; // 冰变水
          }
          break;
        }
        default:
          break;
      }
    }
  }
  void rng; // 预留：未来 RNG 化的反应判定
}

function startDestroy(c: Cell): void {
  c.timer = REACTION_DELAY;
  c.willDestroy = true;
  c.transformTo = null;
}
