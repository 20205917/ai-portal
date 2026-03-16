import { describe, expect, it } from "vitest";

import { resolveProviders } from "../src/main/provider/registry";
import type { AppSettings, ProviderDefinition } from "../src/shared/types";

function customProvider(): ProviderDefinition {
  return {
    id: "custom-notion",
    label: "Notion AI",
    url: "https://www.notion.so/product/ai",
    engine: "embedded",
    icon: "N",
    enabled: true,
    persistSession: true,
    fallbackMode: "isolated-external",
    source: "custom",
    removable: true
  };
}

describe("resolveProviders", () => {
  it("applies engine overrides while preserving fallback metadata", () => {
    const settings: AppSettings = {
      version: 3,
      startupResetDone: true,
      lastProviderId: "chatgpt",
      windowBounds: { width: 1200, height: 900 },
      ui: {
        keepAliveLimit: 3,
        backgroundResident: true,
        sidebarAutoHide: false,
        startupView: "workspace",
        loadingOverlayMode: "immediate",
        autoFallbackOnEmbedError: false,
        hotkeys: {
          toggleWindow: "Ctrl+Alt+Q",
          providerNext: null,
          providerPrev: null
        }
      },
      providerOverrides: {
        chatgpt: {
          engine: "isolated-external",
          iconDataUrl: "data:image/png;base64,AA=="
        }
      },
      customProviders: []
    };

    const providers = resolveProviders(settings);
    const chatgpt = providers.find((provider) => provider.id === "chatgpt");

    expect(chatgpt?.engine).toBe("isolated-external");
    expect(chatgpt?.iconDataUrl).toBe("data:image/png;base64,AA==");
    expect(chatgpt?.fallbackMode).toBe("isolated-external");
  });

  it("includes custom providers in the resolved list", () => {
    const settings: AppSettings = {
      version: 3,
      startupResetDone: true,
      lastProviderId: "chatgpt",
      windowBounds: { width: 1200, height: 900 },
      ui: {
        keepAliveLimit: 3,
        backgroundResident: true,
        sidebarAutoHide: false,
        startupView: "workspace",
        loadingOverlayMode: "immediate",
        autoFallbackOnEmbedError: false,
        hotkeys: {
          toggleWindow: "Ctrl+Alt+Q",
          providerNext: null,
          providerPrev: null
        }
      },
      providerOverrides: {},
      customProviders: [customProvider()]
    };

    const providers = resolveProviders(settings);

    expect(providers.some((provider) => provider.id === "custom-notion")).toBe(true);
  });
});
