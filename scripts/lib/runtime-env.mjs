import os from "node:os";
import path from "node:path";

export const COMMAND_NAMES = ["toggle", "show", "hide", "open", "status", "next", "prev"];

const APP_DIR_NAME = "AIProtal";
const SOCKET_FILE_NAME = "aidc.sock";
const WINDOWS_PIPE_PREFIX = "\\\\.\\pipe\\";

function resolvePlatform(options = {}) {
  return options.platform ?? process.platform;
}

function resolveHomeDir(options = {}) {
  return options.homeDir ?? os.homedir();
}

function resolvePathModule(platform) {
  return platform === "win32" ? path.win32 : path.posix;
}

function sanitizePipeToken(token) {
  const value = token.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return value || "user";
}

function resolveWindowsPipeName(env = process.env) {
  const userToken = sanitizePipeToken(env.USERNAME || env.USER || "user");
  return `aidc-${userToken}`;
}

export function isNamedPipeEndpoint(endpoint) {
  return endpoint.startsWith(WINDOWS_PIPE_PREFIX);
}

export function shouldEnableNoSandbox(env = process.env, options = {}) {
  if (env.AIPROTAL_NO_SANDBOX === "1") {
    return true;
  }
  if (env.AIPROTAL_NO_SANDBOX === "0") {
    return false;
  }
  return false;
}

export function shouldDisableGpu(env = process.env, options = {}) {
  void options;
  if (env.AIPROTAL_DISABLE_GPU === "1") {
    return true;
  }
  if (env.AIPROTAL_DISABLE_GPU === "0") {
    return false;
  }
  return false;
}

export function shouldDisable3dApis(env = process.env, options = {}) {
  if (env.AIPROTAL_DISABLE_3D_APIS === "1") {
    return true;
  }
  if (env.AIPROTAL_DISABLE_3D_APIS === "0") {
    return false;
  }
  return shouldDisableGpu(env, options);
}

export function resolveConfigDir(env = process.env, options = {}) {
  const platform = resolvePlatform(options);
  const homeDir = resolveHomeDir(options);
  const pathModule = resolvePathModule(platform);
  if (platform === "win32") {
    const root = env.APPDATA || pathModule.join(homeDir, "AppData", "Roaming");
    return pathModule.join(root, APP_DIR_NAME);
  }
  if (platform === "darwin") {
    return pathModule.join(homeDir, "Library", "Application Support", APP_DIR_NAME);
  }
  const root = env.XDG_CONFIG_HOME || pathModule.join(homeDir, ".config");
  return pathModule.join(root, APP_DIR_NAME);
}

export function resolveRuntimeDir(env = process.env, options = {}) {
  const platform = resolvePlatform(options);
  const configDir = resolveConfigDir(env, options);
  if (platform === "linux") {
    return env.XDG_RUNTIME_DIR || configDir;
  }
  return configDir;
}

export function resolveSocketPath(env = process.env, options = {}) {
  const platform = resolvePlatform(options);
  if (platform === "win32") {
    return `${WINDOWS_PIPE_PREFIX}${resolveWindowsPipeName(env)}`;
  }
  const pathModule = resolvePathModule(platform);
  return pathModule.join(resolveRuntimeDir(env, options), SOCKET_FILE_NAME);
}

export function buildElectronFlags(env = process.env, options = {}) {
  const flags = [];
  if (shouldEnableNoSandbox(env, options)) {
    flags.push("--no-sandbox");
  }
  if (shouldDisableGpu(env, options)) {
    flags.push("--disable-gpu");
  }
  if (shouldDisable3dApis(env, options)) {
    flags.push("--disable-3d-apis");
    flags.push("--disable-software-rasterizer");
  }
  return flags;
}

export function withRuntimeDefaults(baseEnv = process.env) {
  return {
    ...baseEnv,
    AIPROTAL_NO_SANDBOX: baseEnv.AIPROTAL_NO_SANDBOX || "1"
  };
}
