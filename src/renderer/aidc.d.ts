import type { DetailedHTMLProps, HTMLAttributes } from "react";
import type {
  BootstrapPayload,
  NewProviderInput,
  ProviderDefinition,
  RuntimeSnapshot,
  ShortcutStatus,
  UiSettings,
  UiSettingsPatch
} from "../shared/types";

declare global {
  interface Window {
    aidc: {
      getBootstrap: () => Promise<BootstrapPayload>;
      selectProvider: (providerId: string) => Promise<void>;
      updateUiSettings: (patch: UiSettingsPatch) => Promise<void>;
      setProviderEngine: (providerId: string, engine: ProviderDefinition["engine"]) => Promise<void>;
      setProviderEnabled: (providerId: string, enabled: boolean) => Promise<void>;
      createProvider: (input: NewProviderInput) => Promise<void>;
      removeProvider: (providerId: string) => Promise<void>;
      openExternalProvider: (providerId: string) => Promise<void>;
      onProvidersUpdated: (
        listener: (payload: { providers: ProviderDefinition[]; activeProviderId: string }) => void
      ) => () => void;
      onRuntimeUpdated: (listener: (runtime: RuntimeSnapshot) => void) => () => void;
      onSettingsUpdated: (listener: (settings: UiSettings) => void) => () => void;
      onShortcutStatusUpdated: (listener: (status: ShortcutStatus) => void) => () => void;
    };
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        partition?: string;
        allowpopups?: string;
      };
    }
  }
}

export {};
