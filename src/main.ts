import "./style.css";
import { Battle } from "./ui/battle";
import { Workshop } from "./ui/workshop";
import { LoadoutScreen } from "./ui/loadout";
import { SettingsScreen, settings, saveSettings } from "./ui/settings";
import { OnlineBattle } from "./ui/onlineBattle";
import { ELEMENT_ART_URL, loadElementArt } from "./ui/elementsArt";
import { Splash } from "./ui/splash";
import { TutorialOverlay, hasSeenTutorial } from "./ui/tutorial";
import { TutorialRun } from "./ui/tutorialRun";
import { TutorialSelect } from "./ui/tutorialSelect";
import { TutorialLevel } from "./ui/tutorialLevels";
import { buildLoadoutBags } from "./core/loadout";
import { GameMode } from "./core/engine";
import { AIDifficulty } from "./ai/ai";
import { Element, PieceDef } from "./core/types";

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
    <div class="lobby-topbar">
      <div class="lt-profile"><div class="lt-avatar">🧑</div>
        <div><div class="lt-name">玩家</div><div class="lt-rank">🏆 未定级</div></div></div>
      <div class="lt-currency">◆ <b>0</b> 碎片</div>
    </div>
    <div class="lobby-hero">
      <div class="hero-cube">
        <img src="${ELEMENT_ART_URL[Element.Fire]}"><img src="${ELEMENT_ART_URL[Element.Water]}">
        <img src="${ELEMENT_ART_URL[Element.Wood]}"><img src="${ELEMENT_ART_URL[Element.Life]}">
      </div>
      <h1 class="logo">SUPER<span>CUBE</span></h1>
      <p class="tagline">元素 · 天气 · 相爱相杀</p>
    </div>
    <button class="play-btn" id="m-pvp"><span class="pb-icon">⚔</span> 开始对战</button>
    <div class="lobby-diff">AI 难度
      <button data-d="easy">简单</button>
      <button data-d="normal" class="sel">普通</button>
      <button data-d="hard">困难</button>
    </div>
    <div class="mode-row">
      <button class="mode-tile" id="m-online"><span>🌐</span>在线对战</button>
      <button class="mode-tile" id="m-survival"><span>🛡️</span>生存竞技</button>
      <button class="mode-tile" id="m-timeattack"><span>⏱️</span>限时狂欢</button>
      <button class="mode-tile" id="m-workshop"><span>⚒️</span>源力工坊</button>
      <button class="mode-tile" id="m-tutorial"><span>📖</span>新手教程</button>
      <button class="mode-tile" id="m-settings"><span>⚙️</span>系统设置</button>
    </div>`;
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
