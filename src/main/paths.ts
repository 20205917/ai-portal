import os from "node:os";
import path from "node:path";

export function resolveConfigDir(): string {
  const root = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(root, "AIDispatchCenter");
}

export function resolveRuntimeDir(configDir: string): string {
  return process.env.XDG_RUNTIME_DIR || configDir;
}

export function resolveSocketPath(configDir: string): string {
  return path.join(resolveRuntimeDir(configDir), "aidc.sock");
}

