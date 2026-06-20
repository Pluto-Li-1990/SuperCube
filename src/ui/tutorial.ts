// 新手教程浮层：分页讲解玩法

interface TutorialStep {
  icon: string;
  title: string;
  body: string;
}

const STEPS: TutorialStep[] = [
  {
    icon: "🎯",
    title: "目标：抢分",
    body: "双方在同一个 10×20 棋盘上轮流落子。谁的落子触发整行消除，分数就归谁——核心就是抢分与截胡。",
  },
  {
    icon: "🕹️",
    title: "操作",
    body: "手指按住下落的棋子左右拖动到目标列；轻点棋盘旋转棋子；向下滑动直接落子。也可用底部按钮或键盘 ←→↑ 空格。",
  },
  {
    icon: "🧪",
    title: "元素反应",
    body: "方块有火/水/木/金属/冰/粘粘/生命等属性。相邻（边对边）会触发化学反应，多数延时 3 回合：火烧木、水+电金属爆炸、水催生木……方块上的数字是反应倒计时。注意：元素反应本身不得分，只改地形和坑人！",
  },
  {
    icon: "⛅",
    title: "天气系统",
    body: "每 5 回合换一次天气：晴/雨/雪/雷暴/火山，各有意外效果。右上角有天气预报，但和真实天气一样——有概率报错坑你。",
  },
  {
    icon: "⚒️",
    title: "源力工坊",
    body: "你可以自己设计棋子：4×4 画布、最多 4 块、每块之间至少一个角相连（可斜角）。铸造后会进入你的对战牌库，还能在赛前塞给对手当 Debuff。",
  },
  {
    icon: "🏆",
    title: "计分",
    body: "消除越多分越高：1/2/4/8 行 = 1/2/4/8 分（指数级）；消除后重力掉落再次凑齐有 ×2/×4 连锁翻倍。集齐 5 个生命方块存活数回合，触发远古生命清屏、海量积分！",
  },
];

const SEEN_KEY = "supercube.seenTutorial";

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export class TutorialOverlay {
  private idx = 0;
  private root: HTMLElement;
  private onClose: () => void;

  constructor(onClose: () => void) {
    this.onClose = onClose;
    this.root = document.createElement("div");
    this.root.className = "tut-overlay";
    document.body.appendChild(this.root);
    this.render();
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* 忽略 */
    }
  }

  private render(): void {
    const s = STEPS[this.idx];
    const last = this.idx === STEPS.length - 1;
    this.root.innerHTML = `
      <div class="tut-card">
        <div class="tut-icon">${s.icon}</div>
        <h2 class="tut-title">${s.title}</h2>
        <p class="tut-body">${s.body}</p>
        <div class="tut-dots">${STEPS.map((_, i) => `<i class="${i === this.idx ? "on" : ""}"></i>`).join("")}</div>
        <div class="tut-btns">
          <button class="tut-skip" id="tut-skip">跳过</button>
          ${this.idx > 0 ? `<button class="tut-back" id="tut-back">上一步</button>` : ""}
          <button class="tut-next" id="tut-next">${last ? "开始游戏" : "下一步"}</button>
        </div>
      </div>`;
    const next = this.root.querySelector("#tut-next") as HTMLElement;
    next.onclick = () => {
      if (last) this.close();
      else {
        this.idx++;
        this.render();
      }
    };
    (this.root.querySelector("#tut-skip") as HTMLElement).onclick = () => this.close();
    const back = this.root.querySelector("#tut-back") as HTMLElement | null;
    if (back) back.onclick = () => {
      this.idx--;
      this.render();
    };
  }

  private close(): void {
    this.root.remove();
    this.onClose();
  }
}
