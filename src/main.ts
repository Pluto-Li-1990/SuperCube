import "./style.css";
import { Battle } from "./ui/battle";
import { Workshop } from "./ui/workshop";
import { GameMode } from "./core/engine";
import { AIDifficulty } from "./ai/ai";
import { PieceDef } from "./core/types";

const app = document.getElementById("app")!;

// 全局保存玩家工坊棋子
let playerBag: PieceDef[] = [];
let workshop: Workshop | null = null;
let battle: Battle | null = null;
let difficulty: AIDifficulty = "normal";

function clear(): void {
  if (battle) {
    battle.destroy();
    battle = null;
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
      <button class="menu-card" id="m-survival">
        <span class="mc-icon">🛡️</span><span class="mc-title">生存竞技</span>
        <span class="mc-sub">触顶即死</span></button>
      <button class="menu-card" id="m-workshop">
        <span class="mc-icon">⚒️</span><span class="mc-title">源力工坊</span>
        <span class="mc-sub">设计自定义棋子</span></button>
    </div>
    <div class="lobby-diff">
      AI 难度：
      <button data-d="easy">简单</button>
      <button data-d="normal" class="sel">普通</button>
      <button data-d="hard">困难</button>
    </div>
    <p class="lobby-foot">MVP 原型 · 键盘 ←→↑↓ 空格 / 触屏按钮操作</p>`;
  app.append(wrap);

  document.getElementById("m-pvp")!.onclick = () => startBattle("shared-turn");
  document.getElementById("m-survival")!.onclick = () => startBattle("survival");
  document.getElementById("m-workshop")!.onclick = () => showWorkshop();
  wrap.querySelectorAll(".lobby-diff button").forEach((b) => {
    (b as HTMLElement).onclick = () => {
      difficulty = (b as HTMLElement).dataset.d as AIDifficulty;
      wrap.querySelectorAll(".lobby-diff button").forEach((x) => x.classList.remove("sel"));
      b.classList.add("sel");
    };
  });
}

function startBattle(mode: GameMode): void {
  clear();
  battle = new Battle(app, {
    mode,
    difficulty,
    playerBag,
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

showLobby();
