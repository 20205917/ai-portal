import fs from "node:fs";
import path from "node:path";

import { SETTINGS_VERSION } from "../shared/constants";
import type {
  AppSettings,
  NewProviderInput,
  ProviderDefinition,
  RuntimeSnapshot,
  WindowBounds
} from "../shared/types";
import {
  createCustomProvider,
  defaultSettings,
  readSettingsFile
} from "./store-codec";

const SETTINGS_FILE = "settings.json";
const RUNTIME_FILE = "runtime.json";

export class AppStore {
  private readonly settingsPath: string;
  private readonly runtimePath: string;
  private settingsCache: AppSettings;

  constructor(private readonly configDir: string) {
    fs.mkdirSync(configDir, { recursive: true });
    this.settingsPath = path.join(configDir, SETTINGS_FILE);
    this.runtimePath = path.join(configDir, RUNTIME_FILE);
    this.settingsCache = readSettingsFile(this.settingsPath);
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
    this.persistSettings();
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

  private persistSettings(): void {
    fs.writeFileSync(this.settingsPath, JSON.stringify(this.settingsCache, null, 2));
  }

  getSettings(): AppSettings {
    return {
      ...this.settingsCache,
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
    this.persistSettings();
    return this.getSettings();
  }

  saveWindowBounds(bounds: WindowBounds): AppSettings {
    return this.updateSettings((current) => ({
      ...current,
      windowBounds: bounds
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
    fs.writeFileSync(this.runtimePath, JSON.stringify(snapshot, null, 2));
  }
}
