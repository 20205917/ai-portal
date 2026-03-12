import { Menu, Tray, nativeImage } from "electron";

import type { RuntimeState } from "../shared/types";

interface TrayControllerOptions {
  iconPath: string;
  onShowWindow: () => Promise<void>;
  onHideWindow: () => Promise<void>;
  onExitApp: () => void;
  onTrayUnavailable: () => void;
}

function isWindowVisible(state: RuntimeState): boolean {
  return state === "visible-focused" || state === "visible-unfocused";
}

function canShowWindow(state: RuntimeState): boolean {
  return state !== "visible-focused";
}

export class TrayController {
  private tray: Tray | null = null;
  private runtimeState: RuntimeState = "hidden";

  constructor(private readonly options: TrayControllerOptions) {
    this.createTray();
  }

  private createTray(): void {
    try {
      const icon = this.createTrayIcon();
      if (icon.isEmpty()) {
        throw new Error(`Tray icon is empty: ${this.options.iconPath}`);
      }

      this.tray = new Tray(icon);
      this.tray.setToolTip("AIProtal");
      this.tray.on("click", () => {
        void this.options.onShowWindow();
      });
      this.tray.on("double-click", () => {
        void this.options.onShowWindow();
      });
      this.refreshMenu(this.runtimeState);
    } catch (error) {
      console.warn("[AIDC] Tray disabled:", error instanceof Error ? error.message : String(error));
      this.tray = null;
      this.options.onTrayUnavailable();
    }
  }

  private createTrayIcon() {
    const baseIcon = nativeImage.createFromPath(this.options.iconPath);
    if (baseIcon.isEmpty()) {
      return baseIcon;
    }

    const resized = baseIcon.resize({
      width: 20,
      height: 20,
      quality: "best"
    });
    return resized.isEmpty() ? baseIcon : resized;
  }

  refreshMenu(state: RuntimeState): void {
    this.runtimeState = state;
    if (!this.tray) {
      return;
    }

    const visible = isWindowVisible(state);
    const canShow = canShowWindow(state);
    const menu = Menu.buildFromTemplate([
      {
        label: "显示调度台",
        enabled: canShow,
        click: () => {
          if (canShow) {
            void this.options.onShowWindow();
          }
        }
      },
      {
        label: "隐藏调度台",
        enabled: visible,
        click: () => {
          if (visible) {
            void this.options.onHideWindow();
          }
        }
      },
      { type: "separator" },
      {
        label: "退出 AIProtal",
        click: () => {
          this.options.onExitApp();
        }
      }
    ]);

    this.tray.setContextMenu(menu);
  }

  isAvailable(): boolean {
    return this.tray !== null;
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
