import { Grid, GRID_W, GRID_H } from "./grid";
import {
  Element,
  PieceDef,
  PlayerId,
  Cell,
  isEmpty,
  makeCell,
} from "./types";
import { STANDARD_PIECES, normalizePiece, rotateCells, pieceBounds } from "./pieces";
import { RNG } from "./rng";
import { WeatherSystem } from "./weather";
import { resolveReactions, ReactionEvent } from "./reactions";
import {
  clearScore,
  ANCIENT_LIFE_BONUS,
  LIFE_MAX,
  LIFE_SURVIVE_TURNS,
} from "./scoring";

export type GameMode = "shared-turn" | "survival" | "time-attack";

export interface ActivePiece {
  def: PieceDef;
  cells: { x: number; y: number; element: Element }[]; // 已归一化的当前朝向
  px: number; // 棋盘上的左上锚点
  py: number;
}

export interface PlayerState {
  id: PlayerId;
  score: number;
  isAI: boolean;
  // 该玩家的牌库（落子池）
  bag: PieceDef[];
  nextQueue: PieceDef[];
}

export interface TurnResult {
  linesCleared: number;
  scored: number;
  events: ReactionEvent[];
  ancientLife: boolean;
}

export class Game {
  grid: Grid;
  rng: RNG;
  weather: WeatherSystem;
  mode: GameMode;
  players: Record<PlayerId, PlayerState>;
  current: PlayerId; // 当前操作者
  active: ActivePiece | null;
  turn: number; // 全局回合计数（1 掉落 = 1 回合）
  gameOver: boolean;
  winner: PlayerId | null;
  // 生命方块达成 5 个后的存活计数
  lifeFullSince: number | null;

  constructor(opts?: {
    seed?: number;
    mode?: GameMode;
    aiPlayer?: PlayerId | null;
    customBagA?: PieceDef[];
    customBagB?: PieceDef[];
  }) {
    this.rng = new RNG(opts?.seed ?? Date.now() & 0xffffffff);
    this.grid = new Grid(GRID_W, GRID_H);
    this.weather = new WeatherSystem(this.rng);
    this.mode = opts?.mode ?? "shared-turn";
    const aiPlayer = opts?.aiPlayer ?? "B";
    this.players = {
      A: this.mkPlayer("A", aiPlayer === "A", opts?.customBagA),
      B: this.mkPlayer("B", aiPlayer === "B", opts?.customBagB),
    };
    this.current = "A";
    this.turn = 0;
    this.gameOver = false;
    this.winner = null;
    this.lifeFullSince = null;
    this.active = null;
    this.spawn();
  }

  private mkPlayer(id: PlayerId, isAI: boolean, customBag?: PieceDef[]): PlayerState {
    const bag = [...STANDARD_PIECES];
    if (customBag) bag.push(...customBag);
    return { id, score: 0, isAI, bag, nextQueue: [] };
  }

  private drawPiece(p: PlayerState): PieceDef {
    if (p.nextQueue.length === 0) {
      // 简单随机袋
      for (let i = 0; i < 5; i++) p.nextQueue.push(this.rng.pick(p.bag));
    }
    return p.nextQueue.shift()!;
  }

  peekNext(id: PlayerId): PieceDef {
    const p = this.players[id];
    if (p.nextQueue.length === 0) p.nextQueue.push(this.rng.pick(p.bag));
    return p.nextQueue[0];
  }

  // 生成新活动棋子（顶部居中）
  // 加权随机元素（标准棋子出生时赋元素，确定性来自 this.rng）
  private rollElement(): Element {
    const r = this.rng.int(100);
    if (r < 30) return Element.Earth;
    if (r < 46) return Element.Wood;
    if (r < 60) return Element.Water;
    if (r < 72) return Element.Fire;
    if (r < 84) return Element.Metal;
    if (r < 92) return Element.Ice;
    if (r < 97) return Element.Sticky;
    return Element.Life;
  }

  spawn(): void {
    const p = this.players[this.current];
    const def = this.drawPiece(p);
    let cells = normalizePiece(def.cells.map((c) => ({ ...c })));
    // 标准棋子赋随机元素；自定义棋子保留设计的元素
    if (!def.custom) {
      const el = this.rollElement();
      cells = cells.map((c) => ({ ...c, element: el }));
    }
    const { w } = pieceBounds(cells);
    const px = Math.floor((this.grid.w - w) / 2);
    const py = 0;
    this.active = { def, cells, px, py };
    // 生成即碰撞 → 该模式判定
    if (this.collides(this.active, 0, 0)) {
      this.onTopOut();
    }
  }

  private absCells(piece: ActivePiece, dx = 0, dy = 0): { x: number; y: number; element: Element }[] {
    return piece.cells.map((c) => ({
      x: piece.px + c.x + dx,
      y: piece.py + c.y + dy,
      element: c.element,
    }));
  }

  collides(piece: ActivePiece, dx: number, dy: number): boolean {
    for (const c of this.absCells(piece, dx, dy)) {
      if (c.x < 0 || c.x >= this.grid.w || c.y >= this.grid.h) return true;
      if (c.y < 0) continue; // 顶部上方允许
      if (!isEmpty(this.grid.get(c.x, c.y))) return true;
    }
    return false;
  }

