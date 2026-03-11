export type ProviderEngine = "embedded" | "isolated-external";
export type ProviderSource = "builtin" | "custom";

export interface ProviderDefinition {
  id: string;
  label: string;
  url: string;
  engine: ProviderEngine;
  icon: string;
  enabled: boolean;
  persistSession: boolean;
  fallbackMode: ProviderEngine | null;
  source: ProviderSource;
  removable: boolean;
}

export interface ProviderOverrides {
  enabled?: boolean;
  engine?: ProviderEngine;
}

export interface NewProviderInput {
  label: string;
  url: string;
  icon?: string;
}

export interface WindowBounds {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export type RuntimeState =
  | "stopped"
  | "hidden"
  | "visible-unfocused"
  | "visible-focused";

export interface RuntimeSnapshot {
  state: RuntimeState;
  activeProviderId: string;
  updatedAt: string;
}

export interface HostEnvironment {
  sessionType: string;
  desktopSession: string;
  currentDesktop: string;
  summary: string;
}

export interface AppSettings {
  version: number;
  startupResetDone: boolean;
  lastProviderId: string;
  windowBounds: WindowBounds;
  providerOverrides: Record<string, ProviderOverrides>;
  customProviders: ProviderDefinition[];
}

export interface BootstrapPayload {
  appId: string;
  appName: string;
  configDir: string;
  socketPath: string;
  environment: HostEnvironment;
  providers: ProviderDefinition[];
  activeProviderId: string;
  runtime: RuntimeSnapshot;
}
