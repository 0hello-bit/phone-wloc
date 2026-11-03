# Phone WLOC · iPhone 13 Pro / iOS 18.7.7 未越狱定位实验

**蜂窝流量可用 · 日常无需电脑在线 · 不要求与 Mac 连接同一 Wi-Fi。**

本项目针对 **iPhone 13 Pro、iOS 18.7.7、未越狱**环境开发和实测。基于 Shadowrocket 的手机本地配置与 Safari 书签完成选点、换点、保存十分钟和清除；上述使用能力来自作者完整个人配置的实际使用反馈。电脑用于开发、初次安装和排查，日常控制与响应改写留在手机上。

控制页支持地图选点、手动 WGS-84 坐标、常用地点与最近选点，以及有期限的本地目标会话。

它修改特定网络定位响应，不是通用系统 GPS 修改器。网页“保存成功”只表示本地写入成功；是否生效应由目标应用重新定位核对。每次保存有效 **600 秒**，到期或清除后停止改写；系统及应用缓存不保证立即恢复真实位置。

本仓库公开控制页、会话校验、响应包装层、构建脚本及测试；**不包含第三方响应解析器，因此全新检出只能独立构建和测试控制页**。完整响应改写需另行取得上游代码，且其再分发许可尚未解决，详见 [第三方说明](THIRD_PARTY_NOTICES.md)。请勿把本仓库描述为已提供完整、可直接发布的定位插件。

## 适用实测环境

- **设备：iPhone 13 Pro。**
- **系统：iOS 18.7.7；未越狱，不依赖越狱特性。**
- **网络与运行：据作者实际使用反馈，蜂窝流量环境可用，日常不需要电脑在线，也不要求与 Mac 连接同一 Wi-Fi。**
- 电脑用于开发、初次安装和排查；这与日常使用不依赖电脑是两个阶段。

当时调研中未找到适配这组机型与系统的成熟越狱路线，比较过的常见方案反复涉及电脑或 Wi-Fi／局域网依赖。这是作者调研与使用的范围，不是对全网越狱工具、所有定位软件或其他机型版本的穷尽结论。

## 从干净目录构建

需要 Python 3.9+。控制页构建无需第三方依赖或网络：

```sh
python scripts/build_control.py
python scripts/test.py
python scripts/privacy_scan.py
```

生成 `dist/phone-wloc-settings.js`。测试在 macOS 上使用 Swift 和 Apple JavaScriptCore；其他系统会明确输出 SKIP，不代表行为测试通过。默认不运行依赖上游的二进制响应测试。

## 手机本地安装

1. 将生成的 `dist/phone-wloc-settings.js` 通过自己信任的方式导入 Shadowrocket 的本地脚本目录，文件名保持一致。它已经包含完整页面，不依赖电脑提供网页或既有缓存。
2. 若只研究控制页，可先从 `Shadowrocket/Phone-WLOC.template.conf` 移除 `Phone WLOC Response` 行；此时不会执行定位响应改写。若需完整链路，先按第三方说明自行准备私有响应脚本，再导入 `phone-wloc-response.js`。不要在缺文件的情况下宣称完整安装成功。
3. 导入配置模板；模板使用 DIRECT 规则，合并进现有配置前请自行核对路由影响。仅为模板列出的域名启用 MITM，并在 Shadowrocket 内选择自己安装并信任的证书。仓库不提供证书。
4. 保持 Shadowrocket 已连接，在 Safari 打开 `https://gs-loc.apple.com/wloc-settings/save?action=panel`。该地址由本地请求脚本提供页面，不是本项目运营的网站。
5. 选点后保存，在目标地图应用重新定位并核对蓝点；清除或到期后同样需要核对恢复情况。仅在自己获授权的设备、账号及环境内使用。

手机操作期间控制页不依赖 Mac 服务；地图、搜索及系统网络定位仍会使用网络。作者报告已在 Wi-Fi/蜂窝环境使用，日常无需电脑在线；**工具侧尚未单独复现 Mac 完全关机后的完整换点与恢复链路**。公开包尚未在干净手机环境完成安装验收。

## 地图配置

默认不含高德 Key 或安全码，使用栅格底图；不能承诺矢量高清、原生双指缩放或 POI 能力。地图和搜索服务还受网络、配额及服务条款影响。

如需高德 JS API，在本地创建被忽略的 `.private-build/amap.json`，填入自己申请的值：

```json
{"key":"YOUR_OWN_KEY","securityJsCode":"YOUR_OWN_SECURITY_CODE"}
```

```sh
python scripts/build_control.py --amap-config .private-build/amap.json
```

仅将 `.private-build/phone-wloc-settings.js` 导入自己的手机，勿上传或发布它。该构建会把配置写入手机 Shadowrocket 的 `phone_wloc_amap_config`；恢复无密钥状态时请清除该本地键（普通无配置构建不会删除既有设置）。网页和客户端环境无法真正隐藏 JS API 凭据，应设置服务商允许的来源及额度限制。

## 可选：保留旧 loader

`Shadowrocket/phone-wloc-amap.js` 是读取 `phone_wloc_control_amap_v1` 并执行的旧 loader，空缓存下不能显示页面。默认安装不使用它。

若确有此需求，运行 `python scripts/build_control.py --loader-bootstrap`，将生成的 `dist/phone-wloc-bootstrap.js` 临时设为 Settings 请求脚本，打开一次面板地址并确认 `Control cache installed`；再改用导入的 `phone-wloc-amap.js`。更新时重新引导缓存。带高德配置时同时传 `--amap-config`，引导文件也仅会进入 `.private-build`，不得公开。

## “定位刷新”快捷指令

自行创建名为“定位刷新”的快捷指令：先以“打开 URL”打开 `prefs:root=Privacy&path=LOCATION`，最后添加“无”（Nothing）动作。它只尝试打开系统定位服务设置页，**不会自动开关系统定位**；URL 路径是否可用取决于 iOS 版本。首次从 Safari 调用快捷指令可能出现确认。

未安装时可在控制页关闭“保存/清除后前往定位服务”，手动进入“设置 → 隐私与安全性 → 定位服务”。需要刷新时手动关闭、等待后再开启；这仍不保证任意应用立即采纳目标或恢复缓存。

## 资料与许可证

- [架构](docs/architecture.md)：状态、坐标、脚本边界与构建产物。
- [已知边界与排查](docs/pitfalls.md)：不要混淆前端保存、网络改写和系统定位。
- [安全与隐私](SECURITY.md)、[第三方说明](THIRD_PARTY_NOTICES.md)。

本项目自身代码沿用原项目 **AGPL-3.0**，完整文本见 [LICENSE](LICENSE)。这不授予第三方解析器、地图服务、Shadowrocket、Apple 或其他组件的额外使用或再分发权。
