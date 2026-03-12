import { globalShortcut } from "electron";

import type {
  HotkeySettings,
  ShortcutAction,
  ShortcutStatus,
  ShortcutStatusItem
} from "../shared/types";

interface ShortcutManagerOptions {
  isX11: boolean;
  platform: NodeJS.Platform;
  onToggleWindow: () => Promise<void>;
  onProviderNext: () => Promise<void>;
  onProviderPrev: () => Promise<void>;
  registrar?: ShortcutRegistrar;
}

interface ShortcutRegistrar {
  register: (accelerator: string, callback: () => void) => boolean;
  unregisterAll: () => void;
}

const ACTIONS: ShortcutAction[] = ["toggleWindow", "providerNext", "providerPrev"];

const COMMAND_BY_ACTION: Record<ShortcutAction, string> = {
  toggleWindow: "aidc toggle",
  providerNext: "aidc next",
  providerPrev: "aidc prev"
};

const NAME_BY_ACTION: Record<ShortcutAction, string> = {
  toggleWindow: "AI 调度台切换",
  providerNext: "AI 调度台下一项",
  providerPrev: "AI 调度台上一项"
};

function normalizeAccelerator(accelerator: string | null | undefined): string | null {
  if (typeof accelerator !== "string") {
    return null;
  }
  const trimmed = accelerator.trim();
  return trimmed ? trimmed : null;
}

function normalizedKey(accelerator: string): string {
  return accelerator.replace(/\s+/g, "").toLowerCase();
}

function toGnomeBinding(accelerator: string): string | null {
  const parts = accelerator.split("+").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  const keyToken = parts[parts.length - 1];
  const modifierTokens = parts.slice(0, -1);
  const modifiers = modifierTokens.map((token) => {
    const normalized = token.toLowerCase();
    if (normalized === "ctrl" || normalized === "control" || normalized === "commandorcontrol") {
      return "<Ctrl>";
    }
    if (normalized === "alt" || normalized === "option") {
      return "<Alt>";
    }
    if (normalized === "shift") {
      return "<Shift>";
    }
    if (normalized === "super" || normalized === "meta" || normalized === "command" || normalized === "cmd") {
      return "<Super>";
    }
    return null;
  });

  if (modifiers.some((value) => value === null)) {
    return null;
  }

  const tokenLower = keyToken.toLowerCase();
  let keyName = "";
  if (/^[a-z0-9]$/i.test(keyToken)) {
    keyName = tokenLower;
  } else if (keyToken === "[") {
    keyName = "bracketleft";
  } else if (keyToken === "]") {
    keyName = "bracketright";
  } else if (tokenLower === "space") {
    keyName = "space";
  } else if (/^f([1-9]|1[0-2])$/i.test(keyToken)) {
    keyName = tokenLower;
  } else {
    return null;
  }

  return `${modifiers.join("")}${keyName}`;
}

function fallbackCommand(action: ShortcutAction, accelerator: string, isX11: boolean): string | undefined {
  if (!isX11) {
    return undefined;
  }
  const binding = toGnomeBinding(accelerator);
  if (!binding) {
    return COMMAND_BY_ACTION[action];
  }
  return `./scripts/install-gnome-shortcut.sh "${NAME_BY_ACTION[action]}" "${binding}" "${COMMAND_BY_ACTION[action]}"`;
}

function conflictMessage(isX11: boolean, platform: NodeJS.Platform): string {
  if (isX11) {
    return "快捷键被系统或其他应用占用。";
  }
  if (platform === "win32") {
    return "快捷键被系统或其他应用占用。请在 Windows 系统设置中调整冲突后重试。";
  }
  return "快捷键被系统或其他应用占用。请在系统快捷键设置中调整冲突后重试。";
}

function statusItem(
  action: ShortcutAction,
  accelerator: string | null,
  state: ShortcutStatusItem["state"],
  message: string,
  fallback?: string
): ShortcutStatusItem {
  return {
    action,
    accelerator,
    state,
    message,
    fallbackCommand: fallback
  };
}

