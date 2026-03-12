import { useEffect, useMemo, useState } from "react";

import type { LoadingOverlayMode, ProviderDefinition } from "../../../shared/types";
import { partitionFor } from "../provider-visual";
import type { WebviewHost, WebviewLoadState } from "../types";

interface WorkspaceViewProps {
  visible: boolean;
  activeProvider: ProviderDefinition;
  activeEmbeddedProvider: ProviderDefinition | null;
  embeddedProviders: ProviderDefinition[];
  keepAliveLimit: number;
  loadingOverlayMode: LoadingOverlayMode;
  webviewState: WebviewLoadState;
  webviewError: string;
  bindWebviewNode: (element: Element | null) => void;
  onRetryEmbeddedPage: () => void;
}

export function WorkspaceView(props: WorkspaceViewProps) {
  const {
    visible,
    activeProvider,
    activeEmbeddedProvider,
    embeddedProviders,
    keepAliveLimit,
    loadingOverlayMode,
    webviewState,
    webviewError,
    bindWebviewNode,
    onRetryEmbeddedPage
  } = props;
  const activeEmbeddedProviderId = activeEmbeddedProvider?.id ?? null;
  const [retainedEmbeddedProviderIds, setRetainedEmbeddedProviderIds] = useState<string[]>([]);

  useEffect(() => {
    if (!activeEmbeddedProviderId) {
      return;
    }
    setRetainedEmbeddedProviderIds((current) => {
      const next = current.filter((providerId) => providerId !== activeEmbeddedProviderId);
      next.push(activeEmbeddedProviderId);
      while (next.length > keepAliveLimit) {
        next.shift();
      }
      if (next.length === current.length && next.every((providerId, index) => providerId === current[index])) {
        return current;
      }
      return next;
    });
  }, [activeEmbeddedProviderId, keepAliveLimit]);

  useEffect(() => {
    const validIds = new Set(embeddedProviders.map((provider) => provider.id));
    setRetainedEmbeddedProviderIds((current) => {
      const next = current.filter((providerId) => validIds.has(providerId));
      if (next.length === current.length) {
        return current;
      }
      return next;
    });
  }, [embeddedProviders]);

  const mountedEmbeddedProviders = useMemo(() => {
    const retainedIds = new Set(retainedEmbeddedProviderIds);
    if (activeEmbeddedProviderId) {
      retainedIds.add(activeEmbeddedProviderId);
    }
    return embeddedProviders.filter((provider) => retainedIds.has(provider.id));
  }, [activeEmbeddedProviderId, embeddedProviders, retainedEmbeddedProviderIds]);
  const shouldShowLoadingOverlay = Boolean(
    activeEmbeddedProvider
    && (loadingOverlayMode === "immediate"
      ? webviewState !== "ready" && webviewState !== "error"
      : webviewState === "loading" || webviewState === "idle")
  );
  const hideActiveWebviewForLoading = loadingOverlayMode === "immediate" && shouldShowLoadingOverlay;

  return (
    <section className={`workspace-content workspace-content-full ${visible ? "" : "is-hidden"}`}>
      {mountedEmbeddedProviders.length > 0 ? (
        <div className="webview-shell">
          {mountedEmbeddedProviders.map((provider) => {
            const active = provider.id === activeEmbeddedProviderId;
            return (
              <webview
                key={`${provider.id}:${provider.engine}`}
                ref={active ? (bindWebviewNode as (element: WebviewHost | null) => void) : undefined}
                className={`provider-webview ${active ? "is-active" : "is-hidden"} ${
                  active && hideActiveWebviewForLoading ? "is-loading-hidden" : ""
                }`}
                src={provider.url}
                partition={partitionFor(provider)}
                allowpopups="true"
              />
            );
          })}
          {activeEmbeddedProvider ? (
            <>
              {shouldShowLoadingOverlay ? (
                <div className="webview-overlay">
                  <div className="webview-overlay-card">
                    <div className="loading-dot" aria-hidden="true" />
                    <strong>正在加载 {activeEmbeddedProvider.label}</strong>
                    <p>正在连接目标站点，请稍候…</p>
                  </div>
                </div>
              ) : null}
              {webviewState === "error" ? (
                <div className="webview-overlay">
                  <div className="webview-overlay-card">
                    <strong>{activeEmbeddedProvider.label} 无法正常显示</strong>
                    <p>{webviewError || "页面加载失败，请重试。"}</p>
                    <div className="webview-overlay-actions">
                      <button type="button" onClick={onRetryEmbeddedPage}>
                        重试加载
                      </button>
                      {activeEmbeddedProvider.fallbackMode === "isolated-external" ? (
                        <button
                          type="button"
                          className="primary-action"
                          onClick={() => void window.aidc.openExternalProvider(activeEmbeddedProvider.id)}
                        >
                          改用独立窗口
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {activeProvider.engine === "isolated-external" ? (
        <div className="isolated-placeholder">
          <div className="placeholder-card">
            <h3>{activeProvider.label} 当前运行在独立窗口中</h3>
            <p>这个模式下会启用专用独立窗口，仍然与普通浏览器彻底隔离。</p>
            <button
              type="button"
              className="primary-action"
              onClick={() => void window.aidc.openExternalProvider(activeProvider.id)}
            >
              打开或聚焦独立窗口
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
