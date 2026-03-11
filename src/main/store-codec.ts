import fs from "node:fs";

import {
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
  SETTINGS_VERSION
} from "../shared/constants";
import type {
  AppSettings,
  NewProviderInput,
  ProviderDefinition,
  ProviderEngine,
  WindowBounds
} from "../shared/types";

interface RawSettings {
  version?: unknown;
  startupResetDone?: unknown;
  lastProviderId?: unknown;
  windowBounds?: unknown;
  providerOverrides?: unknown;
  customProviders?: unknown;
}

function defaultWindowBounds(): WindowBounds {
  return {
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT
  };
}

export function defaultSettings(): AppSettings {
  return {
    version: SETTINGS_VERSION,
    startupResetDone: false,
    lastProviderId: "chatgpt",
    windowBounds: defaultWindowBounds(),
    providerOverrides: {},
    customProviders: []
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProviderEngine(value: unknown): value is ProviderEngine {
  return value === "embedded" || value === "isolated-external";
}

function parseWindowBounds(value: unknown): WindowBounds {
  const fallback = defaultWindowBounds();
  if (!isObject(value)) {
    return fallback;
  }

  const width = typeof value.width === "number" ? value.width : fallback.width;
  const height = typeof value.height === "number" ? value.height : fallback.height;
  const x = typeof value.x === "number" ? value.x : undefined;
  const y = typeof value.y === "number" ? value.y : undefined;
  return { width, height, x, y };
}

function parseProvider(provider: unknown): ProviderDefinition | null {
  if (!isObject(provider)) {
    return null;
  }

  if (
    typeof provider.id !== "string"
    || typeof provider.label !== "string"
    || typeof provider.url !== "string"
    || !isProviderEngine(provider.engine)
    || typeof provider.icon !== "string"
    || (provider.iconDataUrl !== undefined && typeof provider.iconDataUrl !== "string")
    || typeof provider.enabled !== "boolean"
    || typeof provider.persistSession !== "boolean"
    || (provider.fallbackMode !== null && !isProviderEngine(provider.fallbackMode))
    || (provider.source !== "builtin" && provider.source !== "custom")
    || typeof provider.removable !== "boolean"
  ) {
    return null;
  }

  return {
    id: provider.id,
    label: provider.label,
    url: provider.url,
    engine: provider.engine,
    icon: provider.icon,
    iconDataUrl: provider.iconDataUrl,
    enabled: provider.enabled,
    persistSession: provider.persistSession,
    fallbackMode: provider.fallbackMode,
    source: provider.source,
    removable: provider.removable
  };
}

function parseProviderOverrides(value: unknown): AppSettings["providerOverrides"] {
  if (!isObject(value)) {
    return {};
  }

  const overrides: AppSettings["providerOverrides"] = {};
  for (const [providerId, rawOverride] of Object.entries(value)) {
    if (!isObject(rawOverride)) {
      continue;
    }

    const next: AppSettings["providerOverrides"][string] = {};
    if (typeof rawOverride.enabled === "boolean") {
      next.enabled = rawOverride.enabled;
    }
    if (isProviderEngine(rawOverride.engine)) {
      next.engine = rawOverride.engine;
    }
    if (typeof rawOverride.iconDataUrl === "string") {
      next.iconDataUrl = rawOverride.iconDataUrl;
    }
    overrides[providerId] = next;
  }

  return overrides;
}

function parseSettings(raw: unknown): AppSettings {
  const fallback = defaultSettings();
  if (!isObject(raw)) {
    return fallback;
  }

  const data = raw as RawSettings;
  const customProviders = Array.isArray(data.customProviders)
    ? data.customProviders.map(parseProvider).filter((provider): provider is ProviderDefinition => Boolean(provider))
    : [];

  return {
    version: typeof data.version === "number" ? data.version : fallback.version,
    startupResetDone: Boolean(data.startupResetDone),
    lastProviderId: typeof data.lastProviderId === "string" ? data.lastProviderId : fallback.lastProviderId,
    windowBounds: parseWindowBounds(data.windowBounds),
    providerOverrides: parseProviderOverrides(data.providerOverrides),
    customProviders
  };
}

export function readSettingsFile(settingsPath: string): AppSettings {
  try {
    const raw = fs.readFileSync(settingsPath, "utf8");
    return parseSettings(JSON.parse(raw));
  } catch {
    return defaultSettings();
  }
}

function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `https://${url}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function pickIcon(input: NewProviderInput): string {
  const candidate = (input.icon || input.label).trim();
  return candidate ? candidate[0] : "A";
}

export function createCustomProvider(input: NewProviderInput): ProviderDefinition {
  return {
    id: `custom-${Date.now().toString(36)}-${slugify(input.label || "ai") || "ai"}`,
    label: input.label.trim(),
    url: normalizeUrl(input.url.trim()),
    icon: pickIcon(input),
    engine: "embedded",
    enabled: true,
    persistSession: true,
    fallbackMode: "isolated-external",
    source: "custom",
    removable: true
  };
}
