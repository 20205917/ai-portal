import fs from "node:fs";
import path from "node:path";

import { SETTINGS_VERSION } from "../shared/constants";
import type {
  AppSettings,
  NewProviderInput,
  ProviderDefinition,
  RuntimeSnapshot,
  UiSettingsPatch,
  WindowBounds
} from "../shared/types";
import {
  createCustomProvider,
  defaultSettings,
  mergeUiSettings,
  readSettingsFile
} from "./store-codec";

const SETTINGS_FILE = "settings.json";
const RUNTIME_FILE = "runtime.json";
const SETTINGS_WRITE_DEBOUNCE_MS = 200;
const RUNTIME_WRITE_DEBOUNCE_MS = 200;

function serializeJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function sameWindowBounds(left: WindowBounds, right: WindowBounds): boolean {
  return (
    left.width === right.width
    && left.height === right.height
    && left.x === right.x
    && left.y === right.y
  );
}

function sameRuntimeSnapshot(left: RuntimeSnapshot, right: RuntimeSnapshot): boolean {
  return (
    left.state === right.state
    && left.activeProviderId === right.activeProviderId
    && left.updatedAt === right.updatedAt
  );
}

function cloneRuntimeSnapshot(snapshot: RuntimeSnapshot): RuntimeSnapshot {
  return {
    state: snapshot.state,
    activeProviderId: snapshot.activeProviderId,
    updatedAt: snapshot.updatedAt
  };
}

function sameUiSettings(left: AppSettings["ui"], right: AppSettings["ui"]): boolean {
  return (
    left.keepAliveLimit === right.keepAliveLimit
    && left.backgroundResident === right.backgroundResident
    && left.sidebarAutoHide === right.sidebarAutoHide
    && left.startupView === right.startupView
    && left.loadingOverlayMode === right.loadingOverlayMode
    && left.autoFallbackOnEmbedError === right.autoFallbackOnEmbedError
    && left.hotkeys.toggleWindow === right.hotkeys.toggleWindow
    && left.hotkeys.providerNext === right.hotkeys.providerNext
    && left.hotkeys.providerPrev === right.hotkeys.providerPrev
  );
}

export class AppStore {
  private readonly settingsPath: string;
  private readonly runtimePath: string;
  private settingsCache: AppSettings;
  private runtimeCache: RuntimeSnapshot | null = null;
  private lastPersistedSettingsJson: string;
  private lastPersistedRuntimeJson = "";
  private settingsWriteTimer: NodeJS.Timeout | null = null;
  private runtimeWriteTimer: NodeJS.Timeout | null = null;
  private settingsWriteInFlight: Promise<void> = Promise.resolve();
  private settingsWriteSeq = 0;

  constructor(private readonly configDir: string) {
    fs.mkdirSync(configDir, { recursive: true });
    this.settingsPath = path.join(configDir, SETTINGS_FILE);
    this.runtimePath = path.join(configDir, RUNTIME_FILE);
    this.settingsCache = readSettingsFile(this.settingsPath);
    this.lastPersistedSettingsJson = serializeJson(this.settingsCache);
    this.applyStartupResetPolicy();
  }

  private applyStartupResetPolicy(): void {
    const needsStartupReset = !this.settingsCache.startupResetDone;
    const needsVersionReset = this.settingsCache.version !== SETTINGS_VERSION;
    if (!needsStartupReset && !needsVersionReset) {
      return;
    }

    this.backupSettingsFile();
    this.settingsCache = {
      ...defaultSettings(),
      version: SETTINGS_VERSION,
      startupResetDone: true
    };
    this.persistSettingsSync();
  }

