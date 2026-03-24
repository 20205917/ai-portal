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

  it("matches main path rules on macOS", async () => {
    const runtimeEnv = await import("../scripts/lib/runtime-env.mjs");
    const env = {} as NodeJS.ProcessEnv;
    const options = { platform: "darwin" as const, homeDir: "/Users/demo" };
    const mainConfigDir = resolveMainConfigDir({ env, ...options });

    expect(runtimeEnv.resolveConfigDir(env, options)).toBe(mainConfigDir);
    expect(runtimeEnv.resolveRuntimeDir(env, options)).toBe(resolveMainRuntimeDir(mainConfigDir, { env, ...options }));
    expect(runtimeEnv.resolveSocketPath(env, options)).toBe(resolveMainSocketPath(mainConfigDir, { env, ...options }));
  });

  it("disables no-sandbox by default", async () => {
    const runtimeEnv = await import("../scripts/lib/runtime-env.mjs");
    const env = {} as NodeJS.ProcessEnv;

    expect(runtimeEnv.shouldEnableNoSandbox(env, { platform: "linux" })).toBe(false);
    expect(runtimeEnv.shouldEnableNoSandbox(env, { platform: "win32" })).toBe(false);
  });

  it("keeps gpu and 3d apis enabled by default", async () => {
    const runtimeEnv = await import("../scripts/lib/runtime-env.mjs");
    const env = {} as NodeJS.ProcessEnv;

    expect(runtimeEnv.shouldDisableGpu(env, { platform: "linux" })).toBe(false);
    expect(runtimeEnv.shouldDisableGpu(env, { platform: "win32" })).toBe(false);
    expect(runtimeEnv.shouldDisable3dApis(env, { platform: "linux" })).toBe(false);
    expect(runtimeEnv.shouldDisable3dApis(env, { platform: "win32" })).toBe(false);
    expect(runtimeEnv.buildElectronFlags(env, { platform: "linux" })).not.toContain("--disable-gpu");
    expect(runtimeEnv.buildElectronFlags(env, { platform: "linux" })).not.toContain("--disable-3d-apis");
  });

  it("allows overriding 3d api policy by env", async () => {
    const runtimeEnv = await import("../scripts/lib/runtime-env.mjs");
    const env = {
      AIPROTAL_DISABLE_GPU: "0",
      AIPROTAL_DISABLE_3D_APIS: "1"
    } as NodeJS.ProcessEnv;

    expect(runtimeEnv.shouldDisable3dApis(env, { platform: "linux" })).toBe(true);
    expect(runtimeEnv.buildElectronFlags(env, { platform: "linux" })).toContain("--disable-3d-apis");
  });

  it("disables 3d apis automatically when gpu is explicitly disabled", async () => {
    const runtimeEnv = await import("../scripts/lib/runtime-env.mjs");
    const env = {
      AIPROTAL_DISABLE_GPU: "1"
    } as NodeJS.ProcessEnv;

    expect(runtimeEnv.shouldDisableGpu(env, { platform: "linux" })).toBe(true);
    expect(runtimeEnv.shouldDisable3dApis(env, { platform: "linux" })).toBe(true);
    expect(runtimeEnv.buildElectronFlags(env, { platform: "linux" })).toContain("--disable-gpu");
    expect(runtimeEnv.buildElectronFlags(env, { platform: "linux" })).toContain("--disable-3d-apis");
  });
});
