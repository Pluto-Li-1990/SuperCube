// ===== 计分系统 (GDD 铁律) =====
// 元素反应零分；基础消除指数级；连锁几何翻倍。

// 基础消除：1行=1，2行=2，3行=4，4行=8，5行=16 ... = 2^(n-1)
export function baseLineScore(linesCleared: number): number {
  if (linesCleared <= 0) return 0;
  return Math.pow(2, linesCleared - 1);
}

// 连锁倍率：第 1 次消除 ×1，重力掉落后再次凑齐 ×2、×4、×8 ...
// cascadeIndex: 0 表示初次，1 表示第一次连锁，依此类推
export function cascadeMultiplier(cascadeIndex: number): number {
  return Math.pow(2, cascadeIndex);
}

// 一次消除事件得分
export function clearScore(linesCleared: number, cascadeIndex: number): number {
  return baseLineScore(linesCleared) * cascadeMultiplier(cascadeIndex);
}

// 远古生命清屏的海量积分
export const ANCIENT_LIFE_BONUS = 100;

// 生命方块达成条件常量
export const LIFE_MAX = 5; // 全场最多 5 个生命方块
export const LIFE_SURVIVE_TURNS = 5; // 存活 5 回合后第 6 回合召唤
