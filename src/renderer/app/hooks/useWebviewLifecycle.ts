import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { ProviderDefinition } from "../../../shared/types";
import type { WebviewHost, WebviewLoadState } from "../types";

interface WebviewLifecycle {
  webviewState: WebviewLoadState;
  webviewError: string;
  bindWebviewNode: (element: Element | null) => void;
  retryEmbeddedPage: () => void;
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
          hasVisualContent = false;
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
      setWebviewError(
        `加载失败${detail.errorCode ? ` (${detail.errorCode})` : ""}${
          detail.errorDescription ? `：${detail.errorDescription}` : "。"
        }`
      );
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
