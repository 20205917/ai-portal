import type { FormEvent } from "react";

import type {
  NewProviderInput,
  ProviderDefinition,
  SystemMetricsSnapshot,
  UiSettings
} from "../../../shared/types";
import { glyphFor, hostLabel, providerIconStyle } from "../provider-visual";
import { InfoTip } from "./InfoTip";
import { TopBanner } from "./TopBanner";

interface HomeViewProps {
  providers: ProviderDefinition[];
  activeProvider: ProviderDefinition;
  uiSettings: UiSettings;
  systemMetrics: SystemMetricsSnapshot;
  cachedEmbeddedProviderIds: string[];
  form: NewProviderInput;
  formBusy: boolean;
  formError: string;
  setForm: (next: NewProviderInput) => void;
  onOpenProvider: (providerId: string) => Promise<void>;
  onHideWindow: () => Promise<void>;
  onToggleProviderVisibility: (provider: ProviderDefinition) => Promise<void>;
  onRemoveProvider: (provider: ProviderDefinition) => Promise<void>;
  onSetProviderEngine: (providerId: string, engine: ProviderDefinition["engine"]) => Promise<void>;
  onCreateProvider: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function HomeView(props: HomeViewProps) {
  const {
    providers,
    activeProvider,
    uiSettings,
    systemMetrics,
    cachedEmbeddedProviderIds,
    form,
    formBusy,
    formError,
    setForm,
    onOpenProvider,
    onHideWindow,
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
      <TopBanner
        className="home-top-banner"
        actions={(
          <button type="button" className="secondary-action" onClick={() => void onHideWindow()}>
            隐藏
          </button>
        )}
      />
      <section className="home-panel panel home-launch-panel">
        <button
          type="button"
          className="home-launch-button"
          onClick={() => void onOpenProvider(activeProvider.id)}
          aria-label={`打开 ${activeProvider.label}`}
        >
          <div className="home-launch-hero">
            <div className="home-launch-main">
              <span className="home-launch-icon" style={providerIconStyle(activeProvider)}>
                {activeProvider.iconDataUrl ? (
                  <img className="provider-icon-image" src={activeProvider.iconDataUrl} alt="" />
                ) : (
                  glyphFor(activeProvider)
                )}
              </span>
              <div className="home-launch-copy">
                <span className="eyebrow">上次打开服务</span>
                <h2>{activeProvider.label}</h2>
                <div className="home-launch-meta">
                  <span className="home-launch-url" title={activeProvider.url}>
                    {hostLabel(activeProvider.url)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </button>
      </section>

      <section className="home-panel panel home-metrics-panel">
        <div className="home-hero-stats">
          <article className="hero-stat-card">
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
            <small>{cachedEmbeddedProviders.length > 0 ? "已缓存服务页面" : "当前没有保活页面"}</small>
          </article>
          <article className="hero-stat-card">
            <span className="status-label-row">
              <span>内存占用</span>
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
                </ul>
              </InfoTip>
            </span>
            <strong>{systemMetrics.memoryMb.toFixed(0)} MB</strong>
            <small>
              {systemMetrics.privateMemorySupported
                ? `私有 ${systemMetrics.privateMemoryMb.toFixed(0)} MB`
                : "私有口径当前平台不可用"}
            </small>
          </article>
          <article className="hero-stat-card">
            <span className="status-label-row">
              <span>CPU</span>
              <InfoTip label="查看 CPU 详情">
                <ul className="info-tip-list">
                  <li>CPU 占用：{systemMetrics.cpuPercent.toFixed(1)}%</li>
                  <li>进程数：{systemMetrics.processCount}</li>
                </ul>
              </InfoTip>
            </span>
            <strong>{systemMetrics.cpuPercent.toFixed(1)}%</strong>
            <small>{systemMetrics.processCount} 个进程正在运行</small>
          </article>
        </div>
      </section>

      <section className="home-split">
        <article className="panel">
          <div className="panel-title-row">
            <h3>左侧栏服务与网页地址</h3>
            <InfoTip label="查看左侧栏说明">
              <ul className="info-tip-list">
                <li>这里控制左侧栏是否显示某个服务，并展示对应网页地址。</li>
              </ul>
            </InfoTip>
          </div>
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
                    <small className="manage-mode-tag" title={provider.url}>{provider.url}</small>
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
