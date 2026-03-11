import { contextBridge, ipcRenderer } from "electron";

import type {
  BootstrapPayload,
  NewProviderInput,
  ProviderDefinition,
  RuntimeSnapshot
} from "../shared/types";

contextBridge.exposeInMainWorld("aidc", {
  getBootstrap: (): Promise<BootstrapPayload> => ipcRenderer.invoke("app:get-bootstrap"),
  selectProvider: (providerId: string): Promise<void> => ipcRenderer.invoke("app:select-provider", providerId),
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
  }
});
