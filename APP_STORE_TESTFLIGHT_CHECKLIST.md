# SuperCube 上架测试准备清单

更新时间：2026-07-08

正式工程：`SuperCube.xcodeproj`

## 1. 当前工程状态

- App 名称：SuperCube
- Bundle ID：`com.pluto.supercube`
- Version：`1.0`
- Build：`5`
- 最低系统：iOS 15.0
- 当前壳：UIKit + WKWebView
- 当前加载：优先 App 内置单文件 Web 资源；仅本地资源缺失时备用线上 `https://super-cube-rho.vercel.app`
- 当前分支：`feat/app-store-assets`，合并后以 `main` 最新提交为准。
- 当前提交：发布前用 `git log -1 --oneline` 确认。
- GitHub 主线：PR #16 已合并，`Pluto-Li-1990/SuperCube` 的 `main` 已切换为 iOS 正式工程。
- 最新构建验证：Build 5 内置单文件 Web 修复包 `Release` + `CODE_SIGNING_ALLOWED=NO` 真机目标构建通过；模拟器构建通过并已启动进大厅。
- 隐私清单：已添加 `SuperCube/PrivacyInfo.xcprivacy`，当前声明原生壳不追踪、不采集数据、不使用需声明的 Required Reason API。
- 隐私政策：已生成 `PRIVACY_POLICY.md` 与 `PRIVACY_POLICY.html`，仍需部署为公开 URL 后填入 App Store Connect。
- 服务器方案：已生成 `SERVER_PLAN.md`。
- 分批测试计划：已生成 `TESTFLIGHT_BATCH_PLAN.md`，当前优先准备 Batch 0.1 启动验证包。

## 2. 必须完成

- 在 Apple Developer / App Store Connect 中创建并确认 Bundle ID：`com.pluto.supercube`。
- 确认 Apple Developer Team `AD2CV88XTC` 与 App Store Connect 账号可用。
- 在 App Store Connect 创建 App 记录。
- Archive 并上传第一个 TestFlight build。
- 填写 TestFlight 测试信息：
  - Beta App Description
  - What to Test
  - Feedback Email
  - Demo account / login note：当前无需登录。
- 填写出口合规：
  - 当前仅 HTTPS/WKWebView，通常按标准加密用途填写。
- 填写 App Privacy：
  - 当前原生壳未请求系统权限。
  - 若线上 Web 不采集用户数据、无广告追踪、无账号系统，可按“不收集数据”准备。
  - 如果联网对战后引入用户 ID、房间 ID、日志、统计或广告 SDK，需要重新填。
- 准备截图与商店文案。
- 真机测试至少覆盖：
  - 首次启动
  - 弱网/断网
  - 从后台返回
  - 横竖屏/安全区
  - PVE 对战
  - 在线匹配失败提示
  - 工坊
  - 教学

## 3. 建议在 TestFlight 前修

- 若 App Store Connect 已经占用或创建了其他 Bundle ID，需要把工程和清单同步成同一个值。
- 已将 App 内置 Web 改为单文件离线页，并由原生壳直接注入 WKWebView，避免真机 `file://` 模块脚本加载差异导致首屏不可用。
- 版本号策略已固定：`MARKETING_VERSION = 1.0`，每次上传递增 `CURRENT_PROJECT_VERSION`。
- 部署隐私政策公开页面链接，并填入 App Store Connect。
- 固定 Web 前端部署源，避免 Vercel 从当前 iOS-only `main` 重新部署导致线上入口损坏。
- 确认线上网页入口 `https://super-cube-rho.vercel.app` 在真机网络下稳定可访问；本地检查曾出现 10 秒超时、20 秒内返回 200，说明链路需要继续加固。

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
- 账号系统
- 跨平台 Android 壳
- 联网服务器正式 SLA 与监控

## 6. 参考

- Apple TestFlight 流程：提供测试信息、上传 build、邀请内外部测试者、收集反馈。
- 外部 TestFlight 测试第一次 build 通常需要 Beta App Review。
