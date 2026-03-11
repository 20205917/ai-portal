import { useEffect, useState } from "react";

import type {
  BootstrapPayload,
  ProviderDefinition,
  RuntimeSnapshot
} from "../../../shared/types";

interface BootstrapState {
  loading: boolean;
  bootstrap: BootstrapPayload | null;
  providers: ProviderDefinition[];
  activeProviderId: string;
  runtime: RuntimeSnapshot;
  bootstrapError: string;
  setActiveProviderId: (providerId: string) => void;
}

export function useBootstrapState(): BootstrapState {
  const [loading, setLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [providers, setProviders] = useState<ProviderDefinition[]>([]);
  const [activeProviderId, setActiveProviderId] = useState<string>("chatgpt");
  const [runtime, setRuntime] = useState<RuntimeSnapshot>({
    state: "hidden",
    activeProviderId: "chatgpt",
    updatedAt: new Date().toISOString()
  });
  const [bootstrapError, setBootstrapError] = useState("");

  useEffect(() => {
    let unbindProviders = () => undefined;
    let unbindRuntime = () => undefined;
    let disposed = false;

    void (async () => {
      try {
        const payload = await window.aidc.getBootstrap();
        if (disposed) {
          return;
        }

        setBootstrap(payload);
        setProviders(payload.providers);
        setActiveProviderId(payload.activeProviderId);
        setRuntime(payload.runtime);
        setBootstrapError("");
        setLoading(false);

        unbindProviders = window.aidc.onProvidersUpdated(({ providers: nextProviders, activeProviderId: nextActive }) => {
          setProviders(nextProviders);
          setActiveProviderId(nextActive);
        });

        unbindRuntime = window.aidc.onRuntimeUpdated((nextRuntime) => {
          setRuntime(nextRuntime);
        });
      } catch (error) {
        if (disposed) {
          return;
        }
        setBootstrapError(error instanceof Error ? error.message : "初始化失败。");
        setLoading(false);
      }
    })();

    return () => {
      disposed = true;
      unbindProviders();
      unbindRuntime();
    };
  }, []);

  return {
    loading,
    bootstrap,
    providers,
    activeProviderId,
    runtime,
    bootstrapError,
    setActiveProviderId
  };
}
