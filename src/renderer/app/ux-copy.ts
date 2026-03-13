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

export function buildWorkspaceLoadingCopy(provider: ProviderDefinition, isRestoringFromCache: boolean): {
  title: string;
  description: string;
} {
  if (isRestoringFromCache) {
    return {
      title: `正在恢复 ${provider.label}`,
      description: "正在恢复上次页面内容，通常会比首次打开更快。"
    };
  }

  return {
    title: `正在打开 ${provider.label}`,
    description: "正在连接目标站点并准备页面，首次打开通常需要几秒。"
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
