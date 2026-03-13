export function clampRetainedEmbeddedProviderIds(providerIds: string[], keepAliveLimit: number): string[] {
  if (keepAliveLimit <= 0) {
    return [];
  }
  if (providerIds.length <= keepAliveLimit) {
    return providerIds;
  }
  return providerIds.slice(-keepAliveLimit);
}

export function updateRetainedEmbeddedProviderIds(
  providerIds: string[],
  activeProviderId: string,
  keepAliveLimit: number
): string[] {
  const next = providerIds.filter((providerId) => providerId !== activeProviderId);
  next.push(activeProviderId);
  return clampRetainedEmbeddedProviderIds(next, keepAliveLimit);
}

export function wasProviderRestoredFromCache(providerIds: string[], providerId: string | null): boolean {
  if (!providerId) {
    return false;
  }
  return providerIds.includes(providerId);
}