  private backupSettingsFile(): void {
    if (!fs.existsSync(this.settingsPath)) {
      return;
    }

    const stat = fs.statSync(this.settingsPath);
    if (stat.size <= 0) {
      return;
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(this.configDir, `settings.backup.${stamp}.json`);
    fs.copyFileSync(this.settingsPath, backupPath);
  }

  private persistSettingsSync(): void {
    if (this.settingsWriteTimer) {
      clearTimeout(this.settingsWriteTimer);
      this.settingsWriteTimer = null;
    }

    const serialized = serializeJson(this.settingsCache);
    if (serialized === this.lastPersistedSettingsJson) {
      return;
    }
    fs.writeFileSync(this.settingsPath, serialized);
    this.lastPersistedSettingsJson = serialized;
  }

  private enqueueSettingsWrite(serialized: string): void {
    if (serialized === this.lastPersistedSettingsJson) {
      return;
    }

    const seq = ++this.settingsWriteSeq;
    this.settingsWriteInFlight = this.settingsWriteInFlight
      .catch(() => undefined)
      .then(async () => {
        if (seq < this.settingsWriteSeq || serialized === this.lastPersistedSettingsJson) {
          return;
        }
        try {
          await fs.promises.writeFile(this.settingsPath, serialized);
          this.lastPersistedSettingsJson = serialized;
        } catch (error) {
          console.error("[AIDC] Failed to persist settings:", error instanceof Error ? error.message : String(error));
        }
      });
  }

  private persistSettingsNow(): void {
    if (this.settingsWriteTimer) {
      clearTimeout(this.settingsWriteTimer);
      this.settingsWriteTimer = null;
    }
    this.enqueueSettingsWrite(serializeJson(this.settingsCache));
  }

  private persistSettingsDebounced(): void {
    if (this.settingsWriteTimer) {
      clearTimeout(this.settingsWriteTimer);
    }
    this.settingsWriteTimer = setTimeout(() => {
      this.settingsWriteTimer = null;
      this.persistSettingsNow();
    }, SETTINGS_WRITE_DEBOUNCE_MS);
  }

  private persistRuntimeNow(): void {
    if (this.runtimeWriteTimer) {
      clearTimeout(this.runtimeWriteTimer);
      this.runtimeWriteTimer = null;
    }
    if (!this.runtimeCache) {
      return;
    }

    const serialized = serializeJson(this.runtimeCache);
    if (serialized === this.lastPersistedRuntimeJson) {
      return;
    }
    fs.writeFileSync(this.runtimePath, serialized);
    this.lastPersistedRuntimeJson = serialized;
  }

  private persistRuntimeDebounced(): void {
    if (this.runtimeWriteTimer) {
      clearTimeout(this.runtimeWriteTimer);
    }
    this.runtimeWriteTimer = setTimeout(() => {
      this.runtimeWriteTimer = null;
      this.persistRuntimeNow();
    }, RUNTIME_WRITE_DEBOUNCE_MS);
  }

  getSettings(): AppSettings {
    return {
      ...this.settingsCache,
      ui: {
        ...this.settingsCache.ui,
        hotkeys: { ...this.settingsCache.ui.hotkeys }
      },
      providerOverrides: { ...this.settingsCache.providerOverrides },
      customProviders: this.settingsCache.customProviders.map((provider) => ({ ...provider }))
    };
  }

  updateSettings(mutator: (current: AppSettings) => AppSettings): AppSettings {
    const next = mutator(this.getSettings());
    this.settingsCache = {
      ...next,
      version: SETTINGS_VERSION,
      startupResetDone: true
    };
    this.persistSettingsDebounced();
    return this.getSettings();
  }

  saveWindowBounds(bounds: WindowBounds): AppSettings {
    if (sameWindowBounds(this.settingsCache.windowBounds, bounds)) {
      return this.getSettings();
    }

    this.settingsCache = {
      ...this.settingsCache,
      version: SETTINGS_VERSION,
      startupResetDone: true,
      windowBounds: { ...bounds }
    };
    this.persistSettingsDebounced();
    return this.getSettings();
  }

  saveUiSettings(patch: UiSettingsPatch): AppSettings {
    const nextUi = mergeUiSettings(this.settingsCache.ui, patch);
    if (sameUiSettings(this.settingsCache.ui, nextUi)) {
      return this.getSettings();
    }

    return this.updateSettings((current) => ({
      ...current,
      ui: nextUi
    }));
  }

  saveLastProviderId(providerId: string): AppSettings {
    return this.updateSettings((current) => ({
      ...current,
      lastProviderId: providerId
    }));
  }

  saveProviderEngine(providerId: string, engine: AppSettings["providerOverrides"][string]["engine"]): AppSettings {
    return this.updateSettings((current) => ({
      ...current,
      providerOverrides: {
        ...current.providerOverrides,
        [providerId]: {
          ...current.providerOverrides[providerId],
          engine
        }
      }
    }));
  }

  saveProviderEnabled(providerId: string, enabled: boolean): AppSettings {
    return this.updateSettings((current) => ({
      ...current,
      providerOverrides: {
        ...current.providerOverrides,
        [providerId]: {
          ...current.providerOverrides[providerId],
          enabled
        }
      }
    }));
  }

  saveProviderIconDataUrl(providerId: string, iconDataUrl: string): AppSettings {
    return this.updateSettings((current) => ({
      ...current,
      providerOverrides: {
        ...current.providerOverrides,
        [providerId]: {
          ...current.providerOverrides[providerId],
          iconDataUrl
        }
      }
    }));
  }

  addCustomProvider(input: NewProviderInput): ProviderDefinition {
    const provider = createCustomProvider(input);
    this.updateSettings((current) => ({
      ...current,
      customProviders: [...current.customProviders, provider]
    }));
    return provider;
  }

  removeCustomProvider(providerId: string): AppSettings {
    return this.updateSettings((current) => ({
      ...current,
      lastProviderId: current.lastProviderId === providerId ? "chatgpt" : current.lastProviderId,
      providerOverrides: Object.fromEntries(
        Object.entries(current.providerOverrides).filter(([id]) => id !== providerId)
      ),
      customProviders: current.customProviders.filter((provider) => provider.id !== providerId)
    }));
  }

  saveRuntime(snapshot: RuntimeSnapshot): void {
    if (this.runtimeCache && sameRuntimeSnapshot(this.runtimeCache, snapshot)) {
      return;
    }
    this.runtimeCache = cloneRuntimeSnapshot(snapshot);
    this.persistRuntimeDebounced();
  }

  async flushPendingWrites(): Promise<void> {
    this.persistSettingsNow();
    await this.settingsWriteInFlight.catch(() => undefined);
    this.persistRuntimeNow();
  }
}
