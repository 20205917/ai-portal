# AIDispatchCenter

AIDispatchCenter 是一个面向 Linux / Windows 的 AI 入口调度台。
它把常用 AI 服务集中在一个独立桌面壳里，通过 `aidc` 命令实现快速拉起、隐藏和切换。

## 功能概览

- 独立 AI 主窗口：与普通浏览器窗口隔离
- 多服务入口：内置 ChatGPT、豆包，支持自定义 AI 网站
- 命令控制：`aidc toggle/show/hide/open/status/next/prev`
- 侧栏与模式管理：支持显示/隐藏、内嵌模式与独立窗口回退
- 运行状态可视化：主页可查看窗口状态、内存与缓存信息

## 下载安装

发布版本统一使用 GitHub Release，版本号格式为 `vX.Y.Z`（例如 `v1.0.0`）。

- 下载入口：仓库 `Releases` 页面
- Linux：下载 `.deb`
- Windows：下载 `.exe`（NSIS 安装包）

### Linux (`.deb`) 安装

```bash
sudo dpkg -i AIDispatchCenter-<version>-linux-x64.deb
# 若出现依赖问题
sudo apt-get -f install
```

### Windows (`.exe`) 安装

1. 双击 `AIDispatchCenter-<version>-windows-x64.exe`
2. 按安装向导完成安装
3. 从开始菜单启动 `AIDispatchCenter`

## 最小使用路径

1. 启动应用
2. 使用快捷键或命令拉起调度台
3. 在左侧栏选择 AI 服务，或在首页添加自定义入口

常用命令：

```bash
aidc toggle
aidc open chatgpt
aidc status
```

如果本机 `aidc` 尚未加入 PATH，可使用：

```bash
node ./bin/aidc.mjs toggle
```

## 平台说明

- Linux：支持 Unix socket 命令通道；X11 下冲突时可回退 GNOME 系统快捷键
- Windows：支持 named pipe 命令通道与 NSIS 安装包

## 开发与维护文档

开发命令、测试矩阵、打包发布流程、回滚指南见：

- [AGENTS.md](AGENTS.md)
