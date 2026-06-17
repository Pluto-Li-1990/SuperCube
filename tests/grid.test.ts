import { describe, it, expect } from "vitest";
import { Grid } from "../src/core/grid";
import { Element } from "../src/core/types";

describe("棋盘 Grid", () => {
  it("默认 10x20", () => {
    const g = new Grid();
    expect(g.w).toBe(10);
    expect(g.h).toBe(20);
  });

  it("填满整行被识别并消除", () => {
    const g = new Grid(4, 4);
    for (let x = 0; x < 4; x++) g.setElement(x, 3, Element.Earth);
    expect(g.fullRows()).toEqual([3]);
    g.removeRows([3]);
    expect(g.fullRows()).toEqual([]);
    // 消除后该行应为空
    for (let x = 0; x < 4; x++) expect(g.get(x, 3).element).toBe(Element.Empty);
  });

  it("重力让悬空块下沉", () => {
    const g = new Grid(3, 4);
    g.setElement(1, 0, Element.Earth); // 顶部悬空
    expect(g.applyGravity()).toBe(true);
    expect(g.get(1, 3).element).toBe(Element.Earth);
    expect(g.get(1, 0).element).toBe(Element.Empty);
  });

  it("触顶检测", () => {
    const g = new Grid(3, 4);
    expect(g.isToppedOut()).toBe(false);
    g.setElement(0, 0, Element.Earth);
    expect(g.isToppedOut()).toBe(true);
  });
});
