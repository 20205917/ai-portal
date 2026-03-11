import { defaultProviders } from "../shared/providers";
import type {
  AppSettings,
  ProviderDefinition,
  ProviderOverrides
} from "../shared/types";

function mergeProvider(provider: ProviderDefinition, overrides?: ProviderOverrides): ProviderDefinition {
  return {
    ...provider,
    enabled: overrides?.enabled ?? provider.enabled,
    engine: overrides?.engine ?? provider.engine
  };
}

export function resolveDeclaredProviders(settings: AppSettings): ProviderDefinition[] {
  return [...defaultProviders, ...settings.customProviders].map((provider) => ({ ...provider }));
}

export function resolveProviders(settings: AppSettings): ProviderDefinition[] {
  return resolveDeclaredProviders(settings).map((provider) =>
    mergeProvider(provider, settings.providerOverrides[provider.id])
  );
}

export function pickDefaultProvider(providers: ProviderDefinition[]): ProviderDefinition {
  const firstEnabled = providers.find((provider) => provider.enabled);

  if (!firstEnabled) {
    throw new Error("No enabled providers are configured.");
  }

  return firstEnabled;
}

export function isProviderEngineAllowed(settings: AppSettings, providerId: string, engine: ProviderDefinition["engine"]): boolean {
  const declared = resolveDeclaredProviders(settings).find((provider) => provider.id === providerId);

  if (!declared) {
    return false;
  }

  return declared.engine === engine || declared.fallbackMode === engine;
}
