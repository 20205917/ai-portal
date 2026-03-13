import type { FormEvent } from "react";

import type {
  NewProviderInput,
  ProviderDefinition,
  RuntimeSnapshot,
  SystemMetricsSnapshot,
  UiSettings
} from "../../../shared/types";
import { buildContinueActionDescription, buildContinueActionLabel } from "../ux-copy";
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
  onContinueWithActiveProvider: () => Promise<void>;
  onOpenProvider: (providerId: string) => Promise<void>;
  onOpenSettings: () => void;
  onHideWindow: () => Promise<void>;
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
  return engine === "embedded" ? "内嵌模式" : "独立窗口模式";
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
    onContinueWithActiveProvider,
    onOpenProvider,
    onOpenSettings,
    onHideWindow,
    onToggleProviderVisibility,
    onRemoveProvider,
    onSetProviderEngine,
    onCreateProvider
  } = props;

  const cachedEmbeddedProviders = cachedEmbeddedProviderIds
    .map((providerId) => providers.find((provider) => provider.id === providerId))
    .filter((provider): provider is ProviderDefinition => Boolean(provider));
  const otherVisibleProviders = visibleProviders.filter((provider) => provider.id !== activeProvider.id);

  return (
    <section className="home-shell">
      <section className="home-panel panel home-launch-panel">
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
              <span className="eyebrow">继续使用</span>
              <div className="home-launch-title-row">
                <h2>{activeProvider.label}</h2>
                <span className="home-runtime-badge">{runtimeLabel(runtime.state)}</span>
              </div>
              <p>{buildContinueActionDescription(activeProvider)}</p>
              <div className="home-launch-meta">
                <span className="tag">{hostLabel(activeProvider.url)}</span>
                <span className="tag">{providerEngineLabel(activeProvider.engine)}</span>
                {cachedEmbeddedProviderIds.includes(activeProvider.id) ? <span className="tag">已缓存</span> : null}
              </div>
            </div>
          </div>
          <div className="home-launch-actions">
            <button type="button" className="primary-action home-primary-action" onClick={() => void onContinueWithActiveProvider()}>
              {buildContinueActionLabel(activeProvider)}
            </button>
            <button type="button" className="secondary-action" onClick={onOpenSettings}>
              设置
            </button>
            <button type="button" className="secondary-action" onClick={() => void onHideWindow()}>
              隐藏
            </button>
          </div>
        </div>
        <div className="home-hero-stats">
          <article className="hero-stat-card">
            <span>缓存服务</span>
            <strong>{cachedEmbeddedProviders.length} / {uiSettings.keepAliveLimit}</strong>
          </article>
          <article className="hero-stat-card">
            <span>内存占用</span>
            <strong>{systemMetrics.memoryMb.toFixed(0)} MB</strong>
          </article>
          <article className="hero-stat-card">
            <span>CPU</span>
            <strong>{systemMetrics.cpuPercent.toFixed(1)}%</strong>
          </article>
        </div>
      </section>

      <section className="home-dashboard">
        <section className="home-panel panel">
          <div className="panel-title-row">
            <h3>{otherVisibleProviders.length > 0 ? "其他常用服务" : "快速打开"}</h3>
            <InfoTip label="查看快速打开说明">
              <ul className="info-tip-list">
                <li>顶部主按钮优先回到当前服务，这里保留其他常用入口，方便临时切换。</li>
              </ul>
            </InfoTip>
          </div>
          {otherVisibleProviders.length > 0 ? (
            <div className="home-grid">
              {otherVisibleProviders.map((provider) => (
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
          ) : (
            <p className="home-inline-note">当前只显示一个服务。你可以在下方继续添加新的 AI 入口，或把隐藏的服务重新显示出来。</p>
          )}
        </section>

        <section className="home-panel panel home-overview-panel">
          <div className="panel-title-row">
            <h3>运行概览</h3>
            <InfoTip label="查看运行概览说明">
              <ul className="info-tip-list">
                <li>这里保留关键运行信息，方便判断当前状态，但不再作为首页主入口。</li>
              </ul>
            </InfoTip>
          </div>
          <div className="status-grid">
            <article className="status-card">
              <span>当前活跃服务</span>
              <strong>{activeProvider.label}</strong>
              <small>{hostLabel(activeProvider.url)}</small>
            </article>
            <article className="status-card">
              <span>窗口状态</span>
              <strong>{runtimeLabel(runtime.state)}</strong>
              <small>{uiSettings.backgroundResident ? "关闭窗口时默认隐藏" : "关闭窗口时直接退出"}</small>
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
              <small>{cachedEmbeddedProviders.length > 0 ? "已缓存常用页面" : "当前没有保活页面"}</small>
            </article>
            <article className="status-card">
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
              <strong>{systemMetrics.memoryMb.toFixed(1)} MB</strong>
              <small>
                {systemMetrics.privateMemorySupported
                  ? `私有 ${systemMetrics.privateMemoryMb.toFixed(1)} MB`
                  : "私有口径当前平台不可用"}
              </small>
            </article>
            <article className="status-card">
              <span>CPU 与进程</span>
              <strong>{systemMetrics.cpuPercent.toFixed(1)}%</strong>
              <small>{systemMetrics.processCount} 个进程正在运行</small>
            </article>
            <article className="status-card">
              <span>体验策略</span>
              <strong>{uiSettings.loadingOverlayMode === "immediate" ? "即时遮罩" : "严格检测"}</strong>
              <small>{uiSettings.sidebarAutoHide ? "侧栏自动隐藏已开启" : "侧栏固定显示"}</small>
            </article>
          </div>
        </section>
      </section>

      <section className="home-split">
        <article className="panel">
          <div className="panel-title-row">
            <h3>左侧栏与服务模式</h3>
            <InfoTip label="查看左侧栏说明">
              <ul className="info-tip-list">
                <li>这里控制左侧栏是否显示某个服务，以及它默认以内嵌还是独立窗口运行。</li>
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
