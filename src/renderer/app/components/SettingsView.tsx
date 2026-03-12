import { useState, type ChangeEvent } from "react";

import { UI_KEEP_ALIVE_MAX, UI_KEEP_ALIVE_MIN } from "../../../shared/constants";
import type {
  ShortcutAction,
  ShortcutStatus,
  ShortcutStatusItem,
  UiSettings,
  UiSettingsPatch
} from "../../../shared/types";
import { InfoTip } from "./InfoTip";

interface SettingsViewProps {
  uiSettings: UiSettings;
  shortcutStatus: ShortcutStatus;
  settingsError: string;
  onUpdateUiSettings: (patch: UiSettingsPatch) => Promise<void>;
}

interface HotkeyActionSpec {
  action: ShortcutAction;
  title: string;
  description: string;
  allowUnset: boolean;
  command: string;
}

const hotkeyActions: HotkeyActionSpec[] = [
  {
    action: "toggleWindow",
    title: "显示/隐藏调度台",
    description: "全局拉起、聚焦或隐藏主窗口",
    allowUnset: false,
    command: "aidc toggle"
  },
  {
    action: "providerNext",
    title: "切换到下一项服务",
    description: "若窗口隐藏，会先显示再切换",
    allowUnset: true,
    command: "aidc next"
  },
  {
    action: "providerPrev",
    title: "切换到上一项服务",
    description: "若窗口隐藏，会先显示再切换",
    allowUnset: true,
    command: "aidc prev"
  }
];

const hotkeyPresets = ["Ctrl+Alt+Q", "Ctrl+Alt+[", "Ctrl+Alt+]", "Ctrl+Alt+W", "Ctrl+Alt+E"];

function stateLabel(state: ShortcutStatusItem["state"]): string {
  if (state === "registered") {
    return "已注册";
  }
  if (state === "unbound") {
    return "未绑定";
  }
  if (state === "conflict") {
    return "冲突";
  }
  if (state === "duplicate") {
    return "重复";
  }
  return "无效";
}

function hotkeyValue(settings: UiSettings, action: ShortcutAction): string | null {
  if (action === "toggleWindow") {
    return settings.hotkeys.toggleWindow;
  }
  if (action === "providerNext") {
    return settings.hotkeys.providerNext;
  }
  return settings.hotkeys.providerPrev;
}