function defaultStatus(): ShortcutStatus {
  return {
    toggleWindow: statusItem("toggleWindow", null, "invalid", "主快捷键未设置。"),
    providerNext: statusItem("providerNext", null, "unbound", "未绑定"),
    providerPrev: statusItem("providerPrev", null, "unbound", "未绑定")
  };
}

function cloneStatus(status: ShortcutStatus): ShortcutStatus {
  return {
    toggleWindow: { ...status.toggleWindow },
    providerNext: { ...status.providerNext },
    providerPrev: { ...status.providerPrev }
  };
}

export class ShortcutManager {
  private readonly registrar: ShortcutRegistrar;
  private status: ShortcutStatus = defaultStatus();

  constructor(private readonly options: ShortcutManagerOptions) {
    this.registrar = options.registrar ?? {
      register: globalShortcut.register.bind(globalShortcut),
      unregisterAll: globalShortcut.unregisterAll.bind(globalShortcut)
    };
  }

  getStatus(): ShortcutStatus {
    return cloneStatus(this.status);
  }

  unregisterAll(): void {
    this.registrar.unregisterAll();
  }

  apply(hotkeys: HotkeySettings): ShortcutStatus {
    this.registrar.unregisterAll();

    const nextStatus = defaultStatus();
    const values: Record<ShortcutAction, string | null> = {
      toggleWindow: normalizeAccelerator(hotkeys.toggleWindow),
      providerNext: normalizeAccelerator(hotkeys.providerNext),
      providerPrev: normalizeAccelerator(hotkeys.providerPrev)
    };

    if (!values.toggleWindow) {
      nextStatus.toggleWindow = statusItem("toggleWindow", null, "invalid", "主快捷键不能为空。");
    }
    if (!values.providerNext) {
      nextStatus.providerNext = statusItem("providerNext", null, "unbound", "未绑定");
    }
    if (!values.providerPrev) {
      nextStatus.providerPrev = statusItem("providerPrev", null, "unbound", "未绑定");
    }

    const duplicates = new Set<ShortcutAction>();
    const seen = new Map<string, ShortcutAction>();
    for (const action of ACTIONS) {
      const accelerator = values[action];
      if (!accelerator) {
        continue;
      }
      const key = normalizedKey(accelerator);
      const existing = seen.get(key);
      if (existing) {
        duplicates.add(existing);
        duplicates.add(action);
      } else {
        seen.set(key, action);
      }
    }

    for (const action of duplicates) {
      nextStatus[action] = statusItem(
        action,
        values[action],
        "duplicate",
        "与其他动作使用了相同快捷键。"
      );
    }

    for (const action of ACTIONS) {
      const accelerator = values[action];
      if (!accelerator || duplicates.has(action)) {
        continue;
      }

      const callback = () => {
        const target = action === "toggleWindow"
          ? this.options.onToggleWindow
          : action === "providerNext"
            ? this.options.onProviderNext
            : this.options.onProviderPrev;
        void target().catch((error) => {
          console.error("[AIDC] Shortcut action failed:", error instanceof Error ? error.message : String(error));
        });
      };

      try {
        const success = this.registrar.register(accelerator, callback);
        if (success) {
          nextStatus[action] = statusItem(action, accelerator, "registered", "已注册");
          continue;
        }

        nextStatus[action] = statusItem(
          action,
          accelerator,
          "conflict",
          conflictMessage(this.options.isX11, this.options.platform),
          fallbackCommand(action, accelerator, this.options.isX11)
        );
      } catch {
        nextStatus[action] = statusItem(
          action,
          accelerator,
          "invalid",
          "快捷键格式无效，请使用 Electron accelerator 语法。"
        );
      }
    }

    this.status = nextStatus;
    return cloneStatus(this.status);
  }
}
