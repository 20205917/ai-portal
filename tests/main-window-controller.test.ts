import { beforeEach, describe, expect, it, vi } from "vitest";

type WindowEvent = "close" | "focus" | "blur" | "show" | "hide" | "resize" | "move" | "closed";
type WebContentsEvent = "did-finish-load" | "did-fail-load" | "render-process-gone" | "console-message";

const electronMocks = vi.hoisted(() => {
  const state = {
    instances: [] as unknown[],
    nativeImageCreateFromPath: vi.fn(() => ({
      isEmpty: () => false
    })),
    shellOpenExternal: vi.fn()
  };

  class MockBrowserWindow {
    visible = false;
    focused = false;
    destroyed = false;
    hideEmitsEvent = true;
    eventHandlers = new Map<string, Array<(...args: unknown[]) => void>>();
    webContentsHandlers = new Map<string, Array<(...args: unknown[]) => void>>();
    webContents = {
      setWindowOpenHandler: vi.fn(),
      reload: vi.fn(),
      on: vi.fn((event: WebContentsEvent, handler: (...args: unknown[]) => void) => {
        const current = this.webContentsHandlers.get(event) ?? [];
        current.push(handler);
        this.webContentsHandlers.set(event, current);
      })
    };

    constructor(_options: unknown) {
      state.instances.push(this);
    }

    on(event: WindowEvent, handler: (...args: unknown[]) => void): void {
      const current = this.eventHandlers.get(event) ?? [];
      current.push(handler);
      this.eventHandlers.set(event, current);
    }

    emit(event: WindowEvent, ...args: unknown[]): void {
      for (const handler of this.eventHandlers.get(event) ?? []) {
        handler(...args);
      }
    }

    async loadFile(_file: string): Promise<void> {}

    async loadURL(_url: string): Promise<void> {}

    show(): void {
      this.visible = true;
      this.emit("show");
    }

    hide(): void {
      if (this.hideEmitsEvent) {
        this.visible = false;
        this.emit("hide");
      }
    }

    focus(): void {
      this.focused = true;
      this.emit("focus");
    }

    isVisible(): boolean {
      return this.visible;
    }

    isFocused(): boolean {
      return this.focused;
    }

    isDestroyed(): boolean {
      return this.destroyed;
    }

    setSkipTaskbar(_skip: boolean): void {}

    getBounds() {
      return {
        width: 1280,
        height: 860,
        x: 10,
        y: 20
      };
    }
  }

  return {
    ...state,
    MockBrowserWindow
  };
});

vi.mock("electron", () => ({
  BrowserWindow: electronMocks.MockBrowserWindow,
  nativeImage: {
    createFromPath: electronMocks.nativeImageCreateFromPath
  },
  shell: {
    openExternal: electronMocks.shellOpenExternal
  }
}));

import { MainWindowController } from "../src/main/main-window-controller";

function createController() {
  return new MainWindowController({
    iconPath: "/tmp/icon.png",
    rendererIndex: "/tmp/index.html",
    debugRenderer: false,
    getWindowBounds: () => ({
      width: 1280,
      height: 860,
      x: 10,
      y: 20
    }),
    shouldCloseWindow: () => false,
    onRuntimeSignal: vi.fn(),
    onWindowClosed: vi.fn(),
    onWindowBoundsChanged: vi.fn(),
    onAfterLoaded: vi.fn()
  });
}

describe("MainWindowController", () => {
  beforeEach(() => {
    electronMocks.instances.length = 0;
    electronMocks.nativeImageCreateFromPath.mockClear();
    electronMocks.shellOpenExternal.mockClear();
  });

  it("marks window hidden immediately even if the window manager lags hide state", async () => {
    const controller = createController();
    await controller.ensureWindow();
    const window = electronMocks.instances.at(-1) as InstanceType<typeof electronMocks.MockBrowserWindow>;

    await controller.reveal();
    expect(controller.isVisible()).toBe(true);

    window.hideEmitsEvent = false;
    await controller.hide();

    expect(controller.isVisible()).toBe(false);
  });

  it("re-shows the window when toggle is pressed after a hidden intent", async () => {
    const controller = createController();
    await controller.ensureWindow();
    const window = electronMocks.instances.at(-1) as InstanceType<typeof electronMocks.MockBrowserWindow>;

    await controller.reveal();
    window.hideEmitsEvent = false;
    await controller.hide();
    expect(controller.isVisible()).toBe(false);

    await controller.toggle();

    expect(controller.isVisible()).toBe(true);
    expect(window.isVisible()).toBe(true);
  });
});
