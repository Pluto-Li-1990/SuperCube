import { settings } from "./settings";

// 纯程序化音效（Web Audio），无需音频文件
class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmTimer: ReturnType<typeof setInterval> | null = null;
  private bgmStep = 0;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  // 浏览器自动播放策略：首次用户交互后恢复
  resume(): void {
    const ctx = this.ensure();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  private tone(
    freq: number,
    dur: number,
    opts: { type?: OscillatorType; gain?: number; slideTo?: number; delay?: number } = {},
  ): void {
    if (!settings.sfx) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
    const peak = opts.gain ?? 0.3;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  move(): void {
    this.tone(220, 0.05, { type: "square", gain: 0.12 });
  }
  rotate(): void {
    this.tone(440, 0.06, { type: "triangle", gain: 0.16, slideTo: 560 });
  }
  lock(): void {
    this.tone(160, 0.12, { type: "sine", gain: 0.3, slideTo: 90 });
  }
  reaction(): void {
    this.tone(700, 0.18, { type: "sawtooth", gain: 0.14, slideTo: 1400 });
  }
  // 消除：行数越多越激昂的上行琶音
  clear(lines: number): void {
    const notes = [523, 659, 784, 988, 1319];
    const n = Math.min(lines + 1, notes.length);
    for (let i = 0; i < n; i++) {
      this.tone(notes[i], 0.16, { type: "triangle", gain: 0.26, delay: i * 0.06 });
    }
  }
  ancient(): void {
    const chord = [392, 523, 659, 784, 1047];
    chord.forEach((f, i) => this.tone(f, 0.8, { type: "sine", gain: 0.3, delay: i * 0.08 }));
  }
  gameOver(win: boolean): void {
    if (win) {
      [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, { type: "triangle", gain: 0.3, delay: i * 0.12 }));
    } else {
      [392, 311, 233].forEach((f, i) => this.tone(f, 0.35, { type: "sawtooth", gain: 0.25, delay: i * 0.15 }));
    }
  }

  // ===== 背景音乐：极简循环琶音（可开关，默认关）=====
  startBgm(): void {
    if (this.bgmTimer || typeof window === "undefined") return;
    const seq = [261, 392, 523, 392, 329, 392, 440, 392];
    this.bgmTimer = setInterval(() => {
      if (!settings.bgm) return;
      const f = seq[this.bgmStep % seq.length];
      this.bgmStep++;
      this.tone(f, 0.5, { type: "sine", gain: 0.06 });
      this.tone(f / 2, 0.5, { type: "triangle", gain: 0.04 });
    }, 420);
  }
  stopBgm(): void {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
  syncBgm(): void {
    if (settings.bgm) this.startBgm();
    else this.stopBgm();
  }
}

export const audio = new AudioManager();
