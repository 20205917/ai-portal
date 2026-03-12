export function shouldEnableNoSandbox(env: NodeJS.ProcessEnv, platform: NodeJS.Platform = process.platform): boolean {
  if (env.AIPROTAL_NO_SANDBOX === "1") {
    return true;
  }
  if (env.AIPROTAL_NO_SANDBOX === "0") {
    return false;
  }
  return platform === "linux";
}

export function shouldDisableGpu(env: NodeJS.ProcessEnv): boolean {
  return env.AIPROTAL_DISABLE_GPU === "1";
}
