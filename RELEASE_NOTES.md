## [1.0.5] - 2026-03-12

### 关键修复
- 修复 `.deb` 安装后豆包页面卡在加载的问题：安装包 desktop 启动参数默认携带 `--disable-gpu`。
- 修复 Linux sandbox 权限不完整导致启动异常的问题：安装后自动修复 `/opt/AIProtal/chrome-sandbox` 权限为 `root:root + 4755`。
- 修复升级后旧驻留进程影响新版本行为的问题：安装后自动清理历史 `aiprotal` 进程。

### 行为调整
- 运行时默认不自动启用 `--no-sandbox`，仅在显式设置 `AIPROTAL_NO_SANDBOX=1` 时开启。
- 开发态 `npm run start` / `npm run dev` 默认注入 `AIPROTAL_NO_SANDBOX=1`，避免本地开发被 setuid sandbox 限制中断。

### 包含提交
- `62383f7` fix(linux): 修复 deb 安装后提供商页卡住问题
- `d2aed9a` chore: 提交当前工作区全部改动
