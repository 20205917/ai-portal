import type { HostEnvironment } from "../shared/types";

interface ResolveHostEnvironmentOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
}

function normalizeToken(value: string | undefined): string {
  const token = (value || "unknown").trim();
  return token || "unknown";
}

export function resolveHostEnvironment(options: ResolveHostEnvironmentOptions = {}): HostEnvironment {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;

  if (platform === "linux") {
    const sessionType = normalizeToken(env.XDG_SESSION_TYPE);
    const desktopSession = normalizeToken(env.DESKTOP_SESSION);
    const currentDesktop = normalizeToken(env.XDG_CURRENT_DESKTOP);
    return {
      sessionType,
      desktopSession,
      currentDesktop,
      summary: `本机环境：Linux ${currentDesktop.toUpperCase()} ${sessionType.toUpperCase()}`
    };
  }

  if (platform === "win32") {
    const sessionType = normalizeToken(env.SESSIONNAME || "windows");
    const desktopSession = normalizeToken(env.USERDOMAIN || env.COMPUTERNAME || "windows");
    const currentDesktop = "windows";
    return {
      sessionType,
      desktopSession,
      currentDesktop,
      summary: `本机环境：Windows ${sessionType.toUpperCase()}`
    };
  }

  const sessionType = normalizeToken(env.XDG_SESSION_TYPE || platform);
  const desktopSession = normalizeToken(env.DESKTOP_SESSION || platform);
  const currentDesktop = normalizeToken(env.XDG_CURRENT_DESKTOP || platform);
  return {
    sessionType,
    desktopSession,
    currentDesktop,
    summary: `本机环境：${platform}`
  };
}
