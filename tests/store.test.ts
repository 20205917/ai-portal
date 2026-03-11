import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AppStore } from "../src/main/store";
import { SETTINGS_VERSION } from "../src/shared/constants";

const tempDirs: string[] = [];

afterEach(() => {
  for (const target of tempDirs.splice(0)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

describe("AppStore", () => {
  it("persists last provider, overrides, and custom providers", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aidc-store-"));
    tempDirs.push(dir);

    const store = new AppStore(dir);
    store.saveLastProviderId("doubao");
    store.saveProviderEngine("chatgpt", "isolated-external");
    store.saveProviderIconDataUrl("chatgpt", "data:image/png;base64,AA==");
    const custom = store.addCustomProvider({
      label: "Claude",
      url: "claude.ai",
      icon: "C"
    });

    const reloaded = new AppStore(dir);
    const settings = reloaded.getSettings();

    expect(settings.version).toBe(SETTINGS_VERSION);
    expect(settings.startupResetDone).toBe(true);
    expect(settings.lastProviderId).toBe("doubao");
    expect(settings.providerOverrides.chatgpt.engine).toBe("isolated-external");
    expect(settings.providerOverrides.chatgpt.iconDataUrl).toBe("data:image/png;base64,AA==");
    expect(settings.customProviders[0].id).toBe(custom.id);
    expect(settings.customProviders[0].url).toBe("https://claude.ai");
  });

  it("backs up and resets legacy settings on first startup", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aidc-store-reset-"));
    tempDirs.push(dir);

    const legacyPath = path.join(dir, "settings.json");
    fs.writeFileSync(legacyPath, JSON.stringify({
      version: 1,
      startupResetDone: false,
      lastProviderId: "custom-old",
      customProviders: [
        {
          id: "custom-old",
          label: "Old",
          url: "https://old.example",
          icon: "O",
          engine: "embedded",
          enabled: true,
          persistSession: true,
          fallbackMode: "isolated-external",
          source: "custom",
          removable: true
        }
      ]
    }));

    const store = new AppStore(dir);
    const settings = store.getSettings();

    expect(settings.version).toBe(SETTINGS_VERSION);
    expect(settings.startupResetDone).toBe(true);
    expect(settings.lastProviderId).toBe("chatgpt");
    expect(settings.customProviders).toEqual([]);

    const backups = fs.readdirSync(dir).filter((name) => name.startsWith("settings.backup."));
    expect(backups.length).toBe(1);
  });
});
