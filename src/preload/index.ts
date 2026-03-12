import { contextBridge, ipcRenderer } from "electron";

import type {
  BootstrapPayload,
  NewProviderInput,
  ProviderDefinition,
  RuntimeSnapshot,
  ShortcutStatus,
  SystemMetricsSnapshot,
  UiSettings,
  UiSettingsPatch
} from "../shared/types";

contextBridge.exposeInMainWorld("aidc", {
  getBootstrap: (): Promise<BootstrapPayload> => ipcRenderer.invoke("app:get-bootstrap"),
  selectProvider: (providerId: string): Promise<void> => ipcRenderer.invoke("app:select-provider", providerId),
  updateUiSettings: (patch: UiSettingsPatch): Promise<void> =>
    ipcRenderer.invoke("app:update-ui-settings", patch),
  setProviderEngine: (providerId: string, engine: ProviderDefinition["engine"]): Promise<void> =>
    ipcRenderer.invoke("app:set-provider-engine", providerId, engine),
  setProviderEnabled: (providerId: string, enabled: boolean): Promise<void> =>
    ipcRenderer.invoke("app:set-provider-enabled", providerId, enabled),
  createProvider: (input: NewProviderInput): Promise<void> =>
    ipcRenderer.invoke("app:create-provider", input),
  removeProvider: (providerId: string): Promise<void> =>
    ipcRenderer.invoke("app:remove-provider", providerId),
  openExternalProvider: (providerId: string): Promise<void> =>
    ipcRenderer.invoke("app:open-external-provider", providerId),
  hideWindow: (): Promise<void> => ipcRenderer.invoke("app:hide-window"),
  getSystemMetrics: (): Promise<SystemMetricsSnapshot> => ipcRenderer.invoke("app:get-system-metrics"),
  onProvidersUpdated: (listener: (payload: { providers: ProviderDefinition[]; activeProviderId: string }) => void) => {
    const subscription = (_event: unknown, payload: { providers: ProviderDefinition[]; activeProviderId: string }) =>
      listener(payload);
    ipcRenderer.on("app:providers-updated", subscription);
    return () => ipcRenderer.removeListener("app:providers-updated", subscription);
  },
  onRuntimeUpdated: (listener: (runtime: RuntimeSnapshot) => void) => {
    const subscription = (_event: unknown, payload: RuntimeSnapshot) => listener(payload);
    ipcRenderer.on("app:runtime-updated", subscription);
    return () => ipcRenderer.removeListener("app:runtime-updated", subscription);
  },
  onSettingsUpdated: (listener: (settings: UiSettings) => void) => {
    const subscription = (_event: unknown, payload: UiSettings) => listener(payload);
    ipcRenderer.on("app:settings-updated", subscription);
    return () => ipcRenderer.removeListener("app:settings-updated", subscription);
  },
  onShortcutStatusUpdated: (listener: (status: ShortcutStatus) => void) => {
    const subscription = (_event: unknown, payload: ShortcutStatus) => listener(payload);
    ipcRenderer.on("app:shortcut-status-updated", subscription);
    return () => ipcRenderer.removeListener("app:shortcut-status-updated", subscription);
  }
});
