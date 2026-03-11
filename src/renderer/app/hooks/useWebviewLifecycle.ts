import { useCallback, useEffect, useState } from "react";

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

  useEffect(() => {
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

    let disposed = false;
    const timeoutId = window.setTimeout(() => {
      if (!disposed) {
        setWebviewState("error");
        setWebviewError("页面加载超时，可以重试或切到独立窗口。");
      }
    }, 20_000);

    const onReady = () => {
      setWebviewState("ready");
      setWebviewError("");
      window.clearTimeout(timeoutId);
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
    };

    webviewNode.addEventListener("dom-ready", onReady as EventListener);
    webviewNode.addEventListener("did-stop-loading", onReady as EventListener);
    webviewNode.addEventListener("did-fail-load", onFail as EventListener);

    return () => {
      disposed = true;
      window.clearTimeout(timeoutId);
      webviewNode.removeEventListener("dom-ready", onReady as EventListener);
      webviewNode.removeEventListener("did-stop-loading", onReady as EventListener);
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
