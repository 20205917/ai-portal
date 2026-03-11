import type { ProviderDefinition } from "../../shared/types";

export function hostLabel(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function glyphFor(provider: ProviderDefinition): string {
  const source = provider.label.trim() || hostLabel(provider.url);
  const ascii = source.replace(/[^A-Za-z0-9]/g, "");
  if (ascii) {
    return ascii[0]!.toUpperCase();
  }

  return source[0] || "A";
}

function colorFor(provider: ProviderDefinition): string {
  const seed = `${provider.id}:${provider.url}`;
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }

  return `hsl(${hash} 42% 16%)`;
}

export function providerIconStyle(provider: ProviderDefinition): { background: string } {
  return {
    background: `linear-gradient(180deg, ${colorFor(provider)}, rgba(7, 15, 18, 0.96))`
  };
}

export function partitionFor(provider: ProviderDefinition): string | undefined {
  if (!provider.persistSession) {
    return undefined;
  }

  return provider.engine === "embedded"
    ? `persist:aidc-${provider.id}`
    : `persist:aidc-${provider.id}-isolated`;
}
