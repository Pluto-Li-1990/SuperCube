import { Element, PieceDef } from "./types";
import { makeCustomPiece } from "./pieces";

// ===== Loadout 暗牌博弈：Buff/Debuff 牌库构造（纯逻辑，可测） =====

// 预设的"刁钻镂空棋子"，用于塞给对手当 Debuff
export function presetDebuffPieces(): PieceDef[] {
  return [
    makeCustomPiece("孤角", [
      { x: 0, y: 0, element: Element.Earth },
      { x: 1, y: 1, element: Element.Earth },
    ]),
    makeCustomPiece("斜链", [
      { x: 0, y: 0, element: Element.Earth },
      { x: 1, y: 1, element: Element.Earth },
      { x: 2, y: 2, element: Element.Earth },
    ]),
    makeCustomPiece("黏弹", [
      { x: 0, y: 0, element: Element.Sticky },
      { x: 1, y: 1, element: Element.Sticky },
    ]),
    makeCustomPiece("独子", [{ x: 0, y: 0, element: Element.Earth }]),
    makeCustomPiece("火星", [
      { x: 0, y: 0, element: Element.Fire },
      { x: 1, y: 1, element: Element.Earth },
    ]),
  ];
}

export interface LoadoutChoice {
  selfBuff: PieceDef | null; // 加入自己掉落池的顺手棋子
  oppDebuff: PieceDef | null; // 强塞进对手掉落池的刁钻棋子
}

// Buff 棋子在自己池里加权出现的份数
export const BUFF_COPIES = 2;
// Debuff 棋子在对手池里加权出现的份数
export const DEBUFF_COPIES = 2;

// 根据 Loadout 选择，构造双方对战牌库的"附加部分"。
// 返回的数组会被并入各自的基础牌库（7 基础棋子）。
export function buildLoadoutBags(
  playerShelf: PieceDef[],
  choice: LoadoutChoice,
): { selfExtra: PieceDef[]; oppExtra: PieceDef[] } {
  const selfExtra: PieceDef[] = [...playerShelf];
  const oppExtra: PieceDef[] = [];

  if (choice.selfBuff) {
    for (let i = 0; i < BUFF_COPIES; i++) selfExtra.push(choice.selfBuff);
  }
  if (choice.oppDebuff) {
    for (let i = 0; i < DEBUFF_COPIES; i++) oppExtra.push(choice.oppDebuff);
  }
  return { selfExtra, oppExtra };
}

export const LOADOUT_SECONDS = 15; // 暗牌准备期倒计时
