import { BrowserWindow, ipcMain } from "electron";

import { APP_ID, APP_NAME } from "../shared/constants";
import type {
  BootstrapPayload,
  HostEnvironment,
  NewProviderInput,
  ProviderDefinition,
  RuntimeSnapshot,
  ShortcutStatus,
  SystemMetricsSnapshot,
  UiSettings,
  UiSettingsPatch
} from "../shared/types";

interface IpcContext {
  getProviders: () => ProviderDefinition[];
  getActiveProviderId: () => string;
  getRuntime: () => RuntimeSnapshot;
  getConfigDir: () => string;
  getSocketPath: () => string;
  getEnvironment: () => HostEnvironment;
  getUiSettings: () => UiSettings;
  getShortcutStatus: () => ShortcutStatus;
  getSystemMetrics: () => SystemMetricsSnapshot;
  selectProvider: (providerId: string) => Promise<void>;
  updateUiSettings: (patch: UiSettingsPatch) => Promise<void>;
  setProviderEngine: (providerId: string, engine: ProviderDefinition["engine"]) => Promise<void>;
  setProviderEnabled: (providerId: string, enabled: boolean) => Promise<void>;
  createProvider: (input: NewProviderInput) => Promise<void>;
  removeProvider: (providerId: string) => Promise<void>;
  openExternalProvider: (providerId: string) => Promise<void>;
  hideWindow: () => Promise<void>;
}

export function registerIpc(context: IpcContext): void {
  ipcMain.handle("app:get-bootstrap", () => {
    const payload: BootstrapPayload = {
      appId: APP_ID,
      appName: APP_NAME,
      configDir: context.getConfigDir(),
      socketPath: context.getSocketPath(),
      environment: context.getEnvironment(),
      providers: context.getProviders(),
      activeProviderId: context.getActiveProviderId(),
      runtime: context.getRuntime(),
      settings: {
        ui: context.getUiSettings()
      },
      shortcutStatus: context.getShortcutStatus()
    };

    return payload;
  });

  ipcMain.handle("app:select-provider", async (_event, providerId: string) => {
    await context.selectProvider(providerId);
  });

  ipcMain.handle("app:update-ui-settings", async (_event, patch: UiSettingsPatch) => {
    await context.updateUiSettings(patch);
  });

  ipcMain.handle("app:set-provider-engine", async (_event, providerId: string, engine: ProviderDefinition["engine"]) => {
    await context.setProviderEngine(providerId, engine);
  });

  ipcMain.handle("app:set-provider-enabled", async (_event, providerId: string, enabled: boolean) => {
    await context.setProviderEnabled(providerId, enabled);
  });

  ipcMain.handle("app:create-provider", async (_event, input: NewProviderInput) => {
    await context.createProvider(input);
  });

  ipcMain.handle("app:remove-provider", async (_event, providerId: string) => {
    await context.removeProvider(providerId);
  });

  ipcMain.handle("app:open-external-provider", async (_event, providerId: string) => {
    await context.openExternalProvider(providerId);
  });

  ipcMain.handle("app:hide-window", async () => {
    await context.hideWindow();
  });

  ipcMain.handle("app:get-system-metrics", () => context.getSystemMetrics());
}

export function broadcastProviders(window: BrowserWindow, providers: ProviderDefinition[], activeProviderId: string): void {
  window.webContents.send("app:providers-updated", {
    providers,
    activeProviderId
  });
}

export function broadcastRuntime(window: BrowserWindow, runtime: RuntimeSnapshot): void {
  window.webContents.send("app:runtime-updated", runtime);
}

export function broadcastSettings(window: BrowserWindow, ui: UiSettings): void {
  window.webContents.send("app:settings-updated", ui);
}

export function broadcastShortcutStatus(window: BrowserWindow, status: ShortcutStatus): void {
  window.webContents.send("app:shortcut-status-updated", status);
}
