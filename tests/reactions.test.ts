import { describe, it, expect } from "vitest";
import { Grid } from "../src/core/grid";
import { Element, Weather, makeCell } from "../src/core/types";
import { resolveReactions } from "../src/core/reactions";
import { RNG } from "../src/core/rng";

function run(g: Grid, weather: Weather, turns: number): void {
  const rng = new RNG(1);
  for (let i = 0; i < turns; i++) resolveReactions(g, weather, rng);
}

describe("元素化学反应矩阵", () => {
  it("火 + 木 相邻：3 回合后火蔓延，木变火", () => {
    const g = new Grid(5, 5);
    g.set(1, 4, makeCell(Element.Fire));
    g.set(2, 4, makeCell(Element.Wood));
    // 第1回合探测挂计时，之后递减；到第4次结算成熟
    run(g, Weather.Sunny, 4);
    // 原火位置应已销毁；木位置变成火
    expect(g.get(2, 4).element).toBe(Element.Fire);
  });

  it("火 + 水 相邻：3 回合后共同湮灭", () => {
    const g = new Grid(5, 5);
    g.set(1, 4, makeCell(Element.Fire));
    g.set(2, 4, makeCell(Element.Water));
    run(g, Weather.Sunny, 4);
    expect(g.get(1, 4).element).toBe(Element.Empty);
    expect(g.get(2, 4).element).toBe(Element.Empty);
  });

  it("水 + 带电金属：瞬间 3x3 爆炸", () => {
    const g = new Grid(5, 5);
    const metal = makeCell(Element.Metal);
    metal.charged = true;
    g.set(2, 2, metal);
    g.set(2, 3, makeCell(Element.Water));
    g.set(1, 1, makeCell(Element.Earth));
    g.set(3, 3, makeCell(Element.Earth));
    const rng = new RNG(1);
    resolveReactions(g, Weather.Sunny, rng);
    // 中心 3x3 全清
    for (let y = 1; y <= 3; y++)
      for (let x = 1; x <= 3; x++) expect(g.get(x, y).element).toBe(Element.Empty);
  });

  it("雨天：火被熄灭成砖土", () => {
    const g = new Grid(3, 3);
    g.set(1, 1, makeCell(Element.Fire));
    const rng = new RNG(1);
    resolveReactions(g, Weather.Rain, rng);
    expect(g.get(1, 1).element).toBe(Element.Earth);
  });

  it("雪天：水变冰", () => {
    const g = new Grid(3, 3);
    g.set(1, 1, makeCell(Element.Water));
    const rng = new RNG(1);
    resolveReactions(g, Weather.Snow, rng);
    expect(g.get(1, 1).element).toBe(Element.Ice);
  });

  it("火山：木变火、生命变砖、冰变水、水蒸发", () => {
    const g = new Grid(4, 4);
    g.set(0, 0, makeCell(Element.Wood));
    g.set(1, 0, makeCell(Element.Life));
    g.set(2, 0, makeCell(Element.Ice));
    g.set(3, 0, makeCell(Element.Water));
    const rng = new RNG(1);
    resolveReactions(g, Weather.Volcano, rng);
    expect(g.get(0, 0).element).toBe(Element.Fire);
    expect(g.get(1, 0).element).toBe(Element.Earth);
    expect(g.get(2, 0).element).toBe(Element.Water);
    expect(g.get(3, 0).element).toBe(Element.Empty);
  });

  it("惰性砖土不产生反应", () => {
    const g = new Grid(3, 3);
    g.set(1, 1, makeCell(Element.Earth));
    g.set(1, 2, makeCell(Element.Earth));
    run(g, Weather.Sunny, 5);
    expect(g.get(1, 1).element).toBe(Element.Earth);
  });
});
