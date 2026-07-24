# SuperCube 服务器与上线部署方案

更新时间：2026-07-24

## 当前结论

当前 iOS App 是一个原生 WKWebView 壳，优先加载打包进 App 的本地网页资源；在线对战服务器是另一层，只在玩家进入在线匹配、建房、同步回合时需要。

`server/` 已恢复到当前 iOS 仓库，包含 Node + TypeScript + `ws` 联网服务器、`/healthz` 健康检查、生产构建脚本和联网测试。当前已部署到阿里云香港 ECS 临时节点，域名为 `wss://match.supercubegame.com`，用于 TestFlight 在线对战内测；北京 ECS 等待 ICP 备案后再作为国内节点评估。

## 风险

1. 香港 ECS 是过渡测试节点，需要继续观察稳定性、带宽、日志和证书续期。
2. 北京 ECS 仍需等待 ICP 备案，备案通过前不能作为国内公网对战域名使用。
3. Vercel 适合托管静态网页前端，但不适合作为长期运行的权威 WebSocket 对战服务器。
4. 当前账号系统只做 Apple 登录与游客身份，Google/微信/邮箱登录应等首轮联网实测稳定后再加。

## 建议架构

### 1. 前端网页

保留一个专门的 Web 前端部署源，不要再依赖 iOS-only 的 `main`。

建议二选一：

- 建立 `web-production` 分支，保存可构建的网页游戏源码，并让 Vercel 只监听该分支；
- 或建立独立仓库 `SuperCube-Web`，专门用于网页前端和 Vercel 部署。

前端继续负责：

- 大厅、教学、工坊、单机玩法；
- 加载静态资源；
- 连接在线对战服务器；
- 展示在线匹配失败、服务器维护、版本不兼容等提示。

### 2. iOS App

iOS App 继续保持轻量：

- 默认加载稳定的线上前端 URL；
- 补一个离线兜底页面或打包版 Web 资源；
- 加载失败时显示明确错误和重试，不再纯黑屏；
- 上架前固定版本号、Bundle ID、隐私政策 URL 和 TestFlight 信息。

### 3. 实时对战服务器

在线对战应使用独立的 Node + TypeScript + `ws` 服务，部署到支持长连接的云服务器。

推荐优先级：

1. Render / Fly.io / Railway：最快能上线测试，支持常驻 Node 进程和 WebSocket；
2. DigitalOcean / Lightsail / 云服务器：控制力更强，维护成本更高；
3. 自建 VPS + Nginx + Node：适合正式稳定后迁移。

服务器职责：

- WebSocket 连接管理；
- 匹配队列；
- 房间创建与销毁；
- 回合锁步与消息校验；
- 协议版本检查；
- 断线、重连、超时处理；
- 基础限流与来源校验；
- 健康检查 `/healthz`；
- 结构化日志，方便排查真机问题。

### 4. 域名方案

已购买主域名：

- `https://supercubegame.com`：游戏官网、隐私政策、技术支持；
- `wss://match.supercubegame.com`：实时对战服务器。

测试阶段可以先用 ECS 公网 IP 做临时连通性测试，但进入 TestFlight 双机测试前应尽快切到 `wss://match.supercubegame.com`，避免 iOS、网络环境和审核侧对明文 WebSocket 的不确定性。

## 分阶段落地

### TestFlight 0.1

- 目标：让 App 可稳定打开，可测试单机、教学、工坊。
- 服务器：可以暂不启用正式对战服务器。
- 必做：
  - 固定 Vercel 前端部署源；
  - 补隐私政策公开 URL；
  - iOS 加载失败显示错误和重试；
  - 在线对战入口给出清楚的维护或匹配失败提示。

### TestFlight 0.2

- 目标：内部测试在线对战。
- 服务器：
  - 已部署当前 `server/` Node + TypeScript + `ws` 服务；
  - 已打开 `/healthz`；
  - 前端已固定 `wss://match.supercubegame.com`；
  - 加入协议版本检查和房间超时清理。

### TestFlight 0.3

- 目标：外部测试更稳定。
- 服务器：
  - 加日志与简单监控；
  - 加连接数、房间数、错误数指标；
  - 加限流和来源校验；
  - 制定维护提示和降级文案。

## 近期最小行动清单

1. 上传 Build 7 到 TestFlight。
2. 双机 TestFlight 实测匹配、回合同步、掉线、后台切回。
3. 观察香港 ECS 的 `supercube-netcode`、Nginx 和账号存储文件。
4. 保持安全组仅开放 `22/80/443`，`8090` 只允许本机 Nginx 访问。
5. 等 ICP 备案通过后，再评估是否把国内节点切回北京 ECS。
