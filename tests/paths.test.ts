import { describe, expect, it } from "vitest";

import {
  isNamedPipeEndpoint,
  resolveConfigDir,
  resolveRuntimeDir,
  resolveSocketPath
} from "../src/main/paths";

describe("paths", () => {
  it("resolves linux config/runtime/socket paths", () => {
    const env = {
      XDG_CONFIG_HOME: "/x/config",
      XDG_RUNTIME_DIR: "/x/runtime"
    } as NodeJS.ProcessEnv;
    const configDir = resolveConfigDir({
      env,
      platform: "linux",
      homeDir: "/home/demo"
    });

    expect(configDir).toBe("/x/config/AIProtal");
    expect(resolveRuntimeDir(configDir, { env, platform: "linux" })).toBe("/x/runtime");
    expect(resolveSocketPath(configDir, { env, platform: "linux" })).toBe("/x/runtime/aidc.sock");
  });

  it("falls back to linux defaults when XDG vars are missing", () => {
    const env = {} as NodeJS.ProcessEnv;
    const configDir = resolveConfigDir({
      env,
      platform: "linux",
      homeDir: "/home/demo"
    });

    expect(configDir).toBe("/home/demo/.config/AIProtal");
    expect(resolveRuntimeDir(configDir, { env, platform: "linux" })).toBe(configDir);
    expect(resolveSocketPath(configDir, { env, platform: "linux" })).toBe(
      "/home/demo/.config/AIProtal/aidc.sock"
    );
  });

  it("resolves windows config and named pipe endpoint", () => {
    const env = {
      APPDATA: "C:\\Users\\demo\\AppData\\Roaming",
      USERNAME: "Demo User"
    } as NodeJS.ProcessEnv;
    const configDir = resolveConfigDir({
      env,
      platform: "win32",
      homeDir: "C:\\Users\\demo"
    });

    expect(configDir).toBe("C:\\Users\\demo\\AppData\\Roaming\\AIProtal");
    expect(resolveRuntimeDir(configDir, { env, platform: "win32" })).toBe(configDir);
    expect(resolveSocketPath(configDir, { env, platform: "win32" })).toBe("\\\\.\\pipe\\aidc-demo-user");
  });

  it("resolves macOS config/runtime/socket paths", () => {
    const env = {} as NodeJS.ProcessEnv;
    const configDir = resolveConfigDir({
      env,
      platform: "darwin",
      homeDir: "/Users/demo"
    });

    expect(configDir).toBe("/Users/demo/Library/Application Support/AIProtal");
    expect(resolveRuntimeDir(configDir, { env, platform: "darwin" })).toBe(configDir);
    expect(resolveSocketPath(configDir, { env, platform: "darwin" })).toBe(
      "/Users/demo/Library/Application Support/AIProtal/aidc.sock"
    );
  });

  it("detects named pipe endpoints", () => {
    expect(isNamedPipeEndpoint("\\\\.\\pipe\\aidc-demo")).toBe(true);
    expect(isNamedPipeEndpoint("/tmp/aidc.sock")).toBe(false);
  });
});
