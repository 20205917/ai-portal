export type ProviderEngine = "embedded" | "isolated-external";
export type ProviderSource = "builtin" | "custom";
export type StartupView = "workspace" | "home";
export type LoadingOverlayMode = "immediate" | "strict";
export type ShortcutAction = "toggleWindow" | "providerNext" | "providerPrev";
export type ShortcutRegistrationState = "registered" | "unbound" | "invalid" | "duplicate" | "conflict";

export interface ProviderDefinition {
  id: string;
  label: string;
  url: string;
  engine: ProviderEngine;
  icon: string;
  iconDataUrl?: string;
  enabled: boolean;
  persistSession: boolean;
  fallbackMode: ProviderEngine | null;
  source: ProviderSource;
  removable: boolean;
}

export interface ProviderOverrides {
  enabled?: boolean;
  engine?: ProviderEngine;
  iconDataUrl?: string;
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

export interface HotkeySettings {
  toggleWindow: string;
  providerNext: string | null;
  providerPrev: string | null;
}

export interface HotkeySettingsPatch {
  toggleWindow?: string;
  providerNext?: string | null;
  providerPrev?: string | null;
}

export interface ShortcutStatusItem {
  action: ShortcutAction;
  accelerator: string | null;
  state: ShortcutRegistrationState;
  message: string;
  fallbackCommand?: string;
}

export type ShortcutStatus = Record<ShortcutAction, ShortcutStatusItem>;

export interface UiSettings {
  keepAliveLimit: number;
  backgroundResident: boolean;
  sidebarAutoHide: boolean;
  startupView: StartupView;
  loadingOverlayMode: LoadingOverlayMode;
  autoFallbackOnEmbedError: boolean;
  hotkeys: HotkeySettings;
}

export interface UiSettingsPatch {
  keepAliveLimit?: number;
  backgroundResident?: boolean;
  sidebarAutoHide?: boolean;
  startupView?: StartupView;
  loadingOverlayMode?: LoadingOverlayMode;
  autoFallbackOnEmbedError?: boolean;
  hotkeys?: HotkeySettingsPatch;
}

export interface AppSettings {
  version: number;
  startupResetDone: boolean;
  lastProviderId: string;
  windowBounds: WindowBounds;
  ui: UiSettings;
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
  settings: {
    ui: UiSettings;
  };
  shortcutStatus: ShortcutStatus;
}
