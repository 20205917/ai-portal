import { useEffect, useState, type CSSProperties, type ChangeEvent, type KeyboardEvent } from "react";
import { DEFAULT_TOGGLE_WINDOW_HOTKEY, UI_KEEP_ALIVE_MAX, UI_KEEP_ALIVE_MIN } from "../../../shared/constants";
import type {
  ShortcutAction,
  ShortcutStatus,
  ShortcutStatusItem,
  UiSettings,
  UiSettingsPatch
} from "../../../shared/types";
import {
  resolveHotkeyEditorCommand,
  resolveHotkeySubmitValue,
  shouldBypassHotkeyCapture
} from "../hotkey-capture";
import { InfoTip } from "./InfoTip";
import { TopBanner } from "./TopBanner";

interface SettingsViewProps {
  uiSettings: UiSettings;
  launchAtLoginSupported: boolean;
  shortcutStatus: ShortcutStatus;
  settingsError: string;
  onUpdateUiSettings: (patch: UiSettingsPatch) => Promise<void>;
}

interface HotkeyActionSpec {
  action: ShortcutAction;
  title: string;
  allowUnset: boolean;
}

interface HotkeyDraftState {
  value: string;
  error: string;
  recording: boolean;
  saving: boolean;
}

type HotkeyDraftMap = Record<ShortcutAction, HotkeyDraftState>;

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

const HOTKEY_ACTIONS: ShortcutAction[] = ["toggleWindow", "providerNext", "providerPrev"];

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

function createDraftState(value: string): HotkeyDraftState {
  return {
    value,
    error: "",
    recording: false,
    saving: false
  };
}

function createHotkeyDrafts(settings: UiSettings): HotkeyDraftMap {
  return {
    toggleWindow: createDraftState(hotkeyValue(settings, "toggleWindow") ?? ""),
    providerNext: createDraftState(hotkeyValue(settings, "providerNext") ?? ""),
    providerPrev: createDraftState(hotkeyValue(settings, "providerPrev") ?? "")
  };
}

function syncDraftsWithSettings(current: HotkeyDraftMap, settings: UiSettings): HotkeyDraftMap {
  let changed = false;
  const next: HotkeyDraftMap = { ...current };

  for (const action of HOTKEY_ACTIONS) {
    const previous = current[action];
    if (previous.recording || previous.saving) {
      continue;
    }

    const savedValue = hotkeyValue(settings, action) ?? "";
    if (savedValue !== previous.value || previous.error) {
      next[action] = {
        ...previous,
        value: savedValue,
        error: ""
      };
      changed = true;
    }
  }

  return changed ? next : current;
}

function buildHotkeyPatch(action: ShortcutAction, value: string | null): UiSettingsPatch {
  if (action === "toggleWindow") {
    return {
      hotkeys: {
        toggleWindow: value ?? DEFAULT_TOGGLE_WINDOW_HOTKEY
      }
    };
  }
  if (action === "providerNext") {
    return {
      hotkeys: {
        providerNext: value
      }
    };
  }
  return {
    hotkeys: {
      providerPrev: value
    }
  };
}

