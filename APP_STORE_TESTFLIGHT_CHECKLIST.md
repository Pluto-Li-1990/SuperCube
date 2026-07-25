# SuperCube 上架测试准备清单

更新时间：2026-07-24

正式工程：`SuperCube.xcodeproj`

## 1. 当前工程状态

- App 名称：SuperCube
- Bundle ID：`com.pluto.supercube`
- Version：`1.0`
- Build：`7`
- 最低系统：iOS 15.0
- 当前壳：UIKit + WKWebView
- 当前加载：优先 App 内置单文件 Web 资源；仅本地资源缺失时备用线上 `https://super-cube-rho.vercel.app`
- 当前分支：以 `release/testflight-online-build7` 合并后的 `main` 为准。
- 当前提交：发布前用 `git log -1 --oneline` 确认。
- GitHub 主线：PR #16 已合并，`Pluto-Li-1990/SuperCube` 的 `main` 已切换为 iOS 正式工程。
- 最新构建验证：Build 7 准备账号与在线对战内测；香港 ECS 临时节点 `match.supercubegame.com` 已完成 HTTPS/WSS 部署，等待本地 Xcode Archive 上传 TestFlight 后做双机实测。
- 隐私清单：已添加 `SuperCube/PrivacyInfo.xcprivacy`，当前声明不追踪；账号与联网功能会收集用于 App 功能的名称、邮箱地址和用户 ID，不使用需声明的 Required Reason API。
- 隐私政策：已生成 `PRIVACY_POLICY.md` 与 `PRIVACY_POLICY.html`，正式 URL 为 `https://supercubegame.com/privacy.html`；每次账号/联网能力变更都要同步更新。
- 服务器方案：已生成 `SERVER_PLAN.md`。
- 在线对战服务器：香港 ECS 临时节点已上线，公网健康检查与 WSS 握手已通过；国内北京 ECS 继续等待 ICP 备案。
- ICP 备案材料：已生成 `docs/icp-filing-prep.md`；`match.supercubegame.com` 指向中国内地 ECS 时，备案通过前会被阿里云拦截，不能作为在线对战发布就绪状态。
- 分批测试计划：已生成 `TESTFLIGHT_BATCH_PLAN.md`，当前优先准备 Batch 0.1 启动验证包。

## 2. 必须完成

- 在 Apple Developer / App Store Connect 中创建并确认 Bundle ID：`com.pluto.supercube`。
- 确认 Apple Developer Team `AD2CV88XTC` 与 App Store Connect 账号可用。
- 在 App Store Connect 创建 App 记录。
- Archive 并上传 Build 7 TestFlight 包。
- 填写 TestFlight 测试信息：
  - Beta App Description
  - What to Test
  - Feedback Email
  - Demo account / login note：支持游客继续；Apple 登录为可选。
- 填写出口合规：
  - 当前仅 HTTPS/WKWebView，通常按标准加密用途填写。
- 填写 App Privacy：
  - 当前原生壳未请求系统权限。
  - 当前有可选 Apple 登录、游客身份、联网匹配和服务器日志，App Privacy 不应再按“完全不收集数据”填写。
  - 如后续引入 Google/微信/邮箱、排行榜、统计、广告 SDK，需要重新填写。
- 准备截图与商店文案。
- 真机测试至少覆盖：
  - 首次启动
  - 弱网/断网
  - 从后台返回
  - 横竖屏/安全区
  - PVE 对战
  - 在线匹配失败提示
  - 双机在线匹配：游客账号、Apple 登录账号、不同网络对战至少 20 回合
  - 账号面板：游客继续、Apple 登录、删除账号
  - 工坊
  - 教学

## 3. 建议在 TestFlight 前修

- 若 App Store Connect 已经占用或创建了其他 Bundle ID，需要把工程和清单同步成同一个值。
- 已将 App 内置 Web 改为单文件离线页，并由原生壳直接注入 WKWebView，避免真机 `file://` 模块脚本加载差异导致首屏不可用。
- 版本号策略已固定：`MARKETING_VERSION = 1.0`，每次上传递增 `CURRENT_PROJECT_VERSION`。
- 部署隐私政策公开页面链接，并填入 App Store Connect。
- 固定 Web 前端部署源，避免 Vercel 从当前 iOS-only `main` 重新部署导致线上入口损坏。
- 确认 `https://match.supercubegame.com/healthz` 与 `wss://match.supercubegame.com/` 在真机网络下稳定可访问。

## 4. 截图素材

建议先准备这些画面：

- 大厅主界面
- 单人对战棋盘
- 元素反应/特效画面
- 教学关卡
- 工坊

## 5. 暂缓到正式上线前

- Game Center
- 付费 / 内购
- 广告
- Google/微信/邮箱登录
- 跨平台 Android 壳
- 联网服务器正式 SLA 与监控

## 6. 参考

- Apple TestFlight 流程：提供测试信息、上传 build、邀请内外部测试者、收集反馈。
- 外部 TestFlight 测试第一次 build 通常需要 Beta App Review。
