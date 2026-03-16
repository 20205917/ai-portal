import { describe, expect, it } from "vitest";

import {
  captureHotkeyFromInput,
  resolveHotkeyEditorCommand,
  resolveHotkeySubmitValue
} from "../src/renderer/app/hotkey-capture";

describe("hotkey capture", () => {
  it("captures Ctrl+Alt+K", () => {
    const captured = captureHotkeyFromInput({
      key: "k",
      code: "KeyK",
      ctrlKey: true,
      altKey: true
    });

    expect(captured).toEqual({
      ok: true,
      accelerator: "Ctrl+Alt+K"
    });
  });

  it("captures Ctrl+Shift+] with bracket code", () => {
    const captured = captureHotkeyFromInput({
      key: "}",
      code: "BracketRight",
      ctrlKey: true,
      shiftKey: true
    });

    expect(captured).toEqual({
      ok: true,
      accelerator: "Ctrl+Shift+]"
    });
  });

  it("rejects combinations without modifiers", () => {
    const captured = captureHotkeyFromInput({
      key: "A",
      code: "KeyA"
    });

    expect(captured.ok).toBe(false);
    if (captured.ok) {
      return;
    }
    expect(captured.code).toBe("no-modifier");
  });

  it("rejects modifier-only key presses", () => {
    const captured = captureHotkeyFromInput({
      key: "Control",
      code: "ControlLeft",
      ctrlKey: true
    });

    expect(captured.ok).toBe(false);
    if (captured.ok) {
      return;
    }
    expect(captured.code).toBe("modifier-only");
  });

  it("resolves Enter and Esc editor commands", () => {
    expect(resolveHotkeyEditorCommand({
      key: "Enter",
      code: "Enter"
    }).type).toBe("submit");

    expect(resolveHotkeyEditorCommand({
      key: "Escape",
      code: "Escape"
    }).type).toBe("cancel");
  });

  it("allows clear for optional actions and blocks empty toggle", () => {
    expect(resolveHotkeySubmitValue("providerNext", "   ")).toEqual({
      ok: true,
      value: null
    });

    expect(resolveHotkeySubmitValue("toggleWindow", "")).toEqual({
      ok: false,
      message: "主快捷键不能为空。"
    });
  });
});
