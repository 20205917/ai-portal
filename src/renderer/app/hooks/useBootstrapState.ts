import { useEffect, useState } from "react";

import type {
  BootstrapPayload,
  ProviderDefinition,
  RuntimeSnapshot,
  UiSettings
} from "../../../shared/types";
import { UI_KEEP_ALIVE_DEFAULT } from "../../../shared/constants";

const defaultUiSettings: UiSettings = {
  keepAliveLimit: UI_KEEP_ALIVE_DEFAULT,
  sidebarAutoHide: false,
  startupView: "workspace",
  loadingOverlayMode: "immediate",
  autoFallbackOnEmbedError: false
};

interface BootstrapState {
  loading: boolean;
  bootstrap: BootstrapPayload | null;
  providers: ProviderDefinition[];
  activeProviderId: string;
  runtime: RuntimeSnapshot;
  uiSettings: UiSettings;
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
  const [uiSettings, setUiSettings] = useState<UiSettings>(defaultUiSettings);
  const [bootstrapError, setBootstrapError] = useState("");

  useEffect(() => {
    let unbindProviders = () => undefined;
    let unbindRuntime = () => undefined;
    let unbindSettings = () => undefined;
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
        setUiSettings(payload.settings?.ui ?? defaultUiSettings);
        setBootstrapError("");
        setLoading(false);

        unbindProviders = window.aidc.onProvidersUpdated(({ providers: nextProviders, activeProviderId: nextActive }) => {
          setProviders(nextProviders);
          setActiveProviderId(nextActive);
        });

        unbindRuntime = window.aidc.onRuntimeUpdated((nextRuntime) => {
          setRuntime(nextRuntime);
        });

        unbindSettings = window.aidc.onSettingsUpdated((nextSettings) => {
          setUiSettings(nextSettings);
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
      unbindSettings();
    };
  }, []);

  return {
    loading,
    bootstrap,
    providers,
    activeProviderId,
    runtime,
    uiSettings,
    bootstrapError,
    setActiveProviderId
  };
}
