import type { FormEvent } from "react";

import type { NewProviderInput, ProviderDefinition } from "../../../shared/types";
import { glyphFor, hostLabel, providerIconStyle } from "../provider-visual";

interface HomeViewProps {
  providers: ProviderDefinition[];
  visibleProviders: ProviderDefinition[];
  form: NewProviderInput;
  formBusy: boolean;
  formError: string;
  setForm: (next: NewProviderInput) => void;
  onOpenProvider: (providerId: string) => Promise<void>;
  onToggleProviderVisibility: (provider: ProviderDefinition) => Promise<void>;
  onRemoveProvider: (provider: ProviderDefinition) => Promise<void>;
  onCreateProvider: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export function HomeView(props: HomeViewProps) {
  const {
    providers,
    visibleProviders,
    form,
    formBusy,
    formError,
    setForm,
    onOpenProvider,
    onToggleProviderVisibility,
    onRemoveProvider,
    onCreateProvider
  } = props;

  return (
    <section className="home-shell">
      <section className="home-panel panel">
        <h2>AI 调度台首页</h2>
        <p>从这里打开常用 AI，也可以决定哪些网页显示在左侧栏。</p>
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
                    <small>{provider.enabled ? "已显示在左侧栏" : "已从左侧栏隐藏"}</small>
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
          <h3>添加 AI 网页</h3>
          <p>图标会优先抓取网站 favicon，失败时自动回退为字母图标。</p>
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
