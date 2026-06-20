# SuperCube 上 iOS 真机 / App Store 指南

> 目标：把网页版用 **Capacitor** 套壳成原生 iOS App，装到你 iPhone 上测试，并可上 TestFlight / App Store。
> 仓库里已备好：`capacitor.config.ts`、App 图标源（`resources/icon.png`、`resources/splash.png`）、相关依赖。
> 全程在你的 **Mac** 上操作。第一次约需 1 小时（多在装 Xcode）。

## 一、装好前置环境（只需一次）

1. **Node.js**（你 Mac 目前没有）：去 https://nodejs.org 下载 LTS 版 `.pkg` 安装，一路下一步。装完终端验证：
   ```bash
   node -v && npm -v
   ```
2. **Xcode**：App Store 搜 "Xcode" 安装（约 7GB，较久）。装完打开一次，同意协议，让它装好组件。
3. **CocoaPods**（iOS 依赖管理）：
   ```bash
   sudo gem install cocoapods
   ```
   （若报错，可改用 Homebrew：`brew install cocoapods`）

## 二、生成 App 图标（只需一次，或图标变更时）

```bash
cd ~/Documents/1-新型俄罗斯方块/SuperCube-Web
npm install
npx @capacitor/assets generate --ios
```
这会用 `resources/icon.png` 自动生成 iOS 所需的全套图标尺寸。

## 三、添加 iOS 平台并构建

```bash
npm run ios:sync     # = 构建网页 + 同步进 iOS 工程（首次会自动 npx cap add ios）
```
若首次提示没有 ios 平台，先执行：
```bash
npx cap add ios
npm run ios:sync
```

## 四、用 Xcode 打开并运行

```bash
npm run ios:open     # 打开 Xcode
```
在 Xcode 里：
1. 左侧选中顶部 **App** 项目 → **Signing & Capabilities**
2. **Team** 选你的 Apple 开发者账号（首次会让你登录）
3. **Bundle Identifier** 改成你自己的，如 `com.你的名字.supercube`（要全球唯一）
4. 顶部选一个目标设备：
   - **真机**：用数据线连上 iPhone，选你的设备 → 点 ▶ 运行，App 就装到手机上了（首次需在 iPhone「设置 → 通用 → VPN与设备管理」信任开发者）
   - 或 **模拟器**：选任意 iPhone 模拟器 → ▶

## 五、上 TestFlight / App Store（可选，正式分发时）

1. Xcode 顶部设备选 **Any iOS Device (arm64)**
2. 菜单 **Product → Archive**，等打包完成
3. 在弹出的 Organizer 里点 **Distribute App → App Store Connect → Upload**
4. 去 App Store Connect 网站，把这个构建加入 **TestFlight**（内测，几分钟可用）或提交 **App Store 审核**

## 六、以后每次改了游戏怎么更新到 App

```bash
npm run ios:sync     # 重新构建并同步
npm run ios:open     # 打开 Xcode 再 Run / Archive
```

---

## 常见问题

- **`npx cap` 找不到**：确认在项目目录里、且已 `npm install`。
- **CocoaPods 报错**：`cd ios/App && pod install` 手动装一次，或 `sudo gem install cocoapods` 重装。
- **签名报错**：确认 Apple 开发者账号已在 Xcode 登录、Bundle ID 唯一。
- **白屏**：确认先 `npm run build` 生成了 `dist/`（`ios:sync` 已包含）。

## 关于审核

App Store 有「4.2 最低功能性」要求。当前还是早期版本，建议先用**真机/TestFlight 内测**打磨，等内容做厚（联网、教程、更多模式）再正式提交审核，降低被打回风险。
