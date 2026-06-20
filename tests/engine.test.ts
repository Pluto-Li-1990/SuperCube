import { describe, it, expect } from "vitest";
import { Game } from "../src/core/engine";

describe("游戏引擎 回合循环", () => {
  it("初始化：A 先手，回合 0，未结束", () => {
    const g = new Game({ seed: 42, mode: "shared-turn" });
    expect(g.current).toBe("A");
    expect(g.turn).toBe(0);
    expect(g.gameOver).toBe(false);
    expect(g.active).not.toBeNull();
  });

  it("硬降+结算后回合数+1 并切换操作者", () => {
    const g = new Game({ seed: 42, mode: "shared-turn" });
    g.commitTurn();
    expect(g.turn).toBe(1);
    expect(g.current).toBe("B");
  });

  it("连续多回合不崩溃且分数非负", () => {
    const g = new Game({ seed: 7, mode: "shared-turn" });
    for (let i = 0; i < 40 && !g.gameOver; i++) g.commitTurn();
    expect(g.players.A.score).toBeGreaterThanOrEqual(0);
    expect(g.players.B.score).toBeGreaterThanOrEqual(0);
  });

  it("限时狂欢模式：触顶不死亡，持续可玩", () => {
    const g = new Game({ seed: 3, mode: "time-attack", aiPlayer: "B" });
    for (let i = 0; i < 120 && !g.gameOver; i++) g.commitTurn();
    // 限时模式不应因触顶而 gameOver（由计时器在 UI 层结束）
    expect(g.gameOver).toBe(false);
  });

  it("移动与旋转受边界约束", () => {
    const g = new Game({ seed: 1 });
    // 一直左移直到撞墙
    let moved = 0;
    while (g.move(-1)) moved++;
    expect(moved).toBeGreaterThanOrEqual(0);
    expect(g.active!.px).toBeGreaterThanOrEqual(0);
  });
});
