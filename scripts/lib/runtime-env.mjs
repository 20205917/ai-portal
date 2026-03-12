import os from "node:os";
import path from "node:path";

export const COMMAND_NAMES = ["toggle", "show", "hide", "open", "status", "next", "prev"];

export function shouldEnableNoSandbox(env = process.env) {
  if (env.AIDC_NO_SANDBOX === "1") {
    return true;
  }
  if (env.AIDC_NO_SANDBOX === "0") {
    return false;
  }
  return process.platform === "linux";
}

export function shouldDisableGpu(env = process.env) {
  return env.AIDC_DISABLE_GPU === "1";
}

export function resolveConfigDir(env = process.env) {
  const root = env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(root, "AIDispatchCenter");
}

export function resolveRuntimeDir(env = process.env) {
  return env.XDG_RUNTIME_DIR || resolveConfigDir(env);
}

export function resolveSocketPath(env = process.env) {
  return path.join(resolveRuntimeDir(env), "aidc.sock");
}

export function buildElectronFlags(env = process.env) {
  const flags = [];
  if (shouldEnableNoSandbox(env)) {
    flags.push("--no-sandbox");
  }
  if (shouldDisableGpu(env)) {
    flags.push("--disable-gpu");
  }
  return flags;
}
