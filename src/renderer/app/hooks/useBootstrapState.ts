import { useEffect, useState } from "react";

import type {
  BootstrapPayload,
  ProviderDefinition,
  RuntimeSnapshot,
  ShortcutStatus,
  UiSettings
} from "../../../shared/types";
import { DEFAULT_TOGGLE_WINDOW_HOTKEY, UI_KEEP_ALIVE_DEFAULT } from "../../../shared/constants";

const defaultUiSettings: UiSettings = {
  keepAliveLimit: UI_KEEP_ALIVE_DEFAULT,
  backgroundResident: true,
  launchAtLogin: false,
  sidebarAutoHide: false,
  startupView: "workspace",
  loadingOverlayMode: "immediate",
  autoFallbackOnEmbedError: false,
  hotkeys: {
    toggleWindow: DEFAULT_TOGGLE_WINDOW_HOTKEY,
    providerNext: null,
    providerPrev: null
  }
};

const defaultShortcutStatus: ShortcutStatus = {
  toggleWindow: {
    action: "toggleWindow",
    accelerator: DEFAULT_TOGGLE_WINDOW_HOTKEY,
    state: "unbound",
    message: "初始化中"
  },
  providerNext: {
    action: "providerNext",
    accelerator: null,
    state: "unbound",
    message: "未绑定"
  },
  providerPrev: {
    action: "providerPrev",
    accelerator: null,
    state: "unbound",
    message: "未绑定"
  }
};

interface BootstrapState {
  loading: boolean;
  bootstrap: BootstrapPayload | null;
  providers: ProviderDefinition[];
  activeProviderId: string;
  runtime: RuntimeSnapshot;
  uiSettings: UiSettings;
  shortcutStatus: ShortcutStatus;
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
  const [shortcutStatus, setShortcutStatus] = useState<ShortcutStatus>(defaultShortcutStatus);
  const [bootstrapError, setBootstrapError] = useState("");

  useEffect(() => {
    let unbindProviders = () => undefined;
    let unbindRuntime = () => undefined;
    let unbindSettings = () => undefined;
    let unbindShortcutStatus = () => undefined;
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
        setShortcutStatus(payload.shortcutStatus ?? defaultShortcutStatus);
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

        unbindShortcutStatus = window.aidc.onShortcutStatusUpdated((nextStatus) => {
          setShortcutStatus(nextStatus);
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
      unbindShortcutStatus();
    };
  }, []);

  return {
    loading,
    bootstrap,
    providers,
    activeProviderId,
    runtime,
    uiSettings,
    shortcutStatus,
    bootstrapError,
    setActiveProviderId
  };
}
