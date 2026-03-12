import type { ProviderDefinition } from "../shared/types";

export type ProviderCycleDirection = "next" | "prev";

export function cycleEnabledProvider(
  providers: ProviderDefinition[],
  activeProviderId: string,
  direction: ProviderCycleDirection
): ProviderDefinition | null {
  const enabledProviders = providers.filter((provider) => provider.enabled);
  if (enabledProviders.length === 0) {
    return null;
  }

  const currentIndex = enabledProviders.findIndex((provider) => provider.id === activeProviderId);
  if (currentIndex === -1) {
    return enabledProviders[0];
  }

  if (direction === "next") {
    return enabledProviders[(currentIndex + 1) % enabledProviders.length];
  }

  return enabledProviders[(currentIndex - 1 + enabledProviders.length) % enabledProviders.length];
}
