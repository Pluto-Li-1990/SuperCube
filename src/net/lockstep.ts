import { Game, TurnResult } from "../core/engine";
import { PieceDef, Element } from "../core/types";
import { MoveDTO, PieceDefDTO } from "./netTypes";

// 把一个远端回合操作在本地引擎上重放（锁步同步核心）
export function applyMove(game: Game, move: MoveDTO): TurnResult {
  for (let i = 0; i < move.rotation; i++) game.rotate();
  if (game.active) {
    const delta = move.px - game.active.px;
    const dir = delta > 0 ? 1 : -1;
    for (let i = 0; i < Math.abs(delta); i++) if (!game.move(dir)) break;
  }
  return game.commitTurn();
}

// 棋盘指纹，用于校验两端是否同步
export function boardHash(game: Game): string {
  let s = "";
  for (let y = 0; y < game.grid.h; y++)
    for (let x = 0; x < game.grid.w; x++) s += game.grid.get(x, y).element;
  return s;
}

// 棋子 DTO <-> PieceDef 转换（牌库传输用）
export function pieceToDTO(p: PieceDef): PieceDefDTO {
  return {
    id: p.id,
    name: p.name,
    custom: p.custom,
    cells: p.cells.map((c) => ({ x: c.x, y: c.y, element: c.element })),
  };
}

export function dtoToPiece(d: PieceDefDTO): PieceDef {
  return {
    id: d.id,
    name: d.name,
    custom: d.custom,
    cells: d.cells.map((c) => ({ x: c.x, y: c.y, element: c.element as Element })),
  };
}