export function SettingsView(props: SettingsViewProps) {
  const {
    uiSettings,
    launchAtLoginSupported,
    shortcutStatus,
    settingsError,
    onUpdateUiSettings
  } = props;
  const [clipboardMessage, setClipboardMessage] = useState("");
  const [hotkeyDrafts, setHotkeyDrafts] = useState<HotkeyDraftMap>(() => createHotkeyDrafts(uiSettings));

  useEffect(() => {
    if (uiSettings.backgroundResident) {
      return;
    }
    void onUpdateUiSettings({ backgroundResident: true });
  }, [uiSettings.backgroundResident, onUpdateUiSettings]);

  useEffect(() => {
    setHotkeyDrafts((current) => syncDraftsWithSettings(current, uiSettings));
  }, [
    uiSettings.hotkeys.toggleWindow,
    uiSettings.hotkeys.providerNext,
    uiSettings.hotkeys.providerPrev
  ]);

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

  function setLaunchAtLogin(launchAtLogin: boolean): void {
    if (!launchAtLoginSupported) {
      return;
    }
    if (launchAtLogin === uiSettings.launchAtLogin) {
      return;
    }
    void onUpdateUiSettings({ launchAtLogin });
  }

  function updateHotkeyDraft(action: ShortcutAction, patch: Partial<HotkeyDraftState>): void {
    setHotkeyDrafts((current) => {
      const previous = current[action];
      const nextItem: HotkeyDraftState = {
        ...previous,
        ...patch
      };

      if (
        nextItem.value === previous.value
        && nextItem.error === previous.error
        && nextItem.recording === previous.recording
        && nextItem.saving === previous.saving
      ) {
        return current;
      }

      return {
        ...current,
        [action]: nextItem
      };
    });
  }

  function restoreHotkeyDraft(action: ShortcutAction): void {
    updateHotkeyDraft(action, {
      value: hotkeyValue(uiSettings, action) ?? "",
      error: "",
      recording: false
    });
  }

  async function commitHotkey(action: ShortcutAction, rawValue: string): Promise<void> {
    const resolved = resolveHotkeySubmitValue(action, rawValue);
    if (!resolved.ok) {
      updateHotkeyDraft(action, {
        error: resolved.message,
        recording: false
      });
      return;
    }

    const savedValue = hotkeyValue(uiSettings, action);
    if (resolved.value === savedValue) {
      updateHotkeyDraft(action, {
        error: "",
        recording: false
      });
      return;
    }

    updateHotkeyDraft(action, {
      saving: true,
      recording: false,
      error: ""
    });
    try {
      await onUpdateUiSettings(buildHotkeyPatch(action, resolved.value));
    } catch {
      updateHotkeyDraft(action, {
        error: "保存失败，请重试。"
      });
    } finally {
      updateHotkeyDraft(action, {
        saving: false
      });
    }
  }

  function commitHotkeyDraft(action: ShortcutAction): void {
    void commitHotkey(action, hotkeyDrafts[action].value);
  }

  function clearOptionalHotkey(action: ShortcutAction): void {
    if (action === "toggleWindow") {
      return;
    }
    updateHotkeyDraft(action, {
      value: "",
      error: ""
    });
    void commitHotkey(action, "");
  }

  function restoreDefaultToggleHotkey(): void {
    updateHotkeyDraft("toggleWindow", {
      value: DEFAULT_TOGGLE_WINDOW_HOTKEY,
      error: ""
    });
    void commitHotkey("toggleWindow", DEFAULT_TOGGLE_WINDOW_HOTKEY);
  }

  function handleHotkeyKeyDown(action: ShortcutAction, event: KeyboardEvent<HTMLInputElement>): void {
    const input = {
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey
    };
    if (shouldBypassHotkeyCapture(input)) {
      return;
    }

    event.preventDefault();
    const command = resolveHotkeyEditorCommand(input);
    if (command.type === "submit") {
      commitHotkeyDraft(action);
      return;
    }
    if (command.type === "cancel") {
      restoreHotkeyDraft(action);
      event.currentTarget.blur();
      return;
    }
    if (command.type === "capture") {
      updateHotkeyDraft(action, {
        value: command.accelerator,
        error: ""
      });
      return;
    }

    updateHotkeyDraft(action, {
      error: command.message
    });
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
            <span className="settings-option-name">开机自启</span>
            <span className="settings-option-detail">
              {launchAtLoginSupported
                ? "系统登录后静默启动并驻留托盘，不主动弹出主窗口。"
                : "当前平台暂不支持（仅 macOS / Windows）。"}
            </span>
            <div className="segment-control">
              <button
                type="button"
                className={uiSettings.launchAtLogin ? "is-active" : ""}
                onClick={() => setLaunchAtLogin(true)}
                disabled={!launchAtLoginSupported}
              >
                开启
              </button>
              <button
                type="button"
                className={!uiSettings.launchAtLogin ? "is-active" : ""}
                onClick={() => setLaunchAtLogin(false)}
                disabled={!launchAtLoginSupported}
              >
                关闭
              </button>
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
                <li>录制规则：至少包含一个修饰键（Ctrl/Alt/Shift/Cmd）。</li>
                <li>请勿将系统快捷键绑定为 <code>npx aidc ...</code>，该路径会引入秒级启动开销。</li>
              </ul>
            </InfoTip>
          </div>
          <div className="hotkey-list">
            {hotkeyActions.map((item) => {
              const draft = hotkeyDrafts[item.action];
              const currentValue = draft?.value ?? "";
              const status = shortcutStatus[item.action];
              const statusText = stateLabel(status.state);
              const normalizedMessage = status.message.trim();
              const showStatusMessage = normalizedMessage.length > 0 && normalizedMessage !== statusText;
              const inputClassName = [
                "hotkey-input",
                draft?.recording ? "is-recording" : "",
                draft?.error ? "is-invalid" : ""
              ].filter(Boolean).join(" ");
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
                    <input
                      type="text"
                      value={currentValue}
                      className={inputClassName}
                      placeholder={draft.recording ? "按下组合键..." : "按下组合键"}
                      onFocus={() => updateHotkeyDraft(item.action, { recording: true, error: "" })}
                      onBlur={() => commitHotkeyDraft(item.action)}
                      onKeyDown={(event) => handleHotkeyKeyDown(item.action, event)}
                      readOnly
                      disabled={draft.saving}
                      aria-invalid={Boolean(draft.error)}
                    />
                    <div className="hotkey-action-row">
                      <button
                        type="button"
                        className="hotkey-action-button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => restoreHotkeyDraft(item.action)}
                        disabled={draft.saving}
                      >
                        恢复
                      </button>
                      {item.allowUnset ? (
                        <button
                          type="button"
                          className="hotkey-action-button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => clearOptionalHotkey(item.action)}
                          disabled={draft.saving}
                        >
                          清除
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="hotkey-action-button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={restoreDefaultToggleHotkey}
                          disabled={draft.saving}
                        >
                          恢复默认
                        </button>
                      )}
                    </div>
                    {draft.recording ? <small className="hotkey-hint">按下组合键，Enter 提交，Esc 取消。</small> : null}
                    {draft.saving ? <small className="hotkey-hint">保存中...</small> : null}
                    {draft.error ? <small className="hotkey-local-error">{draft.error}</small> : null}
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
