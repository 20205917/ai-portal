import type { app as electronApp } from "electron";

export const LOGIN_ITEM_STARTUP_FLAG = "--aiprotal-login-startup";
export const LOGIN_ITEM_STARTUP_ARGS = [LOGIN_ITEM_STARTUP_FLAG, "hide"] as const;

type GetLoginItemSettingsOptions = Parameters<typeof electronApp.getLoginItemSettings>[0];
type SetLoginItemSettingsOptions = Parameters<typeof electronApp.setLoginItemSettings>[0];
type GetLoginItemSettings = (options?: GetLoginItemSettingsOptions) => ReturnType<typeof electronApp.getLoginItemSettings>;
type SetLoginItemSettings = (settings: SetLoginItemSettingsOptions) => void;

export interface LaunchAtLoginState {
  supported: boolean;
  enabled: boolean;
  shouldStartHidden: boolean;
}

interface ResolveLaunchAtLoginStateOptions {
  getLoginItemSettings: GetLoginItemSettings;
  platform?: NodeJS.Platform;
  argv?: string[];
  execPath?: string;
}

interface ApplyLaunchAtLoginPreferenceOptions {
  setLoginItemSettings: SetLoginItemSettings;
  enabled: boolean;
  platform?: NodeJS.Platform;
  execPath?: string;
}

export function isLaunchAtLoginSupported(platform: NodeJS.Platform = process.platform): boolean {
  return platform === "darwin" || platform === "win32";
}

function toLookupOptions(platform: NodeJS.Platform, execPath: string): GetLoginItemSettingsOptions {
  if (!isLaunchAtLoginSupported(platform)) {
    return undefined;
  }
  return {
    path: execPath,
    args: [...LOGIN_ITEM_STARTUP_ARGS]
  };
}

export function buildSetLoginItemSettingsOptions(
  enabled: boolean,
  platform: NodeJS.Platform = process.platform,
  execPath: string = process.execPath
): SetLoginItemSettingsOptions {
  const options: SetLoginItemSettingsOptions = {
    openAtLogin: enabled,
    openAsHidden: true
  };
  if (!isLaunchAtLoginSupported(platform)) {
    return options;
  }
  return {
    ...options,
    path: execPath,
    args: [...LOGIN_ITEM_STARTUP_ARGS]
  };
}

export function resolveLaunchAtLoginState(options: ResolveLaunchAtLoginStateOptions): LaunchAtLoginState {
  const platform = options.platform ?? process.platform;
  const argv = options.argv ?? process.argv;
  const execPath = options.execPath ?? process.execPath;
  const startedWithLaunchFlag = argv.includes(LOGIN_ITEM_STARTUP_FLAG);

  // Linux 暂不走 Electron 登录项能力，避免误触发无效状态写入。
  if (!isLaunchAtLoginSupported(platform)) {
    return {
      supported: false,
      enabled: false,
      shouldStartHidden: false
    };
  }

  const settings = options.getLoginItemSettings(toLookupOptions(platform, execPath));
  const wasOpenedAtLogin = Boolean(settings.wasOpenedAtLogin);
  // 兼容两种来源：系统登录项标记 + 启动参数标记。
  return {
    supported: true,
    enabled: Boolean(settings.openAtLogin),
    shouldStartHidden: wasOpenedAtLogin || startedWithLaunchFlag
  };
}

export function applyLaunchAtLoginPreference(options: ApplyLaunchAtLoginPreferenceOptions): void {
  const platform = options.platform ?? process.platform;
  const execPath = options.execPath ?? process.execPath;
  if (!isLaunchAtLoginSupported(platform)) {
    return;
  }
  options.setLoginItemSettings(buildSetLoginItemSettingsOptions(options.enabled, platform, execPath));
}
