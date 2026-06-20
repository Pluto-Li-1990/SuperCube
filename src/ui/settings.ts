import { audio } from "./audio";

// 全局设置（带 localStorage 持久化）

export interface GameSettings {
  ghost: boolean; // 落点虚影提示
  fallMs: number; // 自动下落间隔(ms)，越小越快
  sfx: boolean; // 音效
  bgm: boolean; // 背景音乐
  serverUrl: string; // 联网服务器地址
}

const KEY = "supercube.settings";

const DEFAULTS: GameSettings = {
  ghost: false, // 默认关闭虚影（玩家反馈干扰）
  fallMs: 800,
  sfx: true,
  bgm: false,
  serverUrl: "",
};

function load(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* localStorage 不可用时回退默认 */
  }
  return { ...DEFAULTS };
}

export const settings: GameSettings = load();

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* 忽略写入失败 */
  }
}

const SPEED_PRESETS: { label: string; ms: number }[] = [
  { label: "慢", ms: 1100 },
  { label: "中", ms: 800 },
  { label: "快", ms: 500 },
];

// 系统设置界面
export class SettingsScreen {
  constructor(root: HTMLElement, onBack: () => void) {
    root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "settings-wrap";
    wrap.innerHTML = `
      <div class="set-top">
        <button class="btn-exit" id="set-back">‹ 大厅</button>
        <h2>系统设置</h2>
      </div>`;

    // 落点虚影开关
    wrap.append(
      toggleRow("落点虚影提示", "显示棋子落到底部的半透明预览", settings.ghost, (v) => {
        settings.ghost = v;
        saveSettings();
      }),
    );

    // 音效开关
    wrap.append(
      toggleRow("音效", "落子、消除、元素反应的音效", settings.sfx, (v) => {
        settings.sfx = v;
        saveSettings();
      }),
    );

    // 背景音乐开关
    wrap.append(
      toggleRow("背景音乐", "轻量循环背景旋律", settings.bgm, (v) => {
        settings.bgm = v;
        saveSettings();
        audio.syncBgm();
      }),
    );

    // 下落速度
    const speedRow = document.createElement("div");
    speedRow.className = "set-row";
    speedRow.innerHTML = `<div class="set-label"><b>下落速度</b><span>方块自动下落的快慢</span></div>`;
    const seg = document.createElement("div");
    seg.className = "set-seg";
    SPEED_PRESETS.forEach((p) => {
      const b = document.createElement("button");
      b.textContent = p.label;
      b.classList.toggle("sel", settings.fallMs === p.ms);
      b.onclick = () => {
        settings.fallMs = p.ms;
        saveSettings();
        seg.querySelectorAll("button").forEach((x) => x.classList.remove("sel"));
        b.classList.add("sel");
      };
      seg.append(b);
    });
    speedRow.append(seg);
    wrap.append(speedRow);

    root.append(wrap);
    document.getElementById("set-back")!.onclick = onBack;
  }
}

function toggleRow(
  title: string,
  desc: string,
  initial: boolean,
  onChange: (v: boolean) => void,
): HTMLElement {
  const row = document.createElement("div");
  row.className = "set-row";
  const label = document.createElement("div");
  label.className = "set-label";
  label.innerHTML = `<b>${title}</b><span>${desc}</span>`;
  const sw = document.createElement("button");
  sw.className = "set-switch" + (initial ? " on" : "");
  sw.setAttribute("role", "switch");
  sw.setAttribute("aria-checked", String(initial));
  sw.innerHTML = `<i></i>`;
  let state = initial;
  sw.onclick = () => {
    state = !state;
    sw.classList.toggle("on", state);
    sw.setAttribute("aria-checked", String(state));
    onChange(state);
  };
  row.append(label, sw);
  return row;
}
