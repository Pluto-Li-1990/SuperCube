# SuperCube iOS

这是 SuperCube 当前的正式 iOS 工程。旧 Web/Capacitor/Unity 版本不再作为开发、构建、PR 或修复目标。

## 正式工程

- Xcode 工程：`SuperCube.xcodeproj`
- App 入口：`SuperCube/SuperCubeApp.swift`
- WebView 控制器：`SuperCube/ContentView.swift`
- App 图标：`SuperCube/Assets.xcassets/AppIcon.appiconset/`
- TestFlight 准备清单：`APP_STORE_TESTFLIGHT_CHECKLIST.md`
- 隐私政策：`PRIVACY_POLICY.md` / `PRIVACY_POLICY.html`
- 服务器与部署方案：`SERVER_PLAN.md`
- TestFlight 分批计划：`TESTFLIGHT_BATCH_PLAN.md`

## 当前策略

- iOS 原生壳使用 UIKit + WKWebView。
- 默认优先加载 App 内置本地 Web 资源；本地资源缺失、超时或未渲染时再尝试线上地址：`https://super-cube-rho.vercel.app`
- 启动时显示加载状态；超时或失败时显示错误和重新加载按钮，避免纯黑屏。
- 当前线上前端需要固定独立部署源，避免 iOS-only `main` 触发错误重部署。
- Debug 构建关闭 Debug Dylib 注入，降低 beta iOS 真机启动风险。
- Bundle ID：`com.pluto.supercube`
- 当前版本：`1.0 (4)`
- 最低系统：iOS 15.0

## 本地验证

```sh
xcodebuild -project SuperCube.xcodeproj -scheme SuperCube -configuration Debug -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/supercube-ios-testflight-prep CODE_SIGNING_ALLOWED=NO build
```

最近一次本地验证结果：`BUILD SUCCEEDED`。
