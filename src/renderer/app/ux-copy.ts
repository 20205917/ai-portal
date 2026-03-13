import type { ProviderDefinition } from "../../shared/types";

interface ProviderFeedbackOptions {
  isCurrentProvider: boolean;
  wasRestoredFromCache: boolean;
}

export function buildProviderSwitchFeedback(
  provider: ProviderDefinition,
  options: ProviderFeedbackOptions
): string {
  if (options.isCurrentProvider) {
    return `继续使用 ${provider.label}`;
  }
  if (options.wasRestoredFromCache) {
    return `已恢复 ${provider.label}`;
  }
  return `已切换到 ${provider.label}`;
}

export function buildContinueActionLabel(provider: ProviderDefinition): string {
  if (provider.engine === "isolated-external") {
    return `打开 ${provider.label}`;
  }
  return `继续使用 ${provider.label}`;
}

export function buildContinueActionDescription(provider: ProviderDefinition): string {
  if (provider.engine === "isolated-external") {
    return "这个服务当前使用独立窗口模式，可直接打开或聚焦。";
  }
  return "上次活跃服务已准备就绪，回到工作区即可继续当前会话。";
}

export function buildWorkspaceLoadingCopy(provider: ProviderDefinition, isRestoringFromCache: boolean): {
  eyebrow: string;
  title: string;
  description: string;
} {
  if (isRestoringFromCache) {
    return {
      eyebrow: "已命中保活缓存",
      title: `正在恢复 ${provider.label}`,
      description: "已找到上次保留的页面内容，正在恢复当前会话，通常会比首次打开更快。"
    };
  }

  return {
    eyebrow: "首次进入或重新连接",
    title: `正在打开 ${provider.label}`,
    description: "正在连接目标站点并准备页面内容，首次打开时通常需要等待几秒。"
  };
}

export function buildIsolatedWindowCopy(provider: ProviderDefinition): {
  title: string;
  description: string;
  actionLabel: string;
} {
  return {
    title: `${provider.label} 已在独立窗口中运行`,
    description: "这个服务当前使用独立窗口模式。需要时可以直接打开或聚焦，不必回到浏览器里重新查找。",
    actionLabel: `打开或聚焦 ${provider.label}`
  };
}
