import { describe, it, expect } from "vitest";
import {
  buildLoadoutBags,
  presetDebuffPieces,
  BUFF_COPIES,
  DEBUFF_COPIES,
} from "../src/core/loadout";
import { validateCustomPiece } from "../src/core/pieces";

describe("Loadout 暗牌博弈", () => {
  it("预设 Debuff 棋子都是合法棋子", () => {
    for (const p of presetDebuffPieces()) {
      expect(validateCustomPiece(p.cells).ok).toBe(true);
    }
  });

  it("自选 Buff 棋子按份数加入自己池", () => {
    const debuff = presetDebuffPieces()[0];
    const buff = presetDebuffPieces()[1];
    const { selfExtra, oppExtra } = buildLoadoutBags([], {
      selfBuff: buff,
      oppDebuff: debuff,
    });
    expect(selfExtra.filter((p) => p.id === buff.id)).toHaveLength(BUFF_COPIES);
    expect(oppExtra.filter((p) => p.id === debuff.id)).toHaveLength(DEBUFF_COPIES);
  });

  it("工坊棋子并入自己池", () => {
    const shelf = presetDebuffPieces().slice(0, 2);
    const { selfExtra } = buildLoadoutBags(shelf, { selfBuff: null, oppDebuff: null });
    expect(selfExtra).toHaveLength(2);
  });

  it("不选则不附加", () => {
    const { selfExtra, oppExtra } = buildLoadoutBags([], { selfBuff: null, oppDebuff: null });
    expect(selfExtra).toHaveLength(0);
    expect(oppExtra).toHaveLength(0);
  });
});
