import { describe, it, expect } from "vitest";
import { Game } from "../src/core/engine";
import { chooseMove } from "../src/ai/ai";
import { applyMove, boardHash } from "../src/net/lockstep";
import { MoveDTO } from "../src/net/netTypes";

// 锁步同步核心：相同种子 + 相同操作序列 → 两端棋盘完全一致
describe("联网锁步同步", () => {
  it("两端用相同操作重放，棋盘指纹始终一致", () => {
    const seed = 2024;
    const ga = new Game({ seed, aiPlayer: null as unknown as "B", mode: "shared-turn" });
    const gb = new Game({ seed, aiPlayer: null as unknown as "B", mode: "shared-turn" });

    for (let t = 0; t < 30 && !ga.gameOver && !gb.gameOver; t++) {
      // 由“当前操作方”的引擎决策一个落点，做成 MoveDTO
      const mv = chooseMove(ga, "normal");
      const dto: MoveDTO = { rotation: mv.rotation, px: mv.px, hardDrop: true };
      // 两端各自重放同一操作
      applyMove(ga, dto);
      applyMove(gb, dto);
      expect(boardHash(gb)).toBe(boardHash(ga));
    }
    expect(boardHash(ga)).toBe(boardHash(gb));
  });

  it("不同操作会产生不同棋盘（指纹敏感）", () => {
    const ga = new Game({ seed: 5, mode: "shared-turn" });
    const gb = new Game({ seed: 5, mode: "shared-turn" });
    applyMove(ga, { rotation: 0, px: 0, hardDrop: true });
    applyMove(gb, { rotation: 1, px: 7, hardDrop: true });
    expect(boardHash(ga)).not.toBe(boardHash(gb));
  });
});
