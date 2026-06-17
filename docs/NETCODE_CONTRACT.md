# SuperCube 联网服务器 接口契约（给 Codex 的任务规格）

> 收件人：Codex。本文件是你的**唯一需求来源**。请严格按协议实现，独立交付 `server/` 目录，**不要修改客户端 `src/core/`、`src/ui/`、`src/ai/` 任何文件**。
> 验收标准：本文件第 7 节的全部测试通过，且 `cd server && npm test` 全绿。

## 1. 目标

为「同屏回合制对战」提供两名真人玩家的在线匹配与对局同步。采用**锁步同步（lockstep）**：

- 客户端引擎已是**确定性**的（`src/core/rng.ts` 可种子化，`src/core/engine.ts` 接受 `seed`）。
- 因此服务器**不需要重跑游戏逻辑**，只需：撮合两名玩家 → 分配同一个 `seed` 与先后手 → 转发每名玩家的"回合提交" → 双方各自用相同输入+相同种子模拟出**完全一致**的棋盘。
- 这样带宽极低（每回合只传几个整数），且作弊空间小。

## 2. 技术栈与目录（硬性要求）

- Node.js + TypeScript + `ws`（WebSocket）。
- 全部代码在仓库根的 `server/` 目录，**自带** `server/package.json`、`server/tsconfig.json`、`server/tests/`。
- 测试用 `vitest`。`server/package.json` 提供 `npm test`、`npm run build`、`npm start`。
- 不引入数据库（MVP 用内存态即可）。不碰客户端目录。

## 3. 连接与消息协议（JSON over WebSocket）

WebSocket 端点：`ws://<host>:8090`。所有消息为 JSON，含 `type` 字段。客户端→服务器（C2S）与服务器→客户端（S2C）如下。

### C2S
| type | 字段 | 说明 |
|---|---|---|
| `queue` | `{ name: string, bag?: PieceDefDTO[] }` | 进入匹配队列。`bag` 为玩家工坊棋子（见 §4），可空。 |
| `cancelQueue` | `{}` | 取消匹配。 |
| `turn` | `{ matchId: string, turnIndex: number, move: MoveDTO }` | 提交本回合操作（见 §4）。 |
| `leave` | `{ matchId: string }` | 主动离开对局（判负）。 |
| `ping` | `{ t: number }` | 心跳。 |

### S2C
| type | 字段 | 说明 |
|---|---|---|
| `queued` | `{}` | 已入队确认。 |
| `matchFound` | `{ matchId, seed: number, you: "A"\|"B", opponent: { name }, bags: { A: PieceDefDTO[], B: PieceDefDTO[] } }` | 撮合成功，下发种子/先后手/双方牌库。 |
| `turn` | `{ matchId, turnIndex, by: "A"\|"B", move: MoveDTO }` | 转发对手（或回显本人）的回合操作。 |
| `opponentLeft` | `{ matchId }` | 对手掉线/离开，本方判胜。 |
| `pong` | `{ t: number }` | 心跳回应。 |
| `error` | `{ code: string, message: string }` | 错误。 |

**回合推进规则**：A 先手（`turnIndex` 从 0 开始，偶数=A、奇数=B）。服务器须校验 `turn.by` 与 `turnIndex` 的奇偶一致、且 `turnIndex` 等于该对局期望的下一个回合号；不一致回 `error{code:"OUT_OF_ORDER"}`。服务器将合法 `turn` 广播给**对局内双方**（含发送者，用于确认）。

## 4. 数据传输对象（DTO，必须与客户端一致）

这些结构镜像客户端类型，**字段名不可改**（客户端将据此重放）：

```ts
// 一个回合的操作：客户端据此在自己引擎上重放
interface MoveDTO {
  rotation: number;   // 旋转次数 0..3
  px: number;         // 目标列锚点（左上）
  hardDrop: true;     // MVP 固定硬降落子
}

// 自定义棋子（玩家工坊产物），用于下发牌库
interface PieceDefDTO {
  id: string;
  name: string;
  custom: boolean;
  cells: { x: number; y: number; element: number }[]; // element 为枚举数值
}
```

> 注：天气、元素反应、计分都由客户端确定性引擎从 `seed` 推出，**不走网络**。服务器只管撮合 + 转发 `MoveDTO`。

## 5. 匹配状态机（服务器内存态）

```
玩家连接 → IDLE
  收到 queue        → WAITING（进队列）
  队列≥2            → 取队首两人 → 生成 matchId + 随机 seed + 指派 A/B → 双方 PLAYING，各发 matchFound
PLAYING
  收到合法 turn      → 广播给双方，期望回合号 +1
  收到 leave/掉线    → 对手收 opponentLeft，对局结束，双方回 IDLE
```

- `seed`：32 位无符号随机整数（与客户端 `RNG` 一致即可）。
- 同一连接同时只在一个对局中。
- 断线检测：心跳超时（如 15s 无 ping）视为掉线。

## 6. 与客户端的对接边界（仅供你理解，不需你实现客户端）

客户端会新增一个 `src/net/NetClient.ts`（**由我方实现**）封装这些消息；你只需保证服务器**严格符合 §3/§4 协议**。重放逻辑：客户端收到 `matchFound` 后用 `new Game({ seed, ... })` 起局；每收到一条 `turn` 就在本地引擎上应用 `rotation/px` 后 `commitTurn()`。

## 7. 验收测试（必须全部通过）

在 `server/tests/` 实现并通过：

1. **匹配撮合**：两个模拟客户端先后 `queue`，都应收到 `matchFound`，且 `seed` 相同、`you` 一个为 A 一个为 B、`bags` 正确回传。
2. **先后手与顺序**：A 发 `turnIndex:0` 合法并被广播；B 抢发 `turnIndex:0`（错误奇偶）应收 `error{OUT_OF_ORDER}`；正常交替 0,1,2,3... 均广播成功。
3. **转发一致性**：A 提交的 `move` 被原样广播给 B（字段不变）。
4. **掉线判定**：A 断开后，B 收到 `opponentLeft{matchId}`。
5. **取消匹配**：`queue` 后 `cancelQueue`，再有人入队不会与其错误配对。
6. **压力**：连续撮合 50 对、各跑 20 回合转发，无崩溃、无串号（可用模拟内存 WebSocket）。

## 8. 交付方式

1. 在分支 `feat/netcode` 上开发。
2. 完成后 `git push origin feat/netcode`，发起 PR 到 `main`。
3. 我方 review：跑 `cd server && npm install && npm test`，并与客户端做一次本地联调（两个浏览器对一局）。通过后合并。

## 9. 不要做的事

- 不改 `src/` 下任何客户端代码（如需客户端配合，在 PR 描述里写清需求，由我方做）。
- 不引入数据库、账号系统、付费——超出 MVP 范围。
- 不改游戏规则/计分/反应——这些是客户端引擎的职责。
