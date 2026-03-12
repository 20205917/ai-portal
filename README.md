# AIDispatchCenter

Ubuntu 下的个人 AI 入口调度台。它提供一个与普通浏览器明确隔离的专用 AI 主窗口，并通过 `aidc toggle` 实现精准的拉起、隐藏和聚焦。

## 当前实现

- Electron + TypeScript 桌面壳，当前默认适配环境为本机 `Ubuntu GNOME X11 (ubuntu-xorg)`
- React + Vite 渲染层，左侧使用可管理的 Dock 风格图标栏，右侧内容区使用单实例内嵌 `webview`
- 默认内置 `ChatGPT` 与 `豆包`
- 单实例主进程 + Unix socket 命令面：`aidc toggle`、`aidc show`、`aidc hide`、`aidc open <providerId>`、`aidc status`
- provider 级 `isolated-external` 回退模式，避免与普通浏览器混淆

## 快速开始

```bash
npm install
npm run dev
```

源码模式启动（`npm run start`）会在缺少 `dist` 构建产物时自动先执行构建。  
如果你怀疑本地缓存或旧产物导致异常，可强制全量重建后再启动：

```bash
AIDC_FORCE_BUILD=1 npm run start
```

开发启动后，可以在另一个终端调用：

```bash
npx aidc toggle
npx aidc open chatgpt
npx aidc status
```

## 目录

- `src/main`：Electron 主进程、命令服务器、窗口管理、持久化
- `src/preload`：安全桥接层
- `src/renderer`：应用壳、侧栏、WebView 工作区、设置页
- `src/shared`：常量、provider 类型、命令协议
- `docs`：产品定位、工作流、GNOME/X11 快捷键接入说明

## 执行流程

后续开发统一按 v2 流程执行，不依赖 workstyle 机制：

- 流程规范：[`docs/process/workflow.md`](/home/yimu/IdeaProjects/AIDispatchCenter/docs/process/workflow.md)
- 输入模板：[`docs/process/task-input-template.md`](/home/yimu/IdeaProjects/AIDispatchCenter/docs/process/task-input-template.md)
- 完成汇报模板：[`docs/process/completion-report-template.md`](/home/yimu/IdeaProjects/AIDispatchCenter/docs/process/completion-report-template.md)
- 固定验收命令：`npm run verify:gate`
- 自动提交脚本：`bash scripts/task-auto-commit.sh "type(scope): summary" "Root cause" "Changes" "Verification" "Impact"`

输入约定：你默认只需要给 `目标`，其余 `验收标准 / 约束 / 非目标` 由我自动生成并在开始节点声明。

## 关键行为

- 主窗口使用专用桌面身份 `com.yimu.AIDispatchCenter`
- `toggle` 只控制 AIDC 主窗口，不触碰普通 Chrome/Chromium/Firefox 窗口
- 再次拉起时恢复上次使用的 provider
- ChatGPT/豆包默认走内嵌模式；如果兼容性出现问题，可在设置页切到独立隔离窗
- 界面默认面向中文用户，主界面和说明文案均为中文
- 首页支持新增、隐藏、删除自定义 AI 网页，左侧图标会自动生成

## 本机快捷键

当前本机环境是 `Ubuntu GNOME X11`。最简单的方式是把 `aidc toggle` 绑定到 GNOME 自定义快捷键。说明见：

- [`docs/setup/gnome-shortcuts.md`](/home/yimu/IdeaProjects/AIDispatchCenter/docs/setup/gnome-shortcuts.md)

也可以使用辅助脚本：

```bash
./scripts/install-gnome-shortcut.sh "AI 调度台切换" "<Super>a>" "aidc toggle"
```

## 测试

```bash
npm test
npm run verify:gate
AIDC_REQUIRE_GUI=1 npm run verify:gate
npm run check:architecture
AIDC_ARCH_FAIL_ON_WARN=1 npm run check:architecture
npm run verify:visual
```

`npm run verify:visual` 会在 `artifacts/visual/<timestamp>/` 输出截图与 `index.md`，用于人工确认界面状态。
脚本会自动清理历史截图批次，默认仅保留最近 `5` 批；可用 `AIDC_VISUAL_KEEP=<N>` 调整保留数量。
`npm run check:architecture` 默认采用“建议阈值 + 硬阈值”双层策略：建议阈值只告警不阻断，硬阈值才失败。若需要严格模式，可设置 `AIDC_ARCH_FAIL_ON_WARN=1` 将告警升级为失败。

## 图形渲染排障

在 Linux 本机开发环境下，默认会自动启用 `--no-sandbox`，避免 `chrome-sandbox` 权限导致启动失败。  
默认不会强制加 `--disable-gpu`，以保证网页渲染兼容性。  
如果你已经正确配置了 `chrome-sandbox` 并希望启用沙箱，可显式关闭该开关：

```bash
AIDC_NO_SANDBOX=0 npm run start
```

如果本机图形栈异常，再临时启用：

```bash
AIDC_DISABLE_GPU=1 npm run start
```

如果仍出现黑屏，可开启调试日志后启动：

```bash
AIDC_DEBUG=1 npm run start
```
