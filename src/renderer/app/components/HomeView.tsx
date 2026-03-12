import type { FormEvent } from "react";

import type {
  NewProviderInput,
  ProviderDefinition,
  RuntimeSnapshot,
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
  form: NewProviderInput;
  formBusy: boolean;
  formError: string;
  setForm: (next: NewProviderInput) => void;
  onOpenProvider: (providerId: string) => Promise<void>;
  onOpenSettings: () => void;
  onToggleProviderVisibility: (provider: ProviderDefinition) => Promise<void>;
  onRemoveProvider: (provider: ProviderDefinition) => Promise<void>;
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

export function HomeView(props: HomeViewProps) {
  const {
    providers,
    visibleProviders,
    activeProvider,
    runtime,
    uiSettings,
    form,
    formBusy,
    formError,
    setForm,
    onOpenProvider,
    onOpenSettings,
    onToggleProviderVisibility,
    onRemoveProvider,
    onCreateProvider
  } = props;

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
            <span>当前活跃服务</span>
            <strong>{activeProvider.label}</strong>
          </article>
          <article className="status-card">
            <span>窗口状态</span>
            <strong>{runtimeLabel(runtime.state)}</strong>
          </article>
          <article className="status-card">
            <span>保活数量</span>
            <strong>{uiSettings.keepAliveLimit}</strong>
          </article>
          <article className="status-card">
            <span>加载策略</span>
            <strong>{uiSettings.loadingOverlayMode === "immediate" ? "即时遮罩" : "严格检测"}</strong>
          </article>
          <article className="status-card">
            <span>侧栏自动隐藏</span>
            <strong>{uiSettings.sidebarAutoHide ? "已开启" : "已关闭"}</strong>
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
          <h3>左侧栏管理</h3>
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
                  </div>
                </div>
                <div className="manage-actions">
                  <button type="button" onClick={() => void onToggleProviderVisibility(provider)}>
                    {provider.enabled ? "隐藏" : "显示"}
                  </button>
                  {provider.removable ? (
                    <button type="button" className="danger-action" onClick={() => void onRemoveProvider(provider)}>
                      删除
                    </button>
                  ) : null}
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
