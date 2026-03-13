import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { ProviderDefinition } from "../../../shared/types";
import type { WebviewHost, WebviewLoadState } from "../types";

interface WebviewLifecycle {
  webviewState: WebviewLoadState;
  webviewError: string;
  bindWebviewNode: (element: Element | null) => void;
  retryEmbeddedPage: () => void;
}

const webviewLoadErrorHints: Record<number, string> = {
  [-100]: "连接被目标站点中断，通常和网络波动、代理策略或站点限流有关。",
  [-105]: "域名解析失败，请检查 DNS、代理或网络连通性。",
  [-106]: "网络连接中断，请稍后重试。",
  [-118]: "连接超时，请检查网络后重试。",
  [-202]: "证书校验失败，可能被代理证书拦截。"
};

function buildWebviewLoadErrorMessage(errorCode?: number, errorDescription?: string): string {
  if (!errorCode) {
    return errorDescription ? `加载失败：${errorDescription}` : "页面加载失败，请重试。";
  }

  const hint = webviewLoadErrorHints[errorCode];
  if (hint) {
    return `加载失败 (${errorCode})：${hint}`;
  }

  if (errorDescription) {
    return `加载失败 (${errorCode})：${errorDescription}`;
  }
  return `加载失败 (${errorCode})。`;
}

export function useWebviewLifecycle(activeEmbeddedProvider: ProviderDefinition | null): WebviewLifecycle {
  const [webviewNode, setWebviewNode] = useState<WebviewHost | null>(null);
  const [webviewState, setWebviewState] = useState<WebviewLoadState>("idle");
  const [webviewError, setWebviewError] = useState("");
  const readyProviderIdsRef = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    if (!activeEmbeddedProvider) {
      setWebviewState("idle");
      setWebviewError("");
      return;
    }

    setWebviewState("loading");
    setWebviewError("");
  }, [activeEmbeddedProvider?.id]);

  useEffect(() => {
    if (!webviewNode || !activeEmbeddedProvider) {
      return;
    }

    const canMarkReady = (): boolean => {
      if (typeof webviewNode.isLoading !== "function" || typeof webviewNode.getURL !== "function") {
        return false;
      }
      try {
        const currentUrl = webviewNode.getURL()?.trim();
        if (!currentUrl || currentUrl === "about:blank") {
          return false;
        }
        return !webviewNode.isLoading();
      } catch {
        return false;
      }
    };

    let disposed = false;
    const markReadyIfStable = async () => {
      if (disposed || !canMarkReady()) {
        return;
      }

      let hasVisualContent = true;
      if (typeof webviewNode.executeJavaScript === "function") {
        try {
          hasVisualContent = Boolean(await webviewNode.executeJavaScript(
            `(() => {
              if (document.readyState !== "interactive" && document.readyState !== "complete") {
                return false;
              }
              const body = document.body;
              if (!body) {
                return false;
              }
              const rect = body.getBoundingClientRect();
              if (rect.width < 16 || rect.height < 16) {
                return false;
              }
              const text = (body.innerText || "").trim();
              return text.length > 0 || body.childElementCount > 0;
            })()`,
            true
          ));
        } catch {
          // 部分站点在早期阶段会暂时拒绝脚本执行，这里不应阻塞 ready 判定。
          hasVisualContent = true;
        }
      }

      if (!hasVisualContent || disposed) {
        return;
      }

      readyProviderIdsRef.current.add(activeEmbeddedProvider.id);
      setWebviewState("ready");
      setWebviewError("");
      window.clearTimeout(timeoutId);
      window.clearInterval(pollId);
    };

    if (readyProviderIdsRef.current.has(activeEmbeddedProvider.id)) {
      void markReadyIfStable();
    }

    const timeoutId = window.setTimeout(() => {
      if (!disposed) {
        setWebviewState("error");
        setWebviewError("页面加载超时，可以重试或切到独立窗口。");
      }
    }, 20_000);
    const pollId = window.setInterval(() => {
      void markReadyIfStable();
    }, 600);

    const onReady = () => {
      void markReadyIfStable();
    };
    const onFail = (event: Event) => {
      const detail = event as Event & { errorCode?: number; errorDescription?: string };
      if (detail.errorCode === -3) {
        return;
      }

      setWebviewState("error");
      setWebviewError(buildWebviewLoadErrorMessage(detail.errorCode, detail.errorDescription));
      window.clearTimeout(timeoutId);
      window.clearInterval(pollId);
    };

    webviewNode.addEventListener("did-finish-load", onReady as EventListener);
    webviewNode.addEventListener("did-fail-load", onFail as EventListener);

    return () => {
      disposed = true;
      window.clearTimeout(timeoutId);
      window.clearInterval(pollId);
      webviewNode.removeEventListener("did-finish-load", onReady as EventListener);
      webviewNode.removeEventListener("did-fail-load", onFail as EventListener);
    };
  }, [webviewNode, activeEmbeddedProvider?.id]);

  useEffect(() => {
    const forceError = () => {
      if (!activeEmbeddedProvider) {
        return;
      }
      setWebviewState("error");
      setWebviewError("已注入失败场景：用于截图验收。");
    };

    const hostWindow = window as Window & { __aidcForceWebviewError?: () => void };
    hostWindow.__aidcForceWebviewError = forceError;
    window.addEventListener("aidc:force-webview-error", forceError as EventListener);
    return () => {
      window.removeEventListener("aidc:force-webview-error", forceError as EventListener);
      if (hostWindow.__aidcForceWebviewError === forceError) {
        delete hostWindow.__aidcForceWebviewError;
      }
    };
  }, [activeEmbeddedProvider?.id]);

  const bindWebviewNode = useCallback((element: Element | null) => {
    const next = element as WebviewHost | null;
    setWebviewNode((current) => (current === next ? current : next));
  }, []);

  function retryEmbeddedPage(): void {
    if (!webviewNode) {
      return;
    }
    setWebviewState("loading");
    setWebviewError("");
    webviewNode.reload();
  }

  return {
    webviewState,
    webviewError,
    bindWebviewNode,
    retryEmbeddedPage
  };
}
