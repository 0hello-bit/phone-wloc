# 第三方与许可边界

## hankinsus/wloc

- 仓库：https://github.com/hankinsus/wloc
- 固定提交：`8ce5aaa3098d7887373954dddf64f58afae4cd97`
- 已有缓存文件 SHA-256：`4ea95c543f101dd25febfac292ba7faa914e87bcbf78eb7e23ee171f0f8e02c5`

整理本公开包时对固定提交递归树及 GitHub 仓库许可字段的检查未找到许可证文件，许可字段为 `null`；README 的个人兴趣/研究用途说明不是明确的开源再分发授权。仓库可公开访问也不自动允许再分发。因此此包不包含 `upstream-wloc.js`、由它生成的响应脚本或其解析器副本，AGPL 也不被用于重新许可该上游。

本仓库只记录响应脚本的哈希，没有把缓存内容带入公开目录。2026-11-03 从固定提交的 dist/wloc.js 独立重新下载，40956 字节，SHA-256 与原缓存一致。固定来源为：https://raw.githubusercontent.com/hankinsus/wloc/8ce5aaa3098d7887373954dddf64f58afae4cd97/dist/wloc.js 。校验用于拒绝意外版本，不证明获得许可或代码安全。

如你已自行确认适用权利并决定进行个人实验，请自行从上游固定提交中找到实际响应重写脚本（查看该提交配置中的 script-path，而非随便选择一个 JS 文件），按原字节保存为 `.private-build/upstream-wloc.js`。仓库不提供自动下载或随意选择文件的流程。随后运行：

```sh
python scripts/build_response.py
python scripts/test.py --response
```

哈希不匹配时构建拒绝执行，应调查版本、路径、换行或编码差异，不能跳过校验。生成文件只写入 `.private-build/phone-wloc-response.js`；不要把它或上游文件加入发布包。**在取得上游明确授权前，完整响应组件的公开再分发仍未解决。**

## 其他项目与服务

控制页运行于用户自行安装的 Shadowrocket，其应用本身不随仓库分发。可选高德 JS API、栅格服务、Photon 搜索和 OpenStreetMap 各有独立服务与数据条款；保留地图署名，不将服务调用等同于获得离线数据再分发权。本仓库不附带这些 SDK 的离线副本。

不包含原生 iOS 应用、StikDebug、idevice 库、二进制工具或证书。本项目自身组件保留原 AGPL-3.0 许可，见 LICENSE；该许可范围不扩展到未提供的第三方组件。
