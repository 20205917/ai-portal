import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AppStore } from "../src/main/state/store";
import { SETTINGS_VERSION } from "../src/shared/constants";

const tempDirs: string[] = [];

afterEach(() => {
  for (const target of tempDirs.splice(0)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

describe("AppStore", () => {
  it("persists last provider, overrides, and custom providers", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aidc-store-"));
    tempDirs.push(dir);

    const store = new AppStore(dir);
    store.saveLastProviderId("doubao");
    store.saveProviderEngine("chatgpt", "isolated-external");
    store.saveProviderIconDataUrl("chatgpt", "data:image/png;base64,AA==");
    store.saveUiSettings({
      keepAliveLimit: 5,
      sidebarAutoHide: true,
      startupView: "home",
      loadingOverlayMode: "strict",
      autoFallbackOnEmbedError: true,
      hotkeys: {
        toggleWindow: "Ctrl+Alt+Q",
        providerNext: "Ctrl+Alt+]",
        providerPrev: "Ctrl+Alt+["
      }
    });
    const custom = store.addCustomProvider({
      label: "Claude",
      url: "claude.ai",
      icon: "C"
    });
    await store.flushPendingWrites();

    const reloaded = new AppStore(dir);
    const settings = reloaded.getSettings();

    expect(settings.version).toBe(SETTINGS_VERSION);
    expect(settings.startupResetDone).toBe(true);
    expect(settings.lastProviderId).toBe("doubao");
    expect(settings.providerOverrides.chatgpt.engine).toBe("isolated-external");
    expect(settings.providerOverrides.chatgpt.iconDataUrl).toBe("data:image/png;base64,AA==");
    expect(settings.customProviders[0].id).toBe(custom.id);
    expect(settings.customProviders[0].url).toBe("https://claude.ai");
    expect(settings.ui).toEqual({
      keepAliveLimit: 5,
      backgroundResident: true,
      sidebarAutoHide: true,
      startupView: "home",
      loadingOverlayMode: "strict",
      autoFallbackOnEmbedError: true,
      hotkeys: {
        toggleWindow: "Ctrl+Alt+Q",
        providerNext: "Ctrl+Alt+]",
        providerPrev: "Ctrl+Alt+["
      }
    });
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
    expect(settings.ui.keepAliveLimit).toBe(3);
    expect(settings.ui.backgroundResident).toBe(true);
    expect(settings.ui.sidebarAutoHide).toBe(false);
    expect(settings.ui.startupView).toBe("workspace");
    expect(settings.ui.loadingOverlayMode).toBe("immediate");
    expect(settings.ui.autoFallbackOnEmbedError).toBe(false);
    expect(settings.ui.hotkeys.toggleWindow).toBe("Ctrl+Alt+Q");
    expect(settings.ui.hotkeys.providerNext).toBeNull();
    expect(settings.ui.hotkeys.providerPrev).toBeNull();

    const backups = fs.readdirSync(dir).filter((name) => name.startsWith("settings.backup."));
    expect(backups.length).toBe(1);
  });

  it("debounces bounds/runtime writes and flushes latest state", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aidc-store-debounce-"));
    tempDirs.push(dir);

    const store = new AppStore(dir);
    for (let index = 0; index < 20; index += 1) {
      store.saveWindowBounds({
        x: index,
        y: index + 1,
        width: 1200,
        height: 820
      });
    }
    for (let index = 0; index < 20; index += 1) {
      store.saveRuntime({
        state: "visible-focused",
        activeProviderId: "chatgpt",
        updatedAt: `2026-03-11T09:00:${String(index).padStart(2, "0")}.000Z`
      });
    }
    await store.flushPendingWrites();

    const reloaded = new AppStore(dir);
    const settings = reloaded.getSettings();
    expect(settings.windowBounds).toEqual({
      x: 19,
      y: 20,
      width: 1200,
      height: 820
    });

    const runtimePath = path.join(dir, "runtime.json");
    const runtime = JSON.parse(fs.readFileSync(runtimePath, "utf8")) as {
      updatedAt: string;
      state: string;
      activeProviderId: string;
    };
    expect(runtime.state).toBe("visible-focused");
    expect(runtime.activeProviderId).toBe("chatgpt");
    expect(runtime.updatedAt).toBe("2026-03-11T09:00:19.000Z");
  });

  it("clamps keepalive range and persists normalized ui settings", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aidc-store-ui-"));
    tempDirs.push(dir);

    const store = new AppStore(dir);
    store.saveUiSettings({
      keepAliveLimit: 99,
      sidebarAutoHide: true,
      startupView: "home",
      loadingOverlayMode: "strict",
      autoFallbackOnEmbedError: true,
      hotkeys: {
        toggleWindow: "",
        providerNext: "Ctrl+Alt+W",
        providerPrev: "   "
      }
    });
    await store.flushPendingWrites();

    const reloaded = new AppStore(dir);
    expect(reloaded.getSettings().ui).toEqual({
      keepAliveLimit: 5,
      backgroundResident: true,
      sidebarAutoHide: true,
      startupView: "home",
      loadingOverlayMode: "strict",
      autoFallbackOnEmbedError: true,
      hotkeys: {
        toggleWindow: "Ctrl+Alt+Q",
        providerNext: "Ctrl+Alt+W",
        providerPrev: null
      }
    });

    reloaded.saveUiSettings({ keepAliveLimit: 0, hotkeys: { providerPrev: "Ctrl+Alt+E" } });
    expect(reloaded.getSettings().ui.keepAliveLimit).toBe(0);
    expect(reloaded.getSettings().ui.hotkeys.providerPrev).toBe("Ctrl+Alt+E");
  });

  it("backfills hotkeys for legacy ui settings without triggering reset", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aidc-store-hotkey-compat-"));
    tempDirs.push(dir);

    fs.writeFileSync(path.join(dir, "settings.json"), JSON.stringify({
      version: SETTINGS_VERSION,
      startupResetDone: true,
      lastProviderId: "chatgpt",
      windowBounds: { width: 1200, height: 900 },
      ui: {
        keepAliveLimit: 3,
        sidebarAutoHide: false,
        startupView: "workspace",
        loadingOverlayMode: "immediate",
        autoFallbackOnEmbedError: false
      },
      providerOverrides: {},
      customProviders: []
    }));

    const store = new AppStore(dir);
    const settings = store.getSettings();
    expect(settings.ui.hotkeys).toEqual({
      toggleWindow: "Ctrl+Alt+Q",
      providerNext: null,
      providerPrev: null
    });
    expect(settings.ui.backgroundResident).toBe(true);
  });
});
