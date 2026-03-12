import type { FormEvent } from "react";

import type {
  NewProviderInput,
  ProviderDefinition,
  RuntimeSnapshot,
  SystemMetricsSnapshot,
  UiSettings
} from "../../../shared/types";
import { glyphFor, hostLabel, providerIconStyle } from "../provider-visual";
import { InfoTip } from "./InfoTip";

interface HomeViewProps {
  providers: ProviderDefinition[];
  visibleProviders: ProviderDefinition[];
  activeProvider: ProviderDefinition;
  runtime: RuntimeSnapshot;
  uiSettings: UiSettings;
  systemMetrics: SystemMetricsSnapshot;
  cachedEmbeddedProviderIds: string[];
  form: NewProviderInput;
  formBusy: boolean;
  formError: string;
  setForm: (next: NewProviderInput) => void;
  onOpenProvider: (providerId: string) => Promise<void>;
  onOpenSettings: () => void;
  onToggleProviderVisibility: (provider: ProviderDefinition) => Promise<void>;
  onRemoveProvider: (provider: ProviderDefinition) => Promise<void>;
  onSetProviderEngine: (providerId: string, engine: ProviderDefinition["engine"]) => Promise<void>;
  onCreateProvider: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

function runtimeLabel(runtime: RuntimeSnapshot["state"]): string {
  if (runtime === "visible-focused") {
    return "前台显示";
  }
  if (runtime === "visible-unfocused") {
    return "后台可见";
  }
  if (runtime === "hidden") {
    return "已隐藏";
  }
  return "未启动";
}

function providerEngineLabel(engine: ProviderDefinition["engine"]): string {
  return engine === "embedded" ? "内嵌模式" : "独立回退窗";
}

export function HomeView(props: HomeViewProps) {
  const {
    providers,
    visibleProviders,
    activeProvider,
    runtime,
    uiSettings,
    systemMetrics,
    cachedEmbeddedProviderIds,
    form,
    formBusy,
    formError,
    setForm,
    onOpenProvider,
    onOpenSettings,
    onToggleProviderVisibility,
    onRemoveProvider,
    onSetProviderEngine,
    onCreateProvider
  } = props;

  const cachedEmbeddedProviders = cachedEmbeddedProviderIds
    .map((providerId) => providers.find((provider) => provider.id === providerId))
    .filter((provider): provider is ProviderDefinition => Boolean(provider));

  return (
    <section className="home-shell">
      <section className="home-panel panel home-status-panel">
        <div className="home-status-header">
          <div className="panel-title-row">
            <h2>AI 调度台首页</h2>
            <InfoTip label="查看首页说明">
              <ul className="info-tip-list">
                <li>当前状态与关键策略一屏可见，支持快速切换入口。</li>
              </ul>
            </InfoTip>
          </div>
          <button type="button" className="primary-action" onClick={onOpenSettings}>
            打开设置
          </button>
        </div>
        <div className="status-grid">
          <article className="status-card">
            <span>CPU</span>
            <strong>{systemMetrics.cpuPercent.toFixed(1)}%</strong>
          </article>
          <article className="status-card">
            <span className="status-label-row">
              <span>总内存</span>
              <InfoTip label="查看内存口径与明细">
                <ul className="info-tip-list">
                  <li>总内存：{systemMetrics.memoryMb.toFixed(1)} MB（应用全部进程工作集）</li>
                  {systemMetrics.privateMemorySupported ? (
                    <li>私有内存：{systemMetrics.privateMemoryMb.toFixed(1)} MB（更接近真实独占）</li>
                  ) : (
                    <li>私有内存：当前平台未提供该口径，已隐藏。</li>
                  )}
                  <li>Browser：{systemMetrics.memoryByProcessType.browserMb.toFixed(1)} MB</li>
                  <li>GPU：{systemMetrics.memoryByProcessType.gpuMb.toFixed(1)} MB</li>
                  <li>Tab：{systemMetrics.memoryByProcessType.tabMb.toFixed(1)} MB</li>
                  <li>Network：{systemMetrics.memoryByProcessType.networkServiceMb.toFixed(1)} MB</li>
                  <li>Utility：{systemMetrics.memoryByProcessType.utilityMb.toFixed(1)} MB</li>
                  <li>Other：{systemMetrics.memoryByProcessType.otherMb.toFixed(1)} MB</li>
                  <li>进程数：{systemMetrics.processCount}</li>
                </ul>
              </InfoTip>
            </span>
            <strong>{systemMetrics.memoryMb.toFixed(1)} MB</strong>
            <small>
              {systemMetrics.privateMemorySupported
                ? `私有 ${systemMetrics.privateMemoryMb.toFixed(1)} MB`
                : "私有口径当前平台不可用"}
            </small>
          </article>
          <article className="status-card">
            <span className="status-label-row">
              <span>缓存服务</span>
              <InfoTip label="查看缓存服务详情">
                <ul className="info-tip-list">
                  <li>当前缓存：{cachedEmbeddedProviders.length} / {uiSettings.keepAliveLimit}</li>
                  <li>仅统计保活缓存，不包含当前正在展示的服务。</li>
                  {cachedEmbeddedProviders.length > 0 ? (
                    cachedEmbeddedProviders.map((provider) => (
                      <li key={provider.id}>{provider.label}</li>
                    ))
                  ) : (
                    <li>当前没有缓存中的内嵌服务。</li>
                  )}
                </ul>
              </InfoTip>
            </span>
            <strong>{cachedEmbeddedProviders.length} / {uiSettings.keepAliveLimit}</strong>
          </article>
          <article className="status-card">
            <span>窗口状态</span>
            <strong>{runtimeLabel(runtime.state)}</strong>
          </article>
          <article className="status-card">
            <span>当前活跃服务</span>
            <strong>{activeProvider.label}</strong>
          </article>
          <article className="status-card">
            <span>加载策略</span>
            <strong>{uiSettings.loadingOverlayMode === "immediate" ? "即时遮罩" : "严格检测"}</strong>
          </article>
          <article className="status-card">
            <span>侧栏自动隐藏</span>
            <strong>{uiSettings.sidebarAutoHide ? "已开启" : "已关闭"}</strong>
          </article>
          <article className="status-card">
            <span>后台常驻</span>
            <strong>{uiSettings.backgroundResident ? "已开启" : "已关闭"}</strong>
          </article>
        </div>
      </section>

      <section className="home-panel panel">
        <div className="panel-title-row">
          <h3>快速打开</h3>
          <InfoTip label="查看快速打开说明">
            <ul className="info-tip-list">
              <li>从这里打开常用 AI，也可以直观看到每个入口的当前模式。</li>
            </ul>
          </InfoTip>
        </div>
        <div className="home-grid">
          {visibleProviders.map((provider) => (
            <button
              type="button"
              key={provider.id}
              className="home-card"
              onClick={() => void onOpenProvider(provider.id)}
            >
              <span className="home-card-icon" style={providerIconStyle(provider)}>
                {provider.iconDataUrl ? (
                  <img className="provider-icon-image" src={provider.iconDataUrl} alt="" />
                ) : (
                  glyphFor(provider)
                )}
              </span>
              <span className="home-card-text">
                <strong>{provider.label}</strong>
                <small>{hostLabel(provider.url)}</small>
                <span className="home-card-tags">
                  <em className="tag">{provider.engine === "embedded" ? "内嵌模式" : "独立窗口"}</em>
                  <em className="tag">{provider.enabled ? "侧栏显示" : "侧栏隐藏"}</em>
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="home-split">
        <article className="panel">
          <h3>左侧栏与服务模式</h3>
          <div className="manage-list">
            {providers.map((provider) => (
              <div className="manage-row" key={provider.id}>
                <div className="manage-meta">
                  <span className="manage-icon" style={providerIconStyle(provider)}>
                    {provider.iconDataUrl ? (
                      <img className="provider-icon-image" src={provider.iconDataUrl} alt="" />
                    ) : (
                      glyphFor(provider)
                    )}
                  </span>
                  <div>
                    <strong>{provider.label}</strong>
                    <small className="manage-mode-tag">{providerEngineLabel(provider.engine)}</small>
                  </div>
                </div>
                <div className="manage-actions">
                  {provider.removable ? (
                    <button type="button" className="danger-action" onClick={() => void onRemoveProvider(provider)}>
                      删除
                    </button>
                  ) : null}
                  <button type="button" onClick={() => void onToggleProviderVisibility(provider)}>
                    {provider.enabled ? "隐藏" : "显示"}
                  </button>
                  {provider.fallbackMode === "isolated-external" ? (
                    <button
                      type="button"
                      onClick={() =>
                        void onSetProviderEngine(
                          provider.id,
                          provider.engine === "embedded" ? "isolated-external" : "embedded"
                        )
                      }
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
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h3>添加 AI 网页</h3>
            <InfoTip label="查看添加 AI 网页说明">
              <ul className="info-tip-list">
                <li>图标会优先抓取网站 favicon，失败时自动回退为字母图标。</li>
              </ul>
            </InfoTip>
          </div>
          <form className="home-form" onSubmit={(event) => void onCreateProvider(event)}>
            <label className="field">
              <span>名称</span>
              <input
                type="text"
                value={form.label}
                placeholder="例如：Claude"
                onChange={(event) => setForm({ ...form, label: event.target.value })}
              />
            </label>
            <label className="field">
              <span>网址</span>
              <input
                type="text"
                value={form.url}
                placeholder="例如：claude.ai"
                onChange={(event) => setForm({ ...form, url: event.target.value })}
              />
            </label>
            {formError ? <p className="form-error">{formError}</p> : null}
            <button type="submit" className="primary-action" disabled={formBusy}>
              {formBusy ? "添加中…" : "添加到左侧栏"}
            </button>
          </form>
        </article>
      </section>
    </section>
  );
}
