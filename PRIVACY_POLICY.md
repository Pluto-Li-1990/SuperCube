# SuperCube 隐私政策

生效日期：2026-07-23

本隐私政策适用于 SuperCube iOS App、App 内加载的 SuperCube 网页游戏内容，以及 SuperCube 的联网对战服务。

## 1. 我们收集什么

当前版本的 SuperCube 支持可选账号功能：用户可以使用游客身份，也可以选择使用 Apple 登录。SuperCube 不接入广告 SDK，不接入第三方统计 SDK，不请求相机、麦克风、通讯录、照片、定位等系统权限。

当用户使用账号功能时，SuperCube 可能处理玩家昵称、游客账号 ID、服务器会话令牌、Apple 登录返回的用户标识、Apple 可能提供的邮箱地址，以及账号创建、更新和删除所需的基础记录。Apple 登录身份令牌仅用于服务器验证登录有效性；服务器保存 Apple 用户标识的不可逆哈希，不保存明文 Apple 用户标识。

SuperCube 默认优先加载打包在 App 内的本地 Web 游戏资源。正常情况下，单机玩法、教学、工坊、设置和本地进度主要在设备本地运行和保存。游戏进度、设置、教学进度、自定义方块和类似信息如有保存，通常保存在设备本地的浏览器存储中。卸载 App 或清除网站数据可能会删除这些本地数据。

如果 App 内本地资源缺失，SuperCube 可能尝试加载线上备用页面 `https://super-cube-rho.vercel.app`。为了交付备用页面，网页托管、内容分发和安全服务可能处理必要的技术信息，例如 IP 地址、设备浏览器请求信息、访问时间、请求 URL、网络错误和安全日志。这些信息仅用于页面交付、安全防护、排障和稳定性维护。

当用户选择在线对战时，SuperCube 会连接联网对战服务器 `wss://match.supercubegame.com`。为了完成匹配和实时同步，服务器可能处理连接 IP、连接时间、房间或对局 ID、玩家名称、账号会话令牌、协议版本、连接状态、对战同步消息、所选自定义方块/阵容数据、错误日志和基础安全日志。这些信息用于实时对战、同步、反作弊、安全和排障，不用于跨 App 或跨网站追踪，也不会出售给第三方。

## 2. 我们如何使用信息

我们使用必要信息仅用于：

- 加载和展示 SuperCube 游戏内容；
- 提供游客身份、Apple 登录、账号显示和账号删除；
- 保存本地设置、教学进度和自定义内容；
- 支持在线匹配、房间同步和对战状态传输；
- 保持 App、网页服务和联网对战服务稳定；
- 排查崩溃、加载失败、弱网、连接中断或兼容性问题；
- 防止滥用、异常访问和安全风险。

## 3. 联网对战说明

SuperCube 的在线对战支持游客身份和 Apple 登录身份，不包含聊天、语音、好友系统或公开个人主页。对战服务器主要保存运行中的连接、排队和对局状态；这些状态用于完成当前对战，并可能在连接断开、对局结束、服务重启或排障完成后被清理。

服务器和反向代理可能产生必要的技术日志。日志会按照运维和安全需要保留，并在不再需要时删除或匿名化。

## 4. 第三方服务

当前版本可能使用以下服务类型：

- Apple 系统服务：用于安装、运行、TestFlight 测试、App Store 分发和 Sign in with Apple；
- 网页托管与内容分发服务：用于提供备用网页或公开隐私政策页面；
- 云服务器、域名解析和证书服务：用于提供 `match.supercubegame.com` 联网对战服务和 HTTPS/WSS 加密连接；
- GitHub：用于项目页面、问题反馈和隐私政策页面托管。

如果未来接入新的统计、Google/微信/邮箱登录、支付、广告、服务器监控或客服服务，我们会在本政策中说明。

## 5. 儿童隐私

SuperCube 当前不是专门面向 13 岁以下儿童的产品。我们不会故意收集儿童的个人信息。如果你认为我们意外处理了儿童个人信息，请联系我们，我们会尽快处理。

## 6. 数据保留

设备本地数据保留在用户设备中，直到用户删除 App、清除网站数据，或游戏自身提供的清除机制生效。

在线对战中的临时连接和对局状态通常仅在完成匹配和对战所需期间保留。服务器、托管服务或安全服务产生的技术日志会按照安全和运维需要保留，并在不再需要时删除或匿名化。

## 7. 用户选择

你可以通过以下方式控制数据：

- 删除 App，以移除 App 本体和部分本地数据；
- 在系统设置中清除网站数据，以移除 WKWebView 相关本地存储；
- 在 App 的账号面板中删除本机账号，并向 SuperCube 账号服务器请求删除对应会话和账号记录；
- 不使用在线对战模式，仅使用本地单机、教学和工坊功能；
- 如需提出隐私相关问题或删除请求，可通过下方联系方式联系我们。

## 8. 政策更新

