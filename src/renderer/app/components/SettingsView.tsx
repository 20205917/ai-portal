import { useEffect, useState, type CSSProperties, type ChangeEvent } from "react";

import { UI_KEEP_ALIVE_MAX, UI_KEEP_ALIVE_MIN } from "../../../shared/constants";
import type {
  ShortcutAction,
  ShortcutStatus,
  ShortcutStatusItem,
  UiSettings,
  UiSettingsPatch
} from "../../../shared/types";
import { InfoTip } from "./InfoTip";
import { TopBanner } from "./TopBanner";

interface SettingsViewProps {
  uiSettings: UiSettings;
  shortcutStatus: ShortcutStatus;
  settingsError: string;
  onUpdateUiSettings: (patch: UiSettingsPatch) => Promise<void>;
}

interface HotkeyActionSpec {
  action: ShortcutAction;
  title: string;
  allowUnset: boolean;
}

const hotkeyActions: HotkeyActionSpec[] = [
  {
    action: "toggleWindow",
    title: "显示/隐藏调度台",
    allowUnset: false
  },
  {
    action: "providerNext",
    title: "切换到下一项服务",
    allowUnset: true
  },
  {
    action: "providerPrev",
    title: "切换到上一项服务",
    allowUnset: true
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

  useEffect(() => {
    if (uiSettings.backgroundResident) {
      return;
    }
    void onUpdateUiSettings({ backgroundResident: true });
  }, [uiSettings.backgroundResident, onUpdateUiSettings]);

  const keepAliveRange = UI_KEEP_ALIVE_MAX - UI_KEEP_ALIVE_MIN;
  const keepAlivePercent = keepAliveRange > 0
    ? ((uiSettings.keepAliveLimit - UI_KEEP_ALIVE_MIN) / keepAliveRange) * 100
    : 0;

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

  function setSidebarAutoHide(sidebarAutoHide: boolean): void {
    if (sidebarAutoHide === uiSettings.sidebarAutoHide) {
      return;
    }
    void onUpdateUiSettings({ sidebarAutoHide });
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
      <TopBanner />
      <section className="settings-grid">
        <article className="panel">
          <div className="settings-option-row settings-option-row-slider">
            <span className="settings-option-name">缓存服务数量</span>
            <span className="settings-option-detail">
              服务后台缓存,切换时可快速启动。
            </span>
            <div
              className="settings-slider-control"
              style={{ "--slider-percent": `${keepAlivePercent}%` } as CSSProperties}
            >
              <span className="settings-slider-value" aria-hidden="true">{uiSettings.keepAliveLimit}</span>
              <input
                type="range"
                min={UI_KEEP_ALIVE_MIN}
                max={UI_KEEP_ALIVE_MAX}
                step={1}
                value={uiSettings.keepAliveLimit}
                onChange={setKeepAlive}
                aria-label="保活数量"
              />
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="settings-option-row">
            <span className="settings-option-name">侧栏自动隐藏</span>
            <span className="settings-option-detail">仅工作区自动隐藏，首页/设置固定显示。</span>
            <div className="segment-control">
              <button
                type="button"
                className={uiSettings.sidebarAutoHide ? "is-active" : ""}
                onClick={() => setSidebarAutoHide(true)}
              >
                开启
              </button>
              <button
                type="button"
                className={!uiSettings.sidebarAutoHide ? "is-active" : ""}
                onClick={() => setSidebarAutoHide(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="settings-option-row">
            <span className="settings-option-name">默认启动页面</span>
            <span className="settings-option-detail">应用启动后默认进入页面。</span>
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
              const statusText = stateLabel(status.state);
              const normalizedMessage = status.message.trim();
              const showStatusMessage = normalizedMessage.length > 0 && normalizedMessage !== statusText;
              return (
                <div className="hotkey-row" key={item.action}>
                  <div className="hotkey-meta">
                    <strong>{item.title}</strong>
                    <span className={`shortcut-status shortcut-status-${status.state}`}>
                      {statusText}
                    </span>
                    {showStatusMessage ? <small>{status.message}</small> : null}
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
