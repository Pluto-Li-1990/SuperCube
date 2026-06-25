import "./style.css";
import { Battle } from "./ui/battle";
import { Workshop } from "./ui/workshop";
import { LoadoutScreen } from "./ui/loadout";
import { SettingsScreen, settings, saveSettings } from "./ui/settings";
import { OnlineBattle } from "./ui/onlineBattle";
import { loadElementArt } from "./ui/elementsArt";
import { Splash } from "./ui/splash";
import { TutorialOverlay, hasSeenTutorial } from "./ui/tutorial";
import { TutorialRun } from "./ui/tutorialRun";
import { TutorialSelect } from "./ui/tutorialSelect";
import { TutorialLevel } from "./ui/tutorialLevels";
import { buildLoadoutBags } from "./core/loadout";
import { GameMode } from "./core/engine";
import { AIDifficulty } from "./ai/ai";
import { PieceDef } from "./core/types";

const app = document.getElementById("app")!;

// 全局保存玩家工坊棋子
let playerBag: PieceDef[] = [];
let workshop: Workshop | null = null;
let battle: Battle | null = null;
let tutorialRun: TutorialRun | null = null;
let difficulty: AIDifficulty = "normal";

function clear(): void {
  if (battle) {
    battle.destroy();
    battle = null;
  }
  if (tutorialRun) {
    tutorialRun.destroy();
    tutorialRun = null;
  }
  app.innerHTML = "";
}

function showLobby(): void {
  clear();
  const wrap = document.createElement("div");
  wrap.className = "lobby";
  wrap.innerHTML = `
    <div class="logo-wrap">
      <h1 class="logo">SUPER<span>CUBE</span></h1>
      <p class="tagline">元素 · 天气 · 相爱相杀的回合俄罗斯方块</p>
    </div>
    <div class="lobby-stats">
      <div><b>${playerBag.length}</b><span>工坊棋子</span></div>
      <div><b>—</b><span>天梯段位</span></div>
      <div><b>0</b><span>源力碎片</span></div>
    </div>
    <div class="lobby-menu">
      <button class="menu-card pvp" id="m-pvp">
        <span class="mc-icon">⚔️</span><span class="mc-title">对战 (vs AI)</span>
        <span class="mc-sub">同屏回合制 · 抢分截胡</span></button>
      <button class="menu-card" id="m-online">
        <span class="mc-icon">🌐</span><span class="mc-title">在线对战</span>
        <span class="mc-sub">真人匹配 · 跨设备</span></button>
      <button class="menu-card" id="m-survival">
        <span class="mc-icon">🛡️</span><span class="mc-title">生存竞技</span>
        <span class="mc-sub">触顶即死</span></button>
      <button class="menu-card" id="m-timeattack">
        <span class="mc-icon">⏱️</span><span class="mc-title">限时狂欢</span>
        <span class="mc-sub">90 秒拼分 · 不死亡</span></button>
      <button class="menu-card" id="m-workshop">
        <span class="mc-icon">⚒️</span><span class="mc-title">源力工坊</span>
        <span class="mc-sub">设计自定义棋子</span></button>
      <button class="menu-card" id="m-settings">
        <span class="mc-icon">⚙️</span><span class="mc-title">系统设置</span>
        <span class="mc-sub">虚影提示 · 下落速度</span></button>
      <button class="menu-card" id="m-tutorial">
        <span class="mc-icon">📖</span><span class="mc-title">新手教程</span>
        <span class="mc-sub">玩法 · 元素 · 天气</span></button>
    </div>
    <div class="lobby-diff">
      AI 难度：
      <button data-d="easy">简单</button>
      <button data-d="normal" class="sel">普通</button>
      <button data-d="hard">困难</button>
    </div>
    <p class="lobby-foot">MVP 原型 · 键盘 ←→↑↓ 空格 / 触屏按钮操作</p>`;
  app.append(wrap);

  document.getElementById("m-pvp")!.onclick = () => startLoadout("shared-turn");
  document.getElementById("m-online")!.onclick = () => startOnline();
  document.getElementById("m-survival")!.onclick = () => startBattle("survival");
  document.getElementById("m-timeattack")!.onclick = () => startBattle("time-attack");
  document.getElementById("m-workshop")!.onclick = () => showWorkshop();
  document.getElementById("m-settings")!.onclick = () => {
    clear();
    new SettingsScreen(app, showLobby);
  };
  document.getElementById("m-tutorial")!.onclick = () => {
    showTutorialSelect();
  };
  wrap.querySelectorAll(".lobby-diff button").forEach((b) => {
    (b as HTMLElement).onclick = () => {
      difficulty = (b as HTMLElement).dataset.d as AIDifficulty;
      wrap.querySelectorAll(".lobby-diff button").forEach((x) => x.classList.remove("sel"));
      b.classList.add("sel");
    };
  });
}

function showTutorialSelect(): void {
  clear();
  new TutorialSelect(app, {
    onBack: showLobby,
    onStart: startTutorialLevel,
  });
}

function startTutorialLevel(level: TutorialLevel): void {
  clear();
  tutorialRun = new TutorialRun(app, level, {
    onExit: showTutorialSelect,
    onNext: startTutorialLevel,
  });
}

function startLoadout(mode: GameMode): void {
  clear();
  new LoadoutScreen(
    app,
    playerBag,
    (result) => {
      const { selfExtra, oppExtra } = buildLoadoutBags(playerBag, result.choice);
      startBattle(mode, selfExtra, oppExtra);
    },
    showLobby,
  );
}

function startOnline(): void {
  const def = settings.serverUrl || "wss://";
  const url = window.prompt("输入联网服务器地址（部署服务器后填，如 wss://你的域名）", def);
  if (!url || url === "wss://") return;
  settings.serverUrl = url;
  saveSettings();
  clear();
  new OnlineBattle(app, { serverUrl: url, name: "玩家", playerBag, onExit: showLobby });
}

function startBattle(mode: GameMode, playerBagOverride?: PieceDef[], aiBag?: PieceDef[]): void {
  clear();
  battle = new Battle(app, {
    mode,
    difficulty,
    playerBag: playerBagOverride ?? playerBag,
    aiBag,
    onExit: showLobby,
  });
}

function showWorkshop(): void {
  clear();
  const back = document.createElement("button");
  back.className = "ws-back";
  back.textContent = "‹ 返回大厅";
  back.onclick = showLobby;
  app.append(back);
  const wsRoot = document.createElement("div");
  app.append(wsRoot);
  workshop = new Workshop(wsRoot, () => {
    playerBag = workshop!.getShelf();
  });
  // 恢复已有棋子（重新进入工坊保留）
  if (playerBag.length) {
    // 简易恢复：把已存在的 bag 作为 shelf 起点
    (workshop as unknown as { shelf: PieceDef[] }).shelf = [...playerBag];
    (workshop as unknown as { renderShelf: () => void })["renderShelf"]?.();
  }
}

loadElementArt();
new Splash(app, () => {
  showLobby();
  if (!hasSeenTutorial()) new TutorialOverlay(() => {});
});