  move(dx: number): boolean {
    if (!this.active || this.gameOver) return false;
    if (!this.collides(this.active, dx, 0)) {
      this.active.px += dx;
      return true;
    }
    return false;
  }

  rotate(): boolean {
    if (!this.active || this.gameOver) return false;
    const rotated = rotateCells(this.active.cells);
    const test: ActivePiece = { ...this.active, cells: rotated };
    // 简单踢墙
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!this.collides(test, kick, 0)) {
        this.active.cells = rotated;
        this.active.px += kick;
        return true;
      }
    }
    return false;
  }

  // 软降一格；不能降则锁定
  step(): boolean {
    if (!this.active || this.gameOver) return false;
    if (!this.collides(this.active, 0, 1)) {
      this.active.py += 1;
      return true;
    }
    return false;
  }

  // 硬降到底
  hardDrop(): void {
    if (!this.active || this.gameOver) return;
    while (this.step()) {
      /* 落到底 */
    }
  }

  // 锁定当前棋子并结算整个回合，返回结果
  lockAndResolve(): TurnResult {
    if (!this.active || this.gameOver) {
      return { linesCleared: 0, scored: 0, events: [], ancientLife: false };
    }
    // 粘粘：若棋子含粘粘块且接触到已有粘粘块则悬停固定（此处锁定时直接写盘）
    const placedOwner = this.current;
    for (const c of this.absCells(this.active)) {
      if (c.y >= 0 && c.y < this.grid.h && c.x >= 0 && c.x < this.grid.w) {
        this.grid.set(c.x, c.y, makeCell(c.element, placedOwner));
      }
    }
    this.active = null;
    this.turn += 1;

    // 天气推进
    this.weather.tick();

    // 化学反应结算
    const events = resolveReactions(this.grid, this.weather.current, this.rng);

    // 连锁消除（整行消除后上方下移，不做逐列重力，棋子保持原位形成地形）
    const { lines, scored } = this.resolveClears(placedOwner);

    // 生命方块达成判定
    const ancientLife = this.checkAncientLife(placedOwner);

    // 模式相关收尾
    this.postTurn();

    // 切换操作者（同屏回合制）
    if (this.mode === "shared-turn" && !this.gameOver) {
      this.current = this.current === "A" ? "B" : "A";
    }
    if (!this.gameOver) this.spawn();

    return { linesCleared: lines, scored, events, ancientLife };
  }

  // 连锁消除：消除→重力→若再凑齐则倍率递增
  private resolveClears(scorer: PlayerId): { lines: number; scored: number } {
    let totalLines = 0;
    let totalScore = 0;
    let cascade = 0;
    while (true) {
      const rows = this.grid.fullRows();
      if (rows.length === 0) break;
      const gained = clearScore(rows.length, cascade);
      totalScore += gained;
      totalLines += rows.length;
      this.players[scorer].score += gained;
      this.grid.removeRows(rows);
      cascade++;
    }
    return { lines: totalLines, scored: totalScore };
  }

  // 远古生命：5 个生命方块存活 LIFE_SURVIVE_TURNS 回合 → 清屏 + 海量积分
  private checkAncientLife(scorer: PlayerId): boolean {
    const lifeCount = this.grid.countElement(Element.Life);
    if (lifeCount >= LIFE_MAX) {
      if (this.lifeFullSince === null) this.lifeFullSince = this.turn;
      if (this.turn - this.lifeFullSince >= LIFE_SURVIVE_TURNS) {
        // 召唤远古生命：清屏并积分
        this.players[scorer].score += ANCIENT_LIFE_BONUS;
        this.grid = new Grid(this.grid.w, this.grid.h);
        this.lifeFullSince = null;
        return true;
      }
    } else {
      this.lifeFullSince = null;
    }
    return false;
  }

  private postTurn(): void {
    if (this.mode === "survival" && this.grid.isToppedOut()) {
      this.gameOver = true;
      this.winner = this.current === "A" ? "B" : "A";
    }
  }

  private onTopOut(): void {
    if (this.mode === "survival" || this.mode === "shared-turn") {
      this.gameOver = true;
      this.winner = this.current === "A" ? "B" : "A";
    }
  }

  // 便捷：执行一整个 AI/玩家回合（移动序列由调用方决定，这里只做硬降+结算）
  commitTurn(): TurnResult {
    this.hardDrop();
    return this.lockAndResolve();
  }

  // 当前活动棋子的落地预览坐标
  ghostCells(): { x: number; y: number; element: Element }[] {
    if (!this.active) return [];
    const ghost: ActivePiece = {
      ...this.active,
      cells: this.active.cells,
      px: this.active.px,
      py: this.active.py,
    };
    let dy = 0;
    while (!this.collides(ghost, 0, dy + 1)) dy++;
    return this.absCells(ghost, 0, dy);
  }
}

export function snapshotGrid(g: Grid): Cell[][] {
  return g.cells.map((row) => row.map((c) => ({ ...c })));
}
