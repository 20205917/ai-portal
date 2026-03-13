import { describe, expect, it } from "vitest";

import type { ProviderDefinition } from "../src/shared/types";
import {
  buildIsolatedWindowCopy,
  buildProviderSwitchFeedback,
  buildWorkspaceLoadingCopy
} from "../src/renderer/app/ux-copy";

function provider(overrides: Partial<ProviderDefinition> = {}): ProviderDefinition {
  return {
    id: "chatgpt",
    label: "ChatGPT",
    url: "https://chatgpt.com",
    engine: "embedded",
    icon: "C",
    enabled: true,
    persistSession: true,
    fallbackMode: "isolated-external",
    source: "builtin",
    removable: false,
    ...overrides
  };
}

describe("ux-copy", () => {
  it("prefers resume feedback for cached embedded providers", () => {
    expect(
      buildProviderSwitchFeedback(provider({ label: "豆包" }), {
        isCurrentProvider: false,
        wasRestoredFromCache: true
      })
    ).toBe("已恢复 豆包");
  });

  it("uses continue copy for the current provider", () => {
    expect(
      buildProviderSwitchFeedback(provider(), {
        isCurrentProvider: true,
        wasRestoredFromCache: false
      })
    ).toBe("继续使用 ChatGPT");
  });

  it("differentiates fresh loading from restored loading", () => {
    expect(buildWorkspaceLoadingCopy(provider({ label: "豆包" }), true).title).toBe("正在恢复 豆包");
    expect(buildWorkspaceLoadingCopy(provider({ label: "豆包" }), false).title).toBe("正在打开 豆包");
  });

  it("returns action-oriented isolated window copy", () => {
    expect(buildIsolatedWindowCopy(provider({ label: "豆包" })).actionLabel).toBe("打开或聚焦 豆包");
  });
});
