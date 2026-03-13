import { describe, expect, it } from "vitest";

import {
  clampRetainedEmbeddedProviderIds,
  updateRetainedEmbeddedProviderIds,
  wasProviderRestoredFromCache
} from "../src/renderer/app/workspace-cache";

describe("workspace-cache", () => {
  it("clamps retained providers to the latest entries", () => {
    expect(clampRetainedEmbeddedProviderIds(["a", "b", "c"], 2)).toEqual(["b", "c"]);
    expect(clampRetainedEmbeddedProviderIds(["a", "b"], 0)).toEqual([]);
  });

  it("moves the active provider to the tail before clamping", () => {
    expect(updateRetainedEmbeddedProviderIds(["a", "b", "c"], "b", 2)).toEqual(["c", "b"]);
    expect(updateRetainedEmbeddedProviderIds([], "a", 3)).toEqual(["a"]);
  });

  it("detects whether the active provider was already cached", () => {
    expect(wasProviderRestoredFromCache(["a", "b"], "b")).toBe(true);
    expect(wasProviderRestoredFromCache(["a", "b"], "c")).toBe(false);
    expect(wasProviderRestoredFromCache(["a", "b"], null)).toBe(false);
  });
});
