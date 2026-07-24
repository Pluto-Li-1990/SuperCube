# SuperCube ICP 备案材料准备

更新时间：2026-07-24

本文用于准备 `supercubegame.com` 在阿里云中国内地 ECS 上提供 SuperCube 官网与联网对战服务所需的 ICP 备案材料。备案等待期间，TestFlight 在线对战临时使用阿里云香港 ECS。

## 结论

- 当前服务器位于阿里云华北 2（北京），属于中国内地节点。
- 国内备案目标服务器为北京 ECS，公网 IP `39.106.138.188`。
- 当前 TestFlight 临时节点为香港 ECS，公网 IP `47.76.131.220`，`match.supercubegame.com` 暂时解析到该香港节点。
- 未完成 ICP 备案前，阿里云会拦截域名访问，外部访问会出现 `Non-compliance ICP Filing`。
- 继续使用北京 ECS 的前提是先完成 ICP 备案。
- ICP 备案通过后，网站开通 30 日内还需要按要求办理公安联网备案。

## 备案范围建议

优先按“网站备案”提交：

- 域名：`supercubegame.com`
- 网站域名用途：SuperCube 游戏介绍、隐私政策、支持信息、联网对战服务说明
- 服务器：阿里云 ECS，华北 2（北京）
- 公网 IP：`39.106.138.188`

如备案系统要求 App 备案或你准备在中国区 App Store 正式上线联网版，再补充“App 备案”：

- App 名称：SuperCube 元素方块
- Bundle ID：`com.pluto.supercube`
- 联网服务域名：`match.supercubegame.com`
- 隐私政策：`https://pluto-li-1990.github.io/SuperCube/privacy.html`

## 可复制填写内容

### 网站名称

推荐：

```text
SuperCube元素方块
```

备选（若个人备案名称规则更严格）：

```text
元素方块记录
```

```text
方块游戏分享
```

说明：个人备案的网站名称尽量避免“官方”“平台”“商城”“服务中心”“公司”等容易被认为企业或经营性质的词。

### 网站简介

```text
本网站用于展示个人开发的 SuperCube 元素方块游戏，提供游戏介绍、玩法说明、隐私政策、技术支持与联网对战相关说明。网站不提供交易、广告、新闻采编、论坛社区、直播、下载站或其他经营性互联网信息服务。
```

### 服务内容/网站类型

若阿里云页面有分类，优先选择接近：

```text
个人内容分享 / 其他 / 游戏作品展示
```

避免选择：

```text
电子商务、论坛社区、信息发布平台、新闻、直播、金融、医疗、教育培训
```

### 首页 URL

备案阶段建议先使用：

```text
https://supercubegame.com
```

如果暂时还没有官网首页，可以备案通过后再上线官网；备案审核期间不要把域名指向一个内容不完整或与备案信息不符的网站。

### 技术支持网址

```text
https://pluto-li-1990.github.io/SuperCube/privacy.html
```

如果后续官网上线，建议改为：

```text
https://supercubegame.com/support
```

### 隐私政策网址

```text
https://pluto-li-1990.github.io/SuperCube/privacy.html
```

后续官网上线后可改为：

```text
https://supercubegame.com/privacy
```

### App 信息

```text
App 名称：SuperCube 元素方块
Bundle ID：com.pluto.supercube
版本号：1.0
开发者：个人开发者
主要功能：元素方块消除、单人对战、教学关卡、自定义方块、联网快速匹配对战
登录方式：游客身份、Apple 登录
是否含付费：否
是否含广告：否
是否含用户发布内容/论坛/聊天：否
是否含排行榜/社交关系：当前版本否
```

### App 简介

```text
SuperCube 元素方块是一款个人开发的休闲策略方块游戏。玩家可以在 10 至 15 分钟内完成一局对战，通过火、水、木、金属、冰、生命等元素反应制造局面变化。当前版本提供单人对战、教学关卡、自定义方块和联网快速匹配对战，不包含广告、内购、论坛、聊天或用户发布内容。
```

### 接入信息

```text
服务器提供商：阿里云
服务器地域：华北 2（北京）
服务器类型：ECS
公网 IP：39.106.138.188
主域名：supercubegame.com
联网对战域名：match.supercubegame.com
服务端口：80、443
内部端口：8090，仅 Nginx 本机反代使用，不对公网开放
```

## 你需要准备的材料

- 阿里云账号：用于提交备案。
- 域名：`supercubegame.com`，需要完成实名认证。
- ECS：阿里云中国内地节点，当前为华北 2（北京）。
- 个人身份证原件照片或扫描件：按阿里云页面要求上传。
- 手机号：用于阿里云初审和工信部短信核验。
- 真实通信地址：按身份证和实际所在地填写。
- 负责人照片/人脸核验：按阿里云 App 或页面提示完成。
- 域名证书：部分省份可能要求，按备案页面提示准备。

## 操作顺序

1. 登录阿里云 ICP 备案控制台。
2. 选择“开始备案”。
3. 填写主体信息：个人。
4. 选择接入资源：当前北京 ECS。
5. 填写网站信息：使用上方“可复制填写内容”。
6. 上传身份证等材料并完成真实性核验。
7. 等待阿里云初审，通常先由阿里云检查材料。
8. 按短信提示完成工信部短信核验。
9. 等待管局审核。
10. 备案通过后，按上线策略决定是否把 `supercubegame.com` 与 `match.supercubegame.com` 从香港临时节点切回北京 ECS `39.106.138.188`。
11. 验证 `https://match.supercubegame.com/healthz` 不再返回备案拦截页。
12. 在开通服务后 30 日内完成公安联网备案。

## 备案通过后的技术检查

备案通过后执行这些检查：

```bash
curl https://match.supercubegame.com/healthz
```

期望返回：

```json
{"ok":true,"clients":0,"waiting":0,"matches":0}
```

然后再测试 WebSocket：

```bash
curl --http1.1 --max-time 8 \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: SGVsbG9TdXBlckN1YmU=" \
  -H "Sec-WebSocket-Version: 13" \
  https://match.supercubegame.com/
```

期望看到：

```text
HTTP/1.1 101 Switching Protocols
```

## 风险提醒

- 备案不是即时生效，阿里云初审和管局审核都需要时间。
- 备案期间不要把未备案域名长期提供正式服务，否则可能继续被拦截。
- 如果个人备案无法通过“游戏联网服务”描述，需要先以个人作品展示、隐私政策、技术支持页面为主，联网对战服务在备案通过后再谨慎开放。
- 如果后续加入付费、广告、排行榜、聊天、用户生成内容、未成年人系统或中国区商业化运营，合规要求会明显增加，需要重新评估。

## 官方参考

- 阿里云 ICP 备案流程：https://help.aliyun.com/zh/icp-filing/basic-icp-service/user-guide/icp-filing-application-overview
- 阿里云个人网站备案快速入门：https://help.aliyun.com/zh/icp-filing/basic-icp-service/getting-started/quick-start-for-icp-filing-for-personal-websites
- 阿里云 App 备案快速入门：https://help.aliyun.com/zh/icp-filing/basic-icp-service/getting-started/quick-sta-rt-for-icp-filing-for-personal-app
- 阿里云备案 FAQ：https://help.aliyun.com/zh/icp-filing/basic-icp-service/support/for-the-record-process-faq
