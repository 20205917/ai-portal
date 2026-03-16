import type { ShortcutAction } from "../../shared/types";

export interface HotkeyCaptureInput {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}

type HotkeyCaptureErrorCode = "no-modifier" | "modifier-only" | "unsupported-key";

interface HotkeyCaptureSuccess {
  ok: true;
  accelerator: string;
}

interface HotkeyCaptureFailure {
  ok: false;
  code: HotkeyCaptureErrorCode;
  message: string;
}

export type HotkeyCaptureResult = HotkeyCaptureSuccess | HotkeyCaptureFailure;

interface HotkeySubmitSuccess {
  ok: true;
  value: string | null;
}

interface HotkeySubmitFailure {
  ok: false;
  message: string;
}

export type HotkeySubmitResult = HotkeySubmitSuccess | HotkeySubmitFailure;

type HotkeyEditorCommand =
  | { type: "capture"; accelerator: string }
  | { type: "submit" }
  | { type: "cancel" }
  | { type: "invalid"; message: string };

const MODIFIER_KEYS = new Set(["control", "alt", "shift", "meta", "os"]);

const CODE_TO_MAIN_KEY: Record<string, string> = {
  BracketLeft: "[",
  BracketRight: "]",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  Semicolon: ";",
  Quote: "'",
  Backslash: "\\",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Space: "Space",
  Tab: "Tab",
  Enter: "Enter",
  Escape: "Esc",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  Backspace: "Backspace",
  Delete: "Delete",
  Insert: "Insert",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown"
};

const RAW_TO_MAIN_KEY: Record<string, string> = {
  " ": "Space",
  space: "Space",
  spacebar: "Space",
  tab: "Tab",
  enter: "Enter",
  return: "Enter",
  esc: "Esc",
  escape: "Esc",
  arrowup: "Up",
  up: "Up",
  arrowdown: "Down",
  down: "Down",
  arrowleft: "Left",
  left: "Left",
  arrowright: "Right",
  right: "Right",
  backspace: "Backspace",
  delete: "Delete",
  insert: "Insert",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown"
};

const PUNCTUATION_MAIN_KEYS = new Set(["[", "]", "`", "-", "=", ";", "'", "\\", ",", ".", "/"]);

function readBoolean(value: boolean | undefined): boolean {
  return value === true;
}

function hasModifier(input: HotkeyCaptureInput): boolean {
  return readBoolean(input.ctrlKey)
    || readBoolean(input.altKey)
    || readBoolean(input.shiftKey)
    || readBoolean(input.metaKey);
}

function isModifierOnly(input: HotkeyCaptureInput): boolean {
  const normalizedKey = input.key.trim().toLowerCase();
  if (MODIFIER_KEYS.has(normalizedKey)) {
    return true;
  }
  return /^(Control|Shift|Alt|Meta|OS)(Left|Right)?$/u.test(input.code ?? "");
}

function normalizeMainKeyFromCode(code: string | undefined): string | null {
  if (!code) {
    return null;
  }
  if (/^Key[A-Z]$/u.test(code)) {
    return code.slice(3);
  }
  if (/^Digit[0-9]$/u.test(code)) {
    return code.slice(5);
  }
  if (/^F([1-9]|1[0-2])$/u.test(code)) {
    return code;
  }
  return CODE_TO_MAIN_KEY[code] ?? null;
}

function normalizeMainKeyFromRawKey(rawKey: string): string | null {
  if (!rawKey) {
    return null;
  }

  if (/^[a-z]$/iu.test(rawKey)) {
    return rawKey.toUpperCase();
  }
  if (/^[0-9]$/u.test(rawKey)) {
    return rawKey;
  }
  if (/^f([1-9]|1[0-2])$/iu.test(rawKey)) {
    return rawKey.toUpperCase();
  }

  if (PUNCTUATION_MAIN_KEYS.has(rawKey)) {
    return rawKey;
  }

  return RAW_TO_MAIN_KEY[rawKey.trim().toLowerCase()] ?? null;
}

function normalizeMainKey(input: HotkeyCaptureInput): string | null {
  return normalizeMainKeyFromCode(input.code) ?? normalizeMainKeyFromRawKey(input.key);
}

export function shouldBypassHotkeyCapture(input: HotkeyCaptureInput): boolean {
  return !hasModifier(input) && input.key.trim().toLowerCase() === "tab";
}

export function captureHotkeyFromInput(input: HotkeyCaptureInput): HotkeyCaptureResult {
  if (!hasModifier(input)) {
    return {
      ok: false,
      code: "no-modifier",
      message: "请至少包含一个修饰键（Ctrl/Alt/Shift/Cmd）。"
    };
  }

  const mainKey = normalizeMainKey(input);
  if (!mainKey) {
    if (isModifierOnly(input)) {
      return {
        ok: false,
        code: "modifier-only",
        message: "请在修饰键之外再按一个主键。"
      };
    }
    return {
      ok: false,
      code: "unsupported-key",
      message: "暂不支持该按键，请更换组合。"
    };
  }

  const modifiers: string[] = [];
  if (readBoolean(input.ctrlKey)) {
    modifiers.push("Ctrl");
  }
  if (readBoolean(input.altKey)) {
    modifiers.push("Alt");
  }
  if (readBoolean(input.shiftKey)) {
    modifiers.push("Shift");
  }
  if (readBoolean(input.metaKey)) {
    modifiers.push("Super");
  }

  return {
    ok: true,
    accelerator: [...modifiers, mainKey].join("+")
  };
}

export function resolveHotkeyEditorCommand(input: HotkeyCaptureInput): HotkeyEditorCommand {
  const loweredKey = input.key.trim().toLowerCase();
  if (!hasModifier(input) && loweredKey === "enter") {
    return { type: "submit" };
  }
  if (!hasModifier(input) && (loweredKey === "escape" || loweredKey === "esc")) {
    return { type: "cancel" };
  }

  const captured = captureHotkeyFromInput(input);
  if (captured.ok) {
    return { type: "capture", accelerator: captured.accelerator };
  }
  return { type: "invalid", message: captured.message };
}

export function resolveHotkeySubmitValue(action: ShortcutAction, value: string): HotkeySubmitResult {
  const normalized = value.trim();
  if (!normalized) {
    if (action === "toggleWindow") {
      return {
        ok: false,
        message: "主快捷键不能为空。"
      };
    }
    return {
      ok: true,
      value: null
    };
  }

  return {
    ok: true,
    value: normalized
  };
}
