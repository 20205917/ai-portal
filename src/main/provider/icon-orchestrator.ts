import type { ProviderDefinition } from "../../shared/types";
import { ProviderIconService } from "./icon-service";

interface ProviderIconOrchestratorOptions {
  saveProviderIconDataUrl: (providerId: string, iconDataUrl: string) => void;
  onProviderIconUpdated: () => void;
}

export class ProviderIconOrchestrator {
  private readonly iconService = new ProviderIconService();
  private readonly inFlight = new Set<string>();
  private readonly nextRetryAt = new Map<string, number>();
  private readonly retryIntervalMs = 10 * 60 * 1000;

  constructor(private readonly options: ProviderIconOrchestratorOptions) {}

  ensure(providers: ProviderDefinition[]): void {
    const now = Date.now();
    for (const provider of providers) {
      const retryAt = this.nextRetryAt.get(provider.id) ?? 0;
      if (provider.iconDataUrl || this.inFlight.has(provider.id) || retryAt > now) {
        continue;
      }
      this.inFlight.add(provider.id);
      void this.fetchAndSave(provider.id, provider.url);
    }
  }

  private async fetchAndSave(providerId: string, providerUrl: string): Promise<void> {
    try {
      const iconDataUrl = await this.iconService.fetchIconDataUrl(providerUrl);
      if (!iconDataUrl) {
        this.nextRetryAt.set(providerId, Date.now() + this.retryIntervalMs);
        return;
      }
      this.nextRetryAt.delete(providerId);
      this.options.saveProviderIconDataUrl(providerId, iconDataUrl);
      this.options.onProviderIconUpdated();
    } catch (error) {
      console.warn(
        `[AIDC] Failed to fetch favicon for provider '${providerId}':`,
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      this.inFlight.delete(providerId);
    }
  }
}
