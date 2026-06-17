import { describe, it, expect } from "vitest";
import { baseLineScore, cascadeMultiplier, clearScore } from "../src/core/scoring";

describe("计分系统 (GDD 铁律)", () => {
  it("基础消除指数级: 1/2/4/8/16", () => {
    expect(baseLineScore(1)).toBe(1);
    expect(baseLineScore(2)).toBe(2);
    expect(baseLineScore(3)).toBe(4);
    expect(baseLineScore(4)).toBe(8);
    expect(baseLineScore(5)).toBe(16);
    expect(baseLineScore(0)).toBe(0);
  });

  it("连锁倍率 x1/x2/x4/x8", () => {
    expect(cascadeMultiplier(0)).toBe(1);
    expect(cascadeMultiplier(1)).toBe(2);
    expect(cascadeMultiplier(2)).toBe(4);
    expect(cascadeMultiplier(3)).toBe(8);
  });

  it("综合得分 = 基础 × 连锁", () => {
    expect(clearScore(2, 0)).toBe(2); // 2行初次
    expect(clearScore(2, 1)).toBe(4); // 2行第一次连锁
    expect(clearScore(4, 2)).toBe(32); // 4行 x4
  });
});
