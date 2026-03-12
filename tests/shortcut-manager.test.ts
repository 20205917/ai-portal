import { describe, expect, it } from "vitest";

import { ShortcutManager } from "../src/main/shortcut-manager";
import type { HotkeySettings } from "../src/shared/types";

class FakeRegistrar {
  public registered: string[] = [];
  public unregisterAllCount = 0;
  private readonly failSet = new Set<string>();
  private readonly throwSet = new Set<string>();

  setFail(accelerator: string): void {
    this.failSet.add(accelerator);
  }

  setThrow(accelerator: string): void {
    this.throwSet.add(accelerator);
  }

  register(accelerator: string, _callback: () => void): boolean {
    if (this.throwSet.has(accelerator)) {
      throw new Error("invalid");
    }
    this.registered.push(accelerator);
    return !this.failSet.has(accelerator);
  }

  unregisterAll(): void {
    this.unregisterAllCount += 1;
    this.registered = [];
  }
}

function settings(partial: Partial<HotkeySettings> = {}): HotkeySettings {
  return {
    toggleWindow: "Ctrl+Alt+Q",
    providerNext: null,
    providerPrev: null,
    ...partial
  };
}

describe("ShortcutManager", () => {
  it("registers toggle and keeps next/prev unbound by default", () => {
    const registrar = new FakeRegistrar();
    const manager = new ShortcutManager({
      isX11: false,
      registrar,
      onToggleWindow: async () => undefined,
      onProviderNext: async () => undefined,
      onProviderPrev: async () => undefined
    });

    const status = manager.apply(settings());
    expect(registrar.registered).toEqual(["Ctrl+Alt+Q"]);
    expect(status.toggleWindow.state).toBe("registered");
    expect(status.providerNext.state).toBe("unbound");
    expect(status.providerPrev.state).toBe("unbound");
  });

  it("marks duplicate accelerators", () => {
    const registrar = new FakeRegistrar();
    const manager = new ShortcutManager({
      isX11: false,
      registrar,
      onToggleWindow: async () => undefined,
      onProviderNext: async () => undefined,
      onProviderPrev: async () => undefined
    });

    const status = manager.apply(settings({
      providerNext: "Ctrl+Alt+Q"
    }));
    expect(status.toggleWindow.state).toBe("duplicate");
    expect(status.providerNext.state).toBe("duplicate");
    expect(registrar.registered).toEqual([]);
  });

  it("returns conflict with gnome fallback command on x11", () => {
    const registrar = new FakeRegistrar();
    registrar.setFail("Ctrl+Alt+Q");
    const manager = new ShortcutManager({
      isX11: true,
      registrar,
      onToggleWindow: async () => undefined,
      onProviderNext: async () => undefined,
      onProviderPrev: async () => undefined
    });

    const status = manager.apply(settings());
    expect(status.toggleWindow.state).toBe("conflict");
    expect(status.toggleWindow.fallbackCommand).toContain("aidc toggle");
    expect(status.toggleWindow.fallbackCommand).toContain("install-gnome-shortcut.sh");
  });

  it("marks invalid accelerator when registrar throws", () => {
    const registrar = new FakeRegistrar();
    registrar.setThrow("invalid");
    const manager = new ShortcutManager({
      isX11: false,
      registrar,
      onToggleWindow: async () => undefined,
      onProviderNext: async () => undefined,
      onProviderPrev: async () => undefined
    });

    const status = manager.apply(settings({
      toggleWindow: "invalid"
    }));
    expect(status.toggleWindow.state).toBe("invalid");
  });
});
