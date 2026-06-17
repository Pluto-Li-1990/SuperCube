# SuperCube 多 Agent 编排框架

> 角色定位：**我（Claude）= 总集成 / 架构 / 验收**；各 Agent = 在隔离分支上干活的工人。
> 铁律：任何 Agent 的产出 **必须通过 `npm run typecheck && npm test` 才允许合并**；`core/`（引擎/反应/计分）为单一所有者，禁止并行深改。

## 0. 协作骨架（前置，必须先做）

多方（我的子 Agent + 你的 Codex）要共享同一份代码，需要一个 **git 远程仓库** 当中枢：

- 初始化 git，推到 **GitHub 私有仓库**（你的账号）。
- 我的子 Agent 用 **git worktree** 各开一份隔离副本，互不覆盖，干完发 PR/分支。
- Codex 在你机器上 clone 同一仓库，按规格在自己分支干活，推上来。
- 我负责 review + 合并 + 跑全套测试 + 出可玩构建。

**你要解决的资源：** 一个 GitHub 账号 + 建一个私有仓库（或授权我用 `gh` 建）。这是唯一的硬前置。

## 1. Agent 花名册与分工

| 编号 | 任务 | 用谁 | 调用方式 | 耦合度 | 依赖 |
|---|---|---|---|---|---|
| **W1** | 限时狂欢模式 + 生存竞技完善 | 我的子 Agent（claude） | `Agent(worktree)` | 低 | core 稳定 |
| **W2** | Loadout 15 秒暗牌博弈（Buff/Debuff 塞牌） | 我的子 Agent（claude） | `Agent(worktree)` | 低 | core 稳定 |
| **W3** | 联网 PVP + 匹配服务器（Node+WebSocket，独立服务） | **Codex**（你跑） | 我出接口契约+验收测试，你派给 Codex | 隔离 | 接口契约 |
| **W4** | 美术/音效 + Capacitor 打包 iOS/Android | 我的子 Agent（claude）+ 图像生成 | `Agent(worktree)` | 零 | 美术风格定调 |
| **W5** | 肉鸽 PVE（守门员词条 + 变异遗物 + 源力碎片养成） | 我的子 Agent（claude） | `Agent(worktree)` | 中（数据驱动） | core 稳定 |
| **R0** | 元素反应矩阵精确化（按 GDD 逐条补 RNG/延时细节） | 我自己，串行 | 直接做 | 极高 | 无（最先做） |
| **QA** | 每个 PR 的代码审查 + 安全审查 | 我的子 Agent（Explore/review） | `Agent` 或 `/review` | — | 每次合并前 |

## 2. 执行波次（先后顺序）

- **第 0 波（我串行）**：搭好 git/GitHub 骨架；做 R0 把 `core/` 接口冻结成稳定契约（其他人才好并行）。
- **第 1 波（并行）**：W1、W2、W4 同时开 worktree；W3 的接口契约交给你 → Codex。
- **第 2 波**：W5（PVE），以及 W3 服务器联调进客户端。
- **持续**：QA 在每次合并前跑。

## 3. 我怎么调用我的子 Agent

```
Agent(
  subagent_type: "claude",
  isolation: "worktree",          // 各自隔离副本，干完自动清理/合并
  description: "限时狂欢模式",
  prompt: "<任务规格 + 接口约束 + 验收：npm run typecheck && npm test 全绿>"
)
```
我会给每个子 Agent 配死：要改哪些文件、不许碰 `core/` 哪些、必须新增哪些测试、验收命令。收回产出后由我集成。

## 4. 我怎么把活交给 Codex（W3）

我产出一份 `docs/NETCODE_CONTRACT.md`：消息协议（JSON schema）、房间/匹配状态机、与现有 `engine.ts` 的对接接口、以及一套验收测试（你让 Codex 跑通即视为达标）。你把这份文件 + 仓库给 Codex 即可，它独立交付 `server/` 目录，不碰客户端 `core/`。

## 5. 你需要配合/提供的资源清单

1. **GitHub 私有仓库**（硬前置，W3 协作的基础）。
2. **美术风格定调**（W4）：霓虹电竞风 / 极简清新 / 像素复古——选一个，或授权我用图像生成先出方案。
3. **服务器托管**（W3 上线时）：一台小 VPS 或 Railway/Fly.io 之类；MVP 阶段本地即可，先不用。
4. **App 上架账号**（最后阶段）：Apple Developer / Google Play，仅打包上架时需要。
5. **优先级拍板**：先联网（W3）还是先把单机内容做厚（W1/W2/W5）。

## 6. 质量门（不可绕过）

- 合并前：`npm run typecheck` 零错 + `npm test` 全绿 + 我做一次集成 smoke（AI 自对弈压测 + headless 渲染抽查）。
- 每个新模块必须带自己的单元测试。
- `core/` 任何改动我亲自 review。
