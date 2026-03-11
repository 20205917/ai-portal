export function shouldEnableNoSandbox(env: NodeJS.ProcessEnv): boolean {
  if (env.AIDC_NO_SANDBOX === "1") {
    return true;
  }
  if (env.AIDC_NO_SANDBOX === "0") {
    return false;
  }
  return process.platform === "linux";
}

export function shouldDisableGpu(env: NodeJS.ProcessEnv): boolean {
  return env.AIDC_DISABLE_GPU === "1";
}
