import os from "node:os";
import path from "node:path";

const APP_DIR_NAME = "ai-protal";
const SOCKET_FILE_NAME = "aidc.sock";
const WINDOWS_PIPE_PREFIX = "\\\\.\\pipe\\";

interface ResolvePathOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  homeDir?: string;
}

function resolvePlatform(options: ResolvePathOptions): NodeJS.Platform {
  return options.platform ?? process.platform;
}

function resolveEnv(options: ResolvePathOptions): NodeJS.ProcessEnv {
  return options.env ?? process.env;
}

function resolveHomeDir(options: ResolvePathOptions): string {
  return options.homeDir ?? os.homedir();
}

function resolvePathModule(platform: NodeJS.Platform): typeof path.posix | typeof path.win32 {
  return platform === "win32" ? path.win32 : path.posix;
}

function sanitizePipeToken(token: string): string {
  const value = token.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return value || "user";
}

function resolveWindowsPipeName(env: NodeJS.ProcessEnv): string {
  const userToken = sanitizePipeToken(env.USERNAME || env.USER || "user");
  return `aidc-${userToken}`;
}

export function isNamedPipeEndpoint(endpoint: string): boolean {
  return endpoint.startsWith(WINDOWS_PIPE_PREFIX);
}

export function resolveConfigDir(options: ResolvePathOptions = {}): string {
  const env = resolveEnv(options);
  const platform = resolvePlatform(options);
  const homeDir = resolveHomeDir(options);
  const pathModule = resolvePathModule(platform);

  if (platform === "win32") {
    const root = env.APPDATA || pathModule.join(homeDir, "AppData", "Roaming");
    return pathModule.join(root, APP_DIR_NAME);
  }

  const root = env.XDG_CONFIG_HOME || pathModule.join(homeDir, ".config");
  return pathModule.join(root, APP_DIR_NAME);
}

export function resolveRuntimeDir(configDir: string, options: ResolvePathOptions = {}): string {
  const env = resolveEnv(options);
  const platform = resolvePlatform(options);
  if (platform === "linux") {
    return env.XDG_RUNTIME_DIR || configDir;
  }
  return configDir;
}

export function resolveSocketPath(configDir: string, options: ResolvePathOptions = {}): string {
  const env = resolveEnv(options);
  const platform = resolvePlatform(options);
  if (platform === "win32") {
    return `${WINDOWS_PIPE_PREFIX}${resolveWindowsPipeName(env)}`;
  }
  const pathModule = resolvePathModule(platform);
  return pathModule.join(resolveRuntimeDir(configDir, options), SOCKET_FILE_NAME);
}
