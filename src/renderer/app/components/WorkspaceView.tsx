import type { ProviderDefinition } from "../../../shared/types";
import { partitionFor } from "../provider-visual";
import type { WebviewHost, WebviewLoadState } from "../types";

interface WorkspaceViewProps {
  activeProvider: ProviderDefinition;
  activeEmbeddedProvider: ProviderDefinition | null;
  webviewState: WebviewLoadState;
  webviewError: string;
  bindWebviewNode: (element: Element | null) => void;
  onRetryEmbeddedPage: () => void;
}

export function WorkspaceView(props: WorkspaceViewProps) {
  const {
    activeProvider,
    activeEmbeddedProvider,
    webviewState,
    webviewError,
    bindWebviewNode,
    onRetryEmbeddedPage
  } = props;

  return (
    <section className="workspace-content workspace-content-full">
      {activeEmbeddedProvider ? (
        <div className="webview-shell">
          <webview
            key={`${activeEmbeddedProvider.id}:${activeEmbeddedProvider.engine}`}
            ref={bindWebviewNode as (element: WebviewHost | null) => void}
            className="provider-webview is-active"
            src={activeEmbeddedProvider.url}
            partition={partitionFor(activeEmbeddedProvider)}
            allowpopups="true"
          />
          {webviewState === "loading" ? (
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
