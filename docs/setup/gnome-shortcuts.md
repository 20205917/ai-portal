# GNOME 快捷键接入

`AIDispatchCenter` 不在应用内部抢全局快捷键。当前默认适配环境是本机 `Ubuntu GNOME X11 (ubuntu-xorg)`，建议直接把系统快捷键绑定到 CLI 命令。

## 推荐绑定

- `Super + A` -> `aidc toggle`

## 手动配置

在 Ubuntu 的 `设置 -> 键盘 -> 键盘快捷键 -> 自定义快捷键` 中新增：

- 名称：`AI 调度台切换`
- 命令：`aidc toggle`
- 快捷键：`Super + A`

## 脚本化安装

如果你已经在系统里安装了 `gsettings`，可以运行：

```bash
./scripts/install-gnome-shortcut.sh "AI 调度台切换" "<Super>a>" "aidc toggle"
```

## 验收点

- 快捷键触发时，只控制 AIDC 主窗口
- 普通浏览器窗口不应被误聚焦或误隐藏
- 连续按下快捷键时，行为保持 `show/focus/hide` 三态切换
