import path from "node:path";

import { BrowserWindow, type BrowserWindowConstructorOptions, nativeImage, shell } from "electron";

import {
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
  TITLE_PREFIX,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH
} from "../shared/constants";
import type { WindowBounds } from "../shared/types";

interface MainWindowControllerOptions {
  iconPath: string;
  rendererIndex: string;
  rendererUrl?: string;
  debugRenderer: boolean;
  getWindowBounds: () => WindowBounds;
  shouldCloseWindow: () => boolean;
  onRuntimeSignal: () => void;
  onWindowShown: () => void;
  onWindowClosed: () => void;
  onWindowBoundsChanged: (bounds: WindowBounds) => void;
  onAfterLoaded: () => void;
}

export class MainWindowController {
  private mainWindow: BrowserWindow | null = null;
  private skipTaskbarRepairTimer: NodeJS.Timeout | null = null;
  private visibleByIntent = false;

  constructor(private readonly options: MainWindowControllerOptions) {}

  getWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  isVisible(): boolean {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return false;
    }

    if (!this.visibleByIntent) {
      return false;
    }

    try {
      return this.mainWindow.isVisible() || this.visibleByIntent;
    } catch {
      return this.visibleByIntent;
    }
  }

  async ensureWindow(): Promise<BrowserWindow> {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      return this.mainWindow;
    }

    const bounds = this.options.getWindowBounds();
    const icon = nativeImage.createFromPath(this.options.iconPath);
    const windowOptions: BrowserWindowConstructorOptions = {
      width: bounds.width || DEFAULT_WINDOW_WIDTH,
      height: bounds.height || DEFAULT_WINDOW_HEIGHT,
      x: bounds.x,
      y: bounds.y,
      minWidth: WINDOW_MIN_WIDTH,
      minHeight: WINDOW_MIN_HEIGHT,
      show: false,
      frame: false,
      transparent: true,
      hasShadow: false,
      skipTaskbar: true,
      autoHideMenuBar: true,
      title: `${TITLE_PREFIX} 调度台`,
      backgroundColor: "#00000000",
      icon,
      webPreferences: {
        preload: path.resolve(__dirname, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        backgroundThrottling: false,
        webviewTag: true
      }
    };
    if (process.platform === "linux") {
      windowOptions.type = "toolbar";
    }
    this.mainWindow = new BrowserWindow(windowOptions);
    this.visibleByIntent = false;

    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url);
      return { action: "deny" };
    });

    this.attachRendererRecovery(this.mainWindow);
    this.attachWindowEvents(this.mainWindow);
    await this.loadWindow(this.mainWindow);
    this.options.onAfterLoaded();
    return this.mainWindow;
  }

  async reveal(): Promise<void> {
    const window = await this.ensureWindow();
    this.visibleByIntent = true;
    if (!window.isVisible()) {
      window.show();
    }
    setImmediate(() => {
      if (!this.mainWindow || this.mainWindow.isDestroyed() || !this.visibleByIntent) {
        return;
      }
      this.mainWindow.focus();
    });
    this.options.onRuntimeSignal();
  }

  async hide(): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }
    this.visibleByIntent = false;
    this.mainWindow.hide();
    this.options.onRuntimeSignal();
  }

  async toggle(): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      await this.reveal();
      return;
    }

    if (!this.isVisible()) {
      await this.reveal();
      return;
    }

    if (this.mainWindow.isFocused()) {
      await this.hide();
      return;
    }

    await this.reveal();
  }

  setSkipTaskbar(skipTaskbar: boolean): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }
    this.mainWindow.setSkipTaskbar(skipTaskbar);
  }

  private async loadWindow(window: BrowserWindow): Promise<void> {
    if (this.options.rendererUrl) {
      await window.loadURL(this.options.rendererUrl);
      return;
    }
    await window.loadFile(this.options.rendererIndex);
  }

  private attachRendererRecovery(window: BrowserWindow): void {
    let rendererRecoveryAttempts = 0;
    const maxRendererRecoveryAttempts = 2;

    const recoverRenderer = (reason: string) => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        return;
      }
      if (rendererRecoveryAttempts >= maxRendererRecoveryAttempts) {
        return;
      }
      rendererRecoveryAttempts += 1;
      console.error(`[AIDC] Renderer recovery ${rendererRecoveryAttempts}/${maxRendererRecoveryAttempts}: ${reason}`);
      this.mainWindow.webContents.reload();
    };

    window.webContents.on("did-finish-load", () => {
      rendererRecoveryAttempts = 0;
    });
    window.webContents.on("did-fail-load", (_event, code, description, url, isMainFrame) => {
      if (!isMainFrame) {
        return;
      }
      console.error(`[AIDC] Main frame load failed (${code}): ${description} [${url}]`);
      recoverRenderer(`did-fail-load ${code}`);
    });
    window.webContents.on("render-process-gone", (_event, details) => {
      console.error(`[AIDC] Renderer process gone: ${details.reason}`);
      recoverRenderer(`render-process-gone ${details.reason}`);
    });

    if (this.options.debugRenderer) {
      window.webContents.on("console-message", (event) => {
        const payload = event as unknown as {
          level?: number;
          message?: string;
          lineNumber?: number;
          sourceId?: string;
        };
        const level = payload.level ?? -1;
        const message = payload.message ?? "";
        const line = payload.lineNumber ?? 0;
        const sourceId = payload.sourceId ?? "unknown";
        console.log(`[AIDC][renderer:${level}] ${sourceId}:${line} ${message}`);
      });
    }
  }

  private attachWindowEvents(window: BrowserWindow): void {
    window.on("close", (event) => {
      if (this.options.shouldCloseWindow()) {
        return;
      }
      event.preventDefault();
      this.visibleByIntent = false;
      window.hide();
      this.options.onRuntimeSignal();
    });
    window.on("focus", () => this.options.onRuntimeSignal());
    window.on("blur", () => this.options.onRuntimeSignal());
    window.on("show", () => {
      this.visibleByIntent = true;
      this.enforceSkipTaskbar(window);
      this.options.onWindowShown();
      this.options.onRuntimeSignal();
    });
    window.on("hide", () => {
      this.visibleByIntent = false;
      this.options.onRuntimeSignal();
    });
    window.on("resize", () => {
      this.options.onWindowBoundsChanged(window.getBounds());
    });
    window.on("move", () => {
      this.options.onWindowBoundsChanged(window.getBounds());
    });
    window.on("closed", () => {
      if (this.skipTaskbarRepairTimer) {
        clearTimeout(this.skipTaskbarRepairTimer);
        this.skipTaskbarRepairTimer = null;
      }
      this.visibleByIntent = false;
      this.mainWindow = null;
      this.options.onRuntimeSignal();
      this.options.onWindowClosed();
    });
  }

  private enforceSkipTaskbar(window: BrowserWindow): void {
    window.setSkipTaskbar(true);
    if (this.skipTaskbarRepairTimer) {
      clearTimeout(this.skipTaskbarRepairTimer);
      this.skipTaskbarRepairTimer = null;
    }
    // Some Linux window managers re-apply taskbar hints after map; force once more after show.
    this.skipTaskbarRepairTimer = setTimeout(() => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        return;
      }
      this.mainWindow.setSkipTaskbar(true);
      this.skipTaskbarRepairTimer = null;
    }, 120);
  }
}
