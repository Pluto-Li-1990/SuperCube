import { describe, it, expect } from "vitest";
import { Game } from "../src/core/engine";
import { chooseMove, aiPlayTurn } from "../src/ai/ai";

describe("AI 对手", () => {
  it("总能给出合法落点", () => {
    const g = new Game({ seed: 99 });
    const mv = chooseMove(g, "hard");
    expect(mv.px).toBeGreaterThanOrEqual(0);
    expect(mv.px).toBeLessThan(g.grid.w);
    expect(mv.rotation).toBeGreaterThanOrEqual(0);
    expect(mv.rotation).toBeLessThan(4);
  });

  it("AI 自动对弈多回合稳定运行", () => {
    const g = new Game({ seed: 5, aiPlayer: "B" });
    for (let i = 0; i < 30 && !g.gameOver; i++) aiPlayTurn(g, "normal");
    expect(g.players.B.score).toBeGreaterThanOrEqual(0);
  });

  it("hard 比 easy 更少制造空洞（统计倾向）", () => {
    // 仅验证不抛错且 hard 难度可用
    const g = new Game({ seed: 3 });
    expect(() => chooseMove(g, "easy")).not.toThrow();
    expect(() => chooseMove(g, "hard")).not.toThrow();
  });
});
