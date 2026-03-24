import { describe, expect, it, vi } from "vitest";

import {
  LOGIN_ITEM_STARTUP_ARGS,
  LOGIN_ITEM_STARTUP_FLAG,
  applyLaunchAtLoginPreference,
  buildSetLoginItemSettingsOptions,
  isLaunchAtLoginSupported,
  resolveLaunchAtLoginState
} from "../src/main/login-item";

describe("login-item", () => {
  it("detects launch-at-login support by platform", () => {
    expect(isLaunchAtLoginSupported("darwin")).toBe(true);
    expect(isLaunchAtLoginSupported("win32")).toBe(true);
    expect(isLaunchAtLoginSupported("linux")).toBe(false);
  });

  it("returns unsupported state on linux without querying login item settings", () => {
    const getLoginItemSettings = vi.fn(() => ({ openAtLogin: true, wasOpenedAtLogin: true }));
    const state = resolveLaunchAtLoginState({
      platform: "linux",
      argv: [],
      execPath: "/usr/bin/ai",
      getLoginItemSettings
    });
    expect(state).toEqual({
      supported: false,
      enabled: false,
      shouldStartHidden: false
    });
    expect(getLoginItemSettings).not.toHaveBeenCalled();
  });

  it("reads openAtLogin and wasOpenedAtLogin from system settings", () => {
    const getLoginItemSettings = vi.fn(() => ({ openAtLogin: true, wasOpenedAtLogin: true }));
    const state = resolveLaunchAtLoginState({
      platform: "darwin",
      argv: [],
      execPath: "/Applications/AIProtal.app/Contents/MacOS/AIProtal",
      getLoginItemSettings
    });
    expect(state).toEqual({
      supported: true,
      enabled: true,
      shouldStartHidden: true
    });
    expect(getLoginItemSettings).toHaveBeenCalledWith({
      path: "/Applications/AIProtal.app/Contents/MacOS/AIProtal",
      args: [...LOGIN_ITEM_STARTUP_ARGS]
    });
  });

  it("treats explicit startup flag as hidden-start signal", () => {
    const getLoginItemSettings = vi.fn(() => ({ openAtLogin: false, wasOpenedAtLogin: false }));
    const state = resolveLaunchAtLoginState({
      platform: "win32",
      argv: ["AIProtal.exe", LOGIN_ITEM_STARTUP_FLAG],
      execPath: "C:\\Program Files\\AIProtal\\AIProtal.exe",
      getLoginItemSettings
    });
    expect(state.supported).toBe(true);
    expect(state.enabled).toBe(false);
    expect(state.shouldStartHidden).toBe(true);
  });

  it("builds login item settings with path and startup args on supported platforms", () => {
    const options = buildSetLoginItemSettingsOptions(
      true,
      "darwin",
      "/Applications/AIProtal.app/Contents/MacOS/AIProtal"
    );
    expect(options).toEqual({
      openAtLogin: true,
      openAsHidden: true,
      path: "/Applications/AIProtal.app/Contents/MacOS/AIProtal",
      args: [...LOGIN_ITEM_STARTUP_ARGS]
    });
  });

  it("does not call setLoginItemSettings on unsupported platforms", () => {
    const setLoginItemSettings = vi.fn();
    applyLaunchAtLoginPreference({
      platform: "linux",
      enabled: true,
      execPath: "/usr/bin/ai",
      setLoginItemSettings
    });
    expect(setLoginItemSettings).not.toHaveBeenCalled();
  });

  it("applies login item settings on supported platforms", () => {
    const setLoginItemSettings = vi.fn();
    applyLaunchAtLoginPreference({
      platform: "win32",
      enabled: true,
      execPath: "C:\\Program Files\\AIProtal\\AIProtal.exe",
      setLoginItemSettings
    });
    expect(setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
      openAsHidden: true,
      path: "C:\\Program Files\\AIProtal\\AIProtal.exe",
      args: [...LOGIN_ITEM_STARTUP_ARGS]
    });
  });
});
