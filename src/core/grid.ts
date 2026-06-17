import { Cell, Element, PlayerId, emptyCell, isEmpty, makeCell } from "./types";

export const GRID_W = 10;
export const GRID_H = 20;

export class Grid {
  w: number;
  h: number;
  cells: Cell[][]; // [y][x], y=0 顶部

  constructor(w = GRID_W, h = GRID_H) {
    this.w = w;
    this.h = h;
    this.cells = [];
    for (let y = 0; y < h; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < w; x++) row.push(emptyCell());
      this.cells.push(row);
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }

  get(x: number, y: number): Cell {
    return this.cells[y][x];
  }

  set(x: number, y: number, c: Cell): void {
    this.cells[y][x] = c;
  }

  isOccupied(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return true; // 出界视为占用（墙）
    return !isEmpty(this.cells[y][x]);
  }

  clearCell(x: number, y: number): void {
    this.cells[y][x] = emptyCell();
  }

  setElement(x: number, y: number, el: Element, owner: PlayerId | null = null): void {
    this.cells[y][x] = makeCell(el, owner);
  }

  // 重力：所有非空、非粘粘悬停的格子向下沉。
  // 返回是否发生了移动（用于连锁判定）。
  // 注意：粘粘块一旦落地/粘住即固定，这里把整盘当作静态地形做整体重力。
  applyGravity(): boolean {
    let moved = false;
    for (let x = 0; x < this.w; x++) {
      let writeY = this.h - 1;
      for (let y = this.h - 1; y >= 0; y--) {
        const c = this.cells[y][x];
        if (!isEmpty(c)) {
          if (writeY !== y) {
            this.cells[writeY][x] = c;
            this.cells[y][x] = emptyCell();
            moved = true;
          }
          writeY--;
        }
      }
    }
    return moved;
  }

  // 找出所有填满的行
  fullRows(): number[] {
    const rows: number[] = [];
    for (let y = 0; y < this.h; y++) {
      let full = true;
      for (let x = 0; x < this.w; x++) {
        if (isEmpty(this.cells[y][x])) {
          full = false;
          break;
        }
      }
      if (full) rows.push(y);
    }
    return rows;
  }

  // 删除指定行并让上方下落
  removeRows(rows: number[]): void {
    const remove = new Set(rows);
    const newRows: Cell[][] = [];
    for (let y = 0; y < this.h; y++) {
      if (!remove.has(y)) newRows.push(this.cells[y]);
    }
    while (newRows.length < this.h) {
      const empty: Cell[] = [];
      for (let x = 0; x < this.w; x++) empty.push(emptyCell());
      newRows.unshift(empty);
    }
    this.cells = newRows;
  }

  // 顶部若有方块 = 触顶（生存模式判负）
  isToppedOut(): boolean {
    for (let x = 0; x < this.w; x++) {
      if (!isEmpty(this.cells[0][x])) return true;
    }
    return false;
  }

  // 四方向相邻坐标
  static neighbors4(x: number, y: number): [number, number][] {
    return [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
  }

  clone(): Grid {
    const g = new Grid(this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        g.cells[y][x] = { ...this.cells[y][x] };
      }
    }
    return g;
  }

  // 统计某元素在盘面上的数量
  countElement(el: Element): number {
    let n = 0;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) if (this.cells[y][x].element === el) n++;
    return n;
  }
}
