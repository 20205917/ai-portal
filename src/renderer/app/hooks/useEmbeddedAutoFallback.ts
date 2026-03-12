import { useEffect, useRef } from "react";

import type { ProviderDefinition } from "../../../shared/types";
import type { WebviewLoadState } from "../types";

export function useEmbeddedAutoFallback(
  enabled: boolean,
  webviewState: WebviewLoadState,
  activeEmbeddedProvider: ProviderDefinition | null
): void {
  const triggeredProviderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || webviewState !== "error" || !activeEmbeddedProvider) {
      return;
    }
    if (activeEmbeddedProvider.fallbackMode !== "isolated-external") {
      return;
    }
    if (triggeredProviderIdsRef.current.has(activeEmbeddedProvider.id)) {
      return;
    }
    triggeredProviderIdsRef.current.add(activeEmbeddedProvider.id);
    void window.aidc.openExternalProvider(activeEmbeddedProvider.id);
  }, [activeEmbeddedProvider, enabled, webviewState]);
}
