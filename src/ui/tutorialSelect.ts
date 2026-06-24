import { TutorialOverlay } from "./tutorial";
import { LEVELS, TutorialLevel } from "./tutorialLevels";

const PROGRESS_KEY = "supercube.tutorialProgress";

export function getTutorialProgress(): number {
  try {
    return Number(localStorage.getItem(PROGRESS_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}

export function markTutorialLevelComplete(id: number): void {
  try {
    localStorage.setItem(PROGRESS_KEY, String(Math.max(getTutorialProgress(), id)));
  } catch {
    /* 忽略 */
  }
}

export class TutorialSelect {
  constructor(
    private root: HTMLElement,
    private opts: { onStart: (level: TutorialLevel) => void; onBack: () => void },
  ) {
    this.render();
  }

  private render(): void {
    const progress = getTutorialProgress();
    this.root.innerHTML = `
      <div class="tutorial-select">
        <div class="tselect-top">
          <button class="btn-exit" id="ts-back">‹ 大厅</button>
          <div>
            <h2>教学关卡</h2>
            <p>按脚本练习落子、消除和元素反应</p>
          </div>
        </div>
        <div class="tselect-list">
          ${LEVELS.map((level) => `
            <button class="tselect-card" data-level="${level.id}">
              <span class="tselect-check">${level.id <= progress ? "✓" : level.id}</span>
              <span class="tselect-title">${level.title}</span>
              <span class="tselect-goal">${level.goalText}</span>
            </button>
          `).join("")}
        </div>
        <button class="tselect-help" id="ts-help">玩法说明</button>
      </div>`;

    (this.root.querySelector("#ts-back") as HTMLElement).onclick = this.opts.onBack;
    (this.root.querySelector("#ts-help") as HTMLElement).onclick = () => new TutorialOverlay(() => {});
    this.root.querySelectorAll(".tselect-card").forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const id = Number((btn as HTMLElement).dataset.level);
        const level = LEVELS.find((item) => item.id === id);
        if (level) this.opts.onStart(level);
      };
    });
  }
}
