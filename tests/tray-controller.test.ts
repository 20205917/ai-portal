import { beforeEach, describe, expect, it, vi } from "vitest";

type MenuItem = {
  label?: string;
  enabled?: boolean;
  type?: string;
  click?: () => void;
};

const trayMocks = vi.hoisted(() => ({
  buildFromTemplate: vi.fn((template: MenuItem[]) => ({ template })),
  defaultResizedIcon: {
    isEmpty: () => false
  },
  defaultBaseIcon: {
    isEmpty: () => false,
    resize: vi.fn()
  },
  createFromPath: vi.fn(),
  createdTrays: [] as Array<{
    icon: unknown;
    clickHandler: (() => void) | null;
    menu: { template: MenuItem[] } | null;
  }>
}));

trayMocks.defaultBaseIcon.resize.mockImplementation(() => trayMocks.defaultResizedIcon);
trayMocks.createFromPath.mockImplementation(() => trayMocks.defaultBaseIcon);

vi.mock("electron", () => {
  class Tray {
    icon: unknown;
    menu: { template: MenuItem[] } | null = null;
    clickHandler: (() => void) | null = null;

    constructor(icon: unknown) {
      this.icon = icon;
      trayMocks.createdTrays.push(this);
    }

    setToolTip(_tooltip: string): void {}

    on(event: string, handler: () => void): void {
      if (event === "click") {
        this.clickHandler = handler;
      }
    }

    setContextMenu(menu: { template: MenuItem[] }): void {
      this.menu = menu;
    }

    destroy(): void {}
  }

  return {
    Menu: {
      buildFromTemplate: trayMocks.buildFromTemplate
    },
    Tray,
    nativeImage: {
      createFromPath: trayMocks.createFromPath
    }
  };
});

import { TrayController } from "../src/main/tray-controller";

function latestTemplate(): MenuItem[] {
  const call = trayMocks.buildFromTemplate.mock.calls.at(-1);
  return (call?.[0] || []) as MenuItem[];
}

describe("TrayController", () => {
  beforeEach(() => {
    trayMocks.buildFromTemplate.mockClear();
    trayMocks.createFromPath.mockClear();
    trayMocks.defaultBaseIcon.resize.mockClear();
    trayMocks.createdTrays.length = 0;
  });

  it("enables show action when window is hidden", async () => {
    const onToggleWindow = vi.fn(async () => undefined);
    const onShowWindow = vi.fn(async () => undefined);
    const onHideWindow = vi.fn(async () => undefined);
    const onExitApp = vi.fn();

    const controller = new TrayController({
      iconPath: "/tmp/tray.png",
      onToggleWindow,
      onShowWindow,
      onHideWindow,
      onExitApp,
      onTrayUnavailable: vi.fn()
    });
    expect(trayMocks.createFromPath).toHaveBeenCalledWith("/tmp/tray.png");
    expect(trayMocks.defaultBaseIcon.resize).toHaveBeenCalledWith({
      width: 20,
      height: 20,
      quality: "best"
    });
    const trayIcon = trayMocks.createdTrays.at(-1)?.icon;
    expect(trayIcon).toBe(trayMocks.defaultResizedIcon);
    controller.refreshMenu("hidden");

    const template = latestTemplate();
    expect(template[0]?.label).toBe("显示调度台");
    expect(template[0]?.enabled).toBe(true);
    expect(template[1]?.label).toBe("隐藏调度台");
    expect(template[1]?.enabled).toBe(false);

    template[0]?.click?.();
    template[1]?.click?.();
    await Promise.resolve();

    expect(onShowWindow).toHaveBeenCalledTimes(1);
    expect(onHideWindow).not.toHaveBeenCalled();
    expect(onToggleWindow).not.toHaveBeenCalled();

    template[3]?.click?.();
    expect(onExitApp).toHaveBeenCalledTimes(1);

    controller.destroy();
  });

  it("enables hide action and keeps tray click as toggle when window is visible", async () => {
    const onToggleWindow = vi.fn(async () => undefined);
    const onShowWindow = vi.fn(async () => undefined);
    const onHideWindow = vi.fn(async () => undefined);

    const controller = new TrayController({
      iconPath: "/tmp/tray.png",
      onToggleWindow,
      onShowWindow,
      onHideWindow,
      onExitApp: vi.fn(),
      onTrayUnavailable: vi.fn()
    });
    controller.refreshMenu("visible-focused");

    const template = latestTemplate();
    expect(template[0]?.label).toBe("显示调度台");
    expect(template[0]?.enabled).toBe(false);
    expect(template[1]?.label).toBe("隐藏调度台");
    expect(template[1]?.enabled).toBe(true);

    template[0]?.click?.();
    template[1]?.click?.();
    await Promise.resolve();

    expect(onShowWindow).not.toHaveBeenCalled();
    expect(onHideWindow).toHaveBeenCalledTimes(1);

    const tray = trayMocks.createdTrays.at(-1);
    tray?.clickHandler?.();
    await Promise.resolve();
    expect(onToggleWindow).toHaveBeenCalledTimes(1);

    controller.destroy();
  });

  it("falls back to base icon when resized icon is empty", () => {
    const resizedEmptyIcon = {
      isEmpty: () => true
    };
    const baseIcon = {
      isEmpty: () => false,
      resize: vi.fn(() => resizedEmptyIcon)
    };
    trayMocks.createFromPath.mockReturnValueOnce(baseIcon);

    const controller = new TrayController({
      iconPath: "/tmp/tray.png",
      onToggleWindow: vi.fn(async () => undefined),
      onShowWindow: vi.fn(async () => undefined),
      onHideWindow: vi.fn(async () => undefined),
      onExitApp: vi.fn(),
      onTrayUnavailable: vi.fn()
    });

    const trayIcon = trayMocks.createdTrays.at(-1)?.icon;
    expect(trayIcon).toBe(baseIcon);
    controller.destroy();
  });
});
