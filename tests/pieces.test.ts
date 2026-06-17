import { describe, it, expect } from "vitest";
import {
  validateCustomPiece,
  isKingConnected,
  STANDARD_PIECES,
  rotateCells,
} from "../src/core/pieces";
import { Element, PieceCellDef } from "../src/core/types";

function cells(arr: [number, number, Element?][]): PieceCellDef[] {
  return arr.map(([x, y, e]) => ({ x, y, element: e ?? Element.Earth }));
}

describe("源力工坊 自定义棋子校验", () => {
  it("接受顶点(对角)相连的棋子", () => {
    // 两块仅靠角相连
    const r = validateCustomPiece(cells([[0, 0], [1, 1]]));
    expect(r.ok).toBe(true);
  });

  it("拒绝完全不相连的棋子", () => {
    const r = validateCustomPiece(cells([[0, 0], [3, 3]]));
    expect(r.ok).toBe(false);
  });

  it("拒绝超过 4 个方块", () => {
    const r = validateCustomPiece(cells([[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]]));
    expect(r.ok).toBe(false);
  });

  it("拒绝超出 4x4 画布", () => {
    const r = validateCustomPiece(cells([[0, 0], [4, 0]]));
    expect(r.ok).toBe(false);
  });

  it("每个棋子最多 1 个生命方块", () => {
    const r = validateCustomPiece(
      cells([
        [0, 0, Element.Life],
        [1, 1, Element.Life],
      ]),
    );
    expect(r.ok).toBe(false);
  });

  it("单块永远连通", () => {
    expect(isKingConnected(cells([[2, 2]]))).toBe(true);
  });

  it("L 形对角链连通", () => {
    expect(isKingConnected(cells([[0, 0], [1, 1], [2, 2], [3, 3]]))).toBe(true);
  });
});

describe("传统 7 棋子", () => {
  it("共 7 个且每个 4 格", () => {
    expect(STANDARD_PIECES).toHaveLength(7);
    for (const p of STANDARD_PIECES) expect(p.cells).toHaveLength(4);
  });

  it("旋转后仍是 4 格", () => {
    for (const p of STANDARD_PIECES) {
      expect(rotateCells(p.cells)).toHaveLength(4);
    }
  });
});