export function SettingsView(props: SettingsViewProps) {
  const {
    uiSettings,
    shortcutStatus,
    settingsError,
    onUpdateUiSettings
  } = props;
  const [clipboardMessage, setClipboardMessage] = useState("");

  function setKeepAlive(event: ChangeEvent<HTMLInputElement>): void {
    const keepAliveLimit = Number.parseInt(event.target.value, 10);
    void onUpdateUiSettings({ keepAliveLimit });
  }

  function setStartupView(startupView: UiSettings["startupView"]): void {
    if (startupView === uiSettings.startupView) {
      return;
    }
    void onUpdateUiSettings({ startupView });
  }

  function setLoadingOverlayMode(loadingOverlayMode: UiSettings["loadingOverlayMode"]): void {
    if (loadingOverlayMode === uiSettings.loadingOverlayMode) {
      return;
    }
    void onUpdateUiSettings({ loadingOverlayMode });
  }

  function updateHotkey(action: ShortcutAction, value: string): void {
    const normalized = value.trim();
    if (action === "toggleWindow") {
      if (!normalized) {
        return;
      }
      void onUpdateUiSettings({ hotkeys: { toggleWindow: normalized } });
      return;
    }
    if (action === "providerNext") {
      void onUpdateUiSettings({ hotkeys: { providerNext: normalized || null } });
      return;
    }
    void onUpdateUiSettings({ hotkeys: { providerPrev: normalized || null } });
  }

  function copyFallbackCommand(command: string): void {
    if (!navigator.clipboard?.writeText) {
      setClipboardMessage("当前环境不支持剪贴板 API，请手动复制。");
      return;
    }
    void navigator.clipboard.writeText(command).then(() => {
      setClipboardMessage("已复制回退命令。");
      window.setTimeout(() => setClipboardMessage(""), 1200);
    }).catch(() => {
      setClipboardMessage("复制失败，请手动复制。");
    });
  }

  return (
    <section className="settings-shell">
      <section className="settings-grid">
        <article className="panel">
          <div className="panel-title-row">
            <h3>性能与保活</h3>
            <InfoTip label="查看性能与保活说明">
              <ul className="info-tip-list">
                <li>控制 webview 缓存上限，平衡切换速度与内存占用。</li>
                <li>{UI_KEEP_ALIVE_MIN} 表示最省内存，{UI_KEEP_ALIVE_MAX} 表示切换更快。</li>
                <li>开启后响应更快，但会持续占用内存；关闭后点击关闭按钮将直接退出。</li>
              </ul>
            </InfoTip>
          </div>
          <label className="range-field">
            <span>保活数量：{uiSettings.keepAliveLimit}</span>
            <input
              type="range"
              min={UI_KEEP_ALIVE_MIN}
              max={UI_KEEP_ALIVE_MAX}
              step={1}
              value={uiSettings.keepAliveLimit}
              onChange={setKeepAlive}
            />
          </label>
          <label className="toggle-row">
            <span>后台常驻（关闭窗口仅隐藏）</span>
            <input
              type="checkbox"
              checked={uiSettings.backgroundResident}
              onChange={(event) => void onUpdateUiSettings({ backgroundResident: event.target.checked })}
            />
          </label>
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h3>窗口与侧栏</h3>
            <InfoTip label="查看窗口与侧栏说明">
              <ul className="info-tip-list">
                <li>侧栏自动隐藏只在工作区生效，首页和设置页保持固定显示。</li>
              </ul>
            </InfoTip>
          </div>
          <label className="toggle-row">
            <span>侧栏自动隐藏</span>
            <input
              type="checkbox"
              checked={uiSettings.sidebarAutoHide}
              onChange={(event) => void onUpdateUiSettings({ sidebarAutoHide: event.target.checked })}
            />
          </label>
          <div className="mode-group">
            <span>默认启动页面</span>
            <div className="segment-control">
              <button
                type="button"
                className={uiSettings.startupView === "workspace" ? "is-active" : ""}
                onClick={() => setStartupView("workspace")}
              >
                工作区
              </button>
              <button
                type="button"
                className={uiSettings.startupView === "home" ? "is-active" : ""}
                onClick={() => setStartupView("home")}
              >
                首页
              </button>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h3>加载与兼容</h3>
            <InfoTip label="查看加载与兼容说明">
              <ul className="info-tip-list">
                <li>优先保证首帧稳定反馈，必要时可自动回退独立窗口。</li>
              </ul>
            </InfoTip>
          </div>
          <div className="mode-group">
            <span>加载策略</span>
            <div className="segment-control">
              <button
                type="button"
                className={uiSettings.loadingOverlayMode === "immediate" ? "is-active" : ""}
                onClick={() => setLoadingOverlayMode("immediate")}
              >
                即时遮罩
              </button>
              <button
                type="button"
                className={uiSettings.loadingOverlayMode === "strict" ? "is-active" : ""}
                onClick={() => setLoadingOverlayMode("strict")}
              >
                严格检测
              </button>
            </div>
          </div>
          <label className="toggle-row">
            <span>内嵌失败时自动回退独立窗口</span>
            <input
              type="checkbox"
              checked={uiSettings.autoFallbackOnEmbedError}
              onChange={(event) => void onUpdateUiSettings({ autoFallbackOnEmbedError: event.target.checked })}
            />
          </label>
        </article>

        <article className="panel settings-placeholder">
          <h3>更多设置</h3>
          <small>此区域预留后续扩展功能。</small>
        </article>

        <article className="panel settings-wide">
          <div className="panel-title-row">
            <h3>快捷键</h3>
            <InfoTip label="查看快捷键说明">
              <ul className="info-tip-list">
                <li>默认 <code>Ctrl+Alt+Q</code>，<code>Ctrl+Alt+Tab</code> 与系统冲突概率高，不建议使用。</li>
                <li>请勿将系统快捷键绑定为 <code>npx aidc ...</code>，该路径会引入秒级启动开销。</li>
              </ul>
            </InfoTip>
          </div>
          <div className="hotkey-list">
            {hotkeyActions.map((item) => {
              const currentValue = hotkeyValue(uiSettings, item.action) ?? "";
              const status = shortcutStatus[item.action];
              return (
                <div className="hotkey-row" key={item.action}>
                  <div className="hotkey-meta">
                    <strong>{item.title}</strong>
                    <small>{item.description} · 命令：<code>{item.command}</code></small>
                    <span className={`shortcut-status shortcut-status-${status.state}`}>
                      {stateLabel(status.state)}
                    </span>
                    <small>{status.message}</small>
                    {status.fallbackCommand ? (
                      <div className="shortcut-fallback">
                        <code>{status.fallbackCommand}</code>
                        <button type="button" onClick={() => copyFallbackCommand(status.fallbackCommand ?? "")}>
                          复制命令
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="hotkey-controls">
                    <select
                      value={hotkeyPresets.includes(currentValue) ? currentValue : ""}
                      onChange={(event) => updateHotkey(item.action, event.target.value)}
                    >
                      {item.allowUnset ? <option value="">未设置</option> : null}
                      {!item.allowUnset ? <option value="">选择预设</option> : null}
                      {hotkeyPresets.map((preset) => (
                        <option key={preset} value={preset}>{preset}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={currentValue}
                      placeholder={item.allowUnset ? "留空表示不绑定" : "例如：Ctrl+Alt+Q"}
                      onChange={(event) => updateHotkey(item.action, event.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {clipboardMessage ? <p className="form-error settings-error">{clipboardMessage}</p> : null}
        </article>
      </section>
      {settingsError ? <p className="form-error settings-error">{settingsError}</p> : null}
    </section>
  );
}