当 SuperCube 增加云存档、排行榜、好友、聊天、统计、付费或其他新功能时，本政策可能更新。更新后的政策会在公开页面或 App 说明中展示新的生效日期。

## 9. 联系方式

如对隐私政策或数据处理有疑问，请通过 GitHub 项目页面联系开发者：

`https://github.com/Pluto-Li-1990/SuperCube/issues`

---

# SuperCube Privacy Policy

Effective date: July 23, 2026

This Privacy Policy applies to the SuperCube iOS app, the SuperCube web game content loaded inside the app, and the SuperCube online multiplayer service.

## 1. What We Collect

The current version of SuperCube supports optional accounts: users may continue as a guest or choose Sign in with Apple. SuperCube does not include advertising SDKs, does not include third-party analytics SDKs, and does not request system permissions such as camera, microphone, contacts, photos, or location.

When a user uses account features, SuperCube may process display name, guest account ID, server session token, the user identifier returned by Sign in with Apple, email address if Apple provides one, and basic records needed to create, update, or delete the account. The Apple identity token is used only to verify the sign-in with the server. The server stores an irreversible hash of the Apple user identifier and does not store the plain Apple user identifier.

SuperCube primarily loads the web game resources bundled inside the app. In normal use, single-player gameplay, tutorials, the workshop, settings, and local progress run and are stored on the device. Game progress, settings, tutorial progress, custom pieces, and similar information, when saved, are generally stored locally on the device through browser storage. Uninstalling the app or clearing website data may remove this local data.

If the bundled local resources are missing, SuperCube may attempt to load the fallback web page at `https://super-cube-rho.vercel.app`. To deliver the fallback page, web hosting, content delivery, and security services may process necessary technical information such as IP address, browser request information, access time, requested URL, network errors, and security logs. This information is used only for content delivery, security, troubleshooting, and service reliability.

When a user chooses online multiplayer, SuperCube connects to the match server at `wss://match.supercubegame.com`. To provide matchmaking and real-time synchronization, the server may process connection IP address, connection time, room or match IDs, player name, account session token, protocol version, connection state, synchronized match messages, selected custom piece/loadout data, error logs, and basic security logs. This information is used for real-time gameplay, synchronization, anti-abuse, security, and troubleshooting. It is not used to track users across apps or websites, and it is not sold to third parties.

## 2. How We Use Information

We use necessary information only to:

- load and display SuperCube game content;
- provide guest identity, Sign in with Apple, account display, and account deletion;
- save local settings, tutorial progress, and custom content;
- support online matchmaking, room synchronization, and battle state transfer;
- keep the app, web service, and online multiplayer service stable;
- troubleshoot crashes, loading failures, weak network conditions, disconnections, and compatibility problems;
- prevent abuse, abnormal access, and security risks.

## 3. Online Multiplayer Notice

SuperCube online multiplayer supports guest identity and Sign in with Apple identity. It does not include chat, voice, friend systems, or public user profiles. The match server primarily stores active connection, queue, and match state. These states are used to complete the current match and may be cleared after disconnection, match completion, service restart, or troubleshooting.

The server and reverse proxy may generate necessary technical logs. Logs are retained according to operational and security needs and are deleted or anonymized when no longer needed.

## 4. Third-Party Services

The current version may use the following service types:

- Apple system services, for installation, runtime, TestFlight testing, App Store distribution, and Sign in with Apple;
- web hosting and content delivery services, to provide fallback web pages or the public privacy policy page;
- cloud server, DNS, and certificate services, to provide the `match.supercubegame.com` online multiplayer service and HTTPS/WSS encrypted connections;
- GitHub, for the project page, issue feedback, and privacy policy hosting.

If we add analytics, Google/WeChat/email login, payment, advertising, server monitoring, customer support, or similar services in the future, we will update this policy.

## 5. Children's Privacy

SuperCube is not currently directed specifically to children under 13. We do not knowingly collect personal information from children. If you believe that we have accidentally processed a child's personal information, please contact us so we can address it.

## 6. Data Retention

Local data remains on the user's device until the user deletes the app, clears website data, or uses any in-game clearing mechanism that may be provided.

Temporary online multiplayer connection and match state is generally retained only for as long as needed to provide matchmaking and gameplay. Technical logs generated by server, hosting, or security services are retained according to security and operations needs, and are deleted or anonymized when no longer needed.

## 7. Your Choices

You may:

- delete the app to remove the app and part of its local data;
- clear website data in system settings to remove WKWebView-related local storage;
- use the in-app account panel to delete the local account and request deletion of the related session and account record from the SuperCube account server;
- avoid online multiplayer and use only local single-player, tutorial, and workshop features;
- contact us using the information below for privacy questions or deletion requests.

## 8. Changes

We may update this policy when SuperCube adds cloud saves, leaderboards, friends, chat, analytics, payments, or other new features. The updated policy will show a new effective date.

## 9. Contact

For questions about this policy or data handling, please contact the developer through the GitHub project page:

`https://github.com/Pluto-Li-1990/SuperCube/issues`
