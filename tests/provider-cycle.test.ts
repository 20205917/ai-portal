import { describe, expect, it } from "vitest";

import { cycleEnabledProvider } from "../src/main/provider-cycle";
import type { ProviderDefinition } from "../src/shared/types";

function provider(id: string, enabled = true): ProviderDefinition {
  return {
    id,
    label: id,
    url: `https://${id}.example`,
    engine: "embedded",
    icon: id[0].toUpperCase(),
    enabled,
    persistSession: true,
    fallbackMode: "isolated-external",
    source: "custom",
    removable: true
  };
}

describe("cycleEnabledProvider", () => {
  it("cycles among enabled providers only", () => {
    const providers = [provider("a"), provider("b", false), provider("c")];

    expect(cycleEnabledProvider(providers, "a", "next")?.id).toBe("c");
    expect(cycleEnabledProvider(providers, "c", "next")?.id).toBe("a");
    expect(cycleEnabledProvider(providers, "c", "prev")?.id).toBe("a");
  });

  it("returns first enabled provider when active is missing", () => {
    const providers = [provider("a", false), provider("b"), provider("c")];
    expect(cycleEnabledProvider(providers, "missing", "next")?.id).toBe("b");
  });
});
