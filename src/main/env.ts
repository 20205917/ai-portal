export function shouldEnableNoSandbox(env: NodeJS.ProcessEnv, platform: NodeJS.Platform = process.platform): boolean {
  if (env.AIPROTAL_NO_SANDBOX === "1") {
    return true;
  }
  if (env.AIPROTAL_NO_SANDBOX === "0") {
    return false;
  }
  return false;
}

export function shouldDisableGpu(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform
): boolean {
  if (env.AIPROTAL_DISABLE_GPU === "1") {
    return true;
  }
  if (env.AIPROTAL_DISABLE_GPU === "0") {
    return false;
  }
  return platform === "linux";
}
