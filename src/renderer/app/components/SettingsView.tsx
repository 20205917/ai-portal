import type { ChangeEvent } from "react";

import { UI_KEEP_ALIVE_MAX, UI_KEEP_ALIVE_MIN } from "../../../shared/constants";
import type {
  ProviderDefinition,
  UiSettings,
  UiSettingsPatch
} from "../../../shared/types";

interface SettingsViewProps {
  providers: ProviderDefinition[];
  uiSettings: UiSettings;
  settingsError: string;
  engineLabels: Record<ProviderDefinition["engine"], string>;
  onUpdateUiSettings: (patch: UiSettingsPatch) => Promise<void>;
  onSetProviderEngine: (providerId: string, engine: ProviderDefinition["engine"]) => Promise<void>;
}

export function SettingsView(props: SettingsViewProps) {
  const {
    providers,
    uiSettings,
    settingsError,
    engineLabels,
    onUpdateUiSettings,
    onSetProviderEngine
  } = props;

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

  return (
    <section className="settings-shell">
      <section className="settings-grid">
        <article className="panel">
          <h3>性能与保活</h3>
          <p>控制 webview 缓存上限，平衡切换速度与内存占用。</p>
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
            <small>{UI_KEEP_ALIVE_MIN} 表示最省内存，{UI_KEEP_ALIVE_MAX} 表示切换更快。</small>
          </label>
        </article>

        <article className="panel">
          <h3>窗口与侧栏</h3>
          <p>侧栏自动隐藏只在工作区生效，首页和设置页保持固定显示。</p>
          <label className="toggle-row">
            <span>侧栏自动隐藏（X11 优先策略）</span>
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
          <h3>加载与兼容</h3>
          <p>优先保证首帧稳定反馈，必要时可自动回退独立窗口。</p>
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

        <article className="panel settings-wide">
          <h3>服务模式</h3>
          <p>默认使用内嵌模式；如果某个站点兼容性不稳定，可以切到独立回退窗。</p>
          <div className="settings-list">
            {providers.map((provider) => {
              const canFallback = provider.fallbackMode === "isolated-external";
              const targetMode = provider.engine === "embedded" ? "isolated-external" : "embedded";

              return (
                <div className="provider-setting" key={provider.id}>
                  <div>
                    <strong>{provider.label}</strong>
                    <small>{engineLabels[provider.engine]}</small>
                  </div>
                  <div className="provider-setting-actions">
                    {canFallback ? (
                      <button
                        type="button"
                        onClick={() => void onSetProviderEngine(provider.id, targetMode)}
                      >
                        {provider.engine === "embedded" ? "切到独立窗口" : "恢复内嵌模式"}
                      </button>
                    ) : (
                      <button type="button" disabled>
                        不支持回退
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {settingsError ? <p className="form-error settings-error">{settingsError}</p> : null}
        </article>
      </section>
    </section>
  );
}
