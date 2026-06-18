import { PieceDef, ELEMENT_NAMES, Element } from "../core/types";
import { STANDARD_PIECES } from "../core/pieces";
import {
  presetDebuffPieces,
  LoadoutChoice,
  LOADOUT_SECONDS,
} from "../core/loadout";
import { ELEMENT_COLORS } from "./colors";

// 渲染一枚棋子为 4x4 小色块网格
function miniPiece(p: PieceDef): HTMLElement {
  const map = new Map<string, Element>();
  for (const c of p.cells) map.set(`${c.x},${c.y}`, c.element);
  const el = document.createElement("div");
  el.className = "lo-mini";
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const e = map.get(`${x},${y}`);
      const i = document.createElement("i");
      if (e !== undefined) {
        i.style.background = ELEMENT_COLORS[e];
        i.title = ELEMENT_NAMES[e];
      }
      el.append(i);
    }
  return el;
}

export interface LoadoutResult {
  choice: LoadoutChoice;
}

// 15 秒暗牌博弈界面；超时自动以当前选择确认
export class LoadoutScreen {
  root: HTMLElement;
  shelf: PieceDef[];
  onDone: (r: LoadoutResult) => void;
  onCancel: () => void;
  selfBuff: PieceDef | null = null;
  oppDebuff: PieceDef | null = null;
  remain = LOADOUT_SECONDS;
  timer?: ReturnType<typeof setInterval>;

  constructor(
    root: HTMLElement,
    shelf: PieceDef[],
    onDone: (r: LoadoutResult) => void,
    onCancel: () => void,
  ) {
    this.root = root;
    this.shelf = shelf;
    this.onDone = onDone;
    this.onCancel = onCancel;
    this.build();
    this.startCountdown();
  }

  private selfOptions(): PieceDef[] {
    // 自己可选：工坊棋子 + 传统棋子
    return [...this.shelf, ...STANDARD_PIECES];
  }

  private build(): void {
    this.root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "loadout-wrap";
    wrap.innerHTML = `
      <div class="lo-top">
        <button class="btn-exit" id="lo-exit">‹ 取消</button>
        <div class="lo-title">赛前暗牌博弈</div>
        <div class="lo-timer" id="lo-timer">${this.remain}s</div>
      </div>
      <p class="lo-sub">15 秒内下注：给自己加一枚顺手棋子（Buff），给对手塞一枚刁钻棋子（Debuff）。超时按当前选择开战。</p>
      <div class="lo-cols">
        <div class="lo-col buff">
          <h3>🟢 给自己 · Buff</h3>
          <div class="lo-list" id="lo-self"></div>
        </div>
        <div class="lo-col debuff">
          <h3>🔴 给对手 · Debuff</h3>
          <div class="lo-list" id="lo-opp"></div>
        </div>
      </div>
      <button class="lo-go" id="lo-go">⚔ 开战</button>`;
    this.root.append(wrap);

    const selfList = wrap.querySelector("#lo-self")!;
    this.selfOptions().forEach((p) => {
      selfList.append(this.optionCard(p, "self"));
    });
    const oppList = wrap.querySelector("#lo-opp")!;
    presetDebuffPieces().forEach((p) => {
      oppList.append(this.optionCard(p, "opp"));
    });

    wrap.querySelector("#lo-exit")!.addEventListener("click", () => {
      this.cleanup();
      this.onCancel();
    });
    wrap.querySelector("#lo-go")!.addEventListener("click", () => this.confirm());
  }

  private optionCard(p: PieceDef, side: "self" | "opp"): HTMLElement {
    const card = document.createElement("button");
    card.className = "lo-card";
    card.append(miniPiece(p));
    const label = document.createElement("span");
    label.textContent = p.name;
    card.append(label);
    card.addEventListener("click", () => {
      if (side === "self") this.selfBuff = this.selfBuff?.id === p.id ? null : p;
      else this.oppDebuff = this.oppDebuff?.id === p.id ? null : p;
      this.refreshSelection();
    });
    card.dataset.pid = p.id;
    card.dataset.side = side;
    return card;
  }

  private refreshSelection(): void {
    this.root.querySelectorAll(".lo-card").forEach((c) => {
      const el = c as HTMLElement;
      const sel =
        (el.dataset.side === "self" && this.selfBuff?.id === el.dataset.pid) ||
        (el.dataset.side === "opp" && this.oppDebuff?.id === el.dataset.pid);
      el.classList.toggle("sel", !!sel);
    });
  }

  private startCountdown(): void {
    this.timer = setInterval(() => {
      this.remain--;
      const t = document.getElementById("lo-timer");
      if (t) t.textContent = `${this.remain}s`;
      if (this.remain <= 0) this.confirm();
    }, 1000);
  }

  private confirm(): void {
    this.cleanup();
    this.onDone({ choice: { selfBuff: this.selfBuff, oppDebuff: this.oppDebuff } });
  }

  private cleanup(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}
