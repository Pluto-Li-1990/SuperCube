// 可种子化的伪随机数生成器 (mulberry32)，保证测试 / 回放可复现

export class RNG {
  private state: number;

  constructor(seed = 12345) {
    this.state = seed >>> 0;
  }

  // [0,1)
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // [0,n)
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  pick<T>(arr: T[]): T {
    return arr[this.int(arr.length)];
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}
