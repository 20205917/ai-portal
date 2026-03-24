## [1.2.0] - 2026-03-24

### Features
- 打包与发布新增 macOS 支持：增加 `dmg` 产物并覆盖 `x64/arm64` 架构，Release 流水线同步上传与清理。
- 设置页新增“开机自启”开关：全平台可见，macOS/Windows 可配置，Linux 禁用并提示。
- 主进程新增登录项管理：支持读取系统登录项状态、设置开机自启，并在登录启动场景静默后台拉起。

### Changed
- macOS 配置目录调整为 `~/Library/Application Support/AIProtal`，并与 CLI 运行时路径规则保持一致。
- 启动脚本统一复用 `runtime-env` 默认环境注入逻辑，减少重复判定代码。
