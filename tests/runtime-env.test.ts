import { describe, expect, it } from "vitest";

import {
  resolveConfigDir as resolveMainConfigDir,
  resolveRuntimeDir as resolveMainRuntimeDir,
  resolveSocketPath as resolveMainSocketPath
} from "../src/main/paths";

describe("runtime-env parity", () => {
  it("matches main path rules on linux", async () => {
    const runtimeEnv = await import("../scripts/lib/runtime-env.mjs");
    const env = {
      XDG_CONFIG_HOME: "/x/config",
      XDG_RUNTIME_DIR: "/x/runtime"
    } as NodeJS.ProcessEnv;
    const options = { platform: "linux" as const, homeDir: "/home/demo" };
    const mainConfigDir = resolveMainConfigDir({ env, ...options });

    expect(runtimeEnv.resolveConfigDir(env, options)).toBe(mainConfigDir);
    expect(runtimeEnv.resolveRuntimeDir(env, options)).toBe(resolveMainRuntimeDir(mainConfigDir, { env, ...options }));
    expect(runtimeEnv.resolveSocketPath(env, options)).toBe(resolveMainSocketPath(mainConfigDir, { env, ...options }));
  });

  it("matches main path rules on windows", async () => {
    const runtimeEnv = await import("../scripts/lib/runtime-env.mjs");
    const env = {
      APPDATA: "C:\\Users\\demo\\AppData\\Roaming",
      USERNAME: "Demo User"
    } as NodeJS.ProcessEnv;
    const options = { platform: "win32" as const, homeDir: "C:\\Users\\demo" };
    const mainConfigDir = resolveMainConfigDir({ env, ...options });

    expect(runtimeEnv.resolveConfigDir(env, options)).toBe(mainConfigDir);
    expect(runtimeEnv.resolveRuntimeDir(env, options)).toBe(resolveMainRuntimeDir(mainConfigDir, { env, ...options }));
    expect(runtimeEnv.resolveSocketPath(env, options)).toBe(resolveMainSocketPath(mainConfigDir, { env, ...options }));
  });

  it("enables no-sandbox by default only on linux", async () => {
    const runtimeEnv = await import("../scripts/lib/runtime-env.mjs");
    const env = {} as NodeJS.ProcessEnv;

    expect(runtimeEnv.shouldEnableNoSandbox(env, { platform: "linux" })).toBe(true);
    expect(runtimeEnv.shouldEnableNoSandbox(env, { platform: "win32" })).toBe(false);
  });
});
