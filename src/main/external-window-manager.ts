import {
  BrowserWindow,
  nativeImage,
  shell
} from "electron";

import { TITLE_PREFIX } from "../shared/constants";
import type { ProviderDefinition } from "../shared/types";

export class ExternalWindowManager {
  private readonly windows = new Map<string, BrowserWindow>();

  constructor(
    private readonly iconPath: string,
    private readonly onWindowClosed: () => void
  ) {}

  open(provider: ProviderDefinition): BrowserWindow {
    const existing = this.windows.get(provider.id);

    if (existing) {
      existing.show();
      existing.focus();
      return existing;
    }

    const window = new BrowserWindow({
      width: 1320,
      height: 860,
      autoHideMenuBar: true,
      title: `${TITLE_PREFIX} ${provider.label}`,
      icon: nativeImage.createFromPath(this.iconPath),
      webPreferences: {
        partition: provider.persistSession
          ? `persist:aidc-${provider.id}-isolated`
          : undefined
      }
    });

    window.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url);
      return { action: "deny" };
    });

    void window.loadURL(provider.url);
    this.windows.set(provider.id, window);

    window.on("closed", () => {
      this.windows.delete(provider.id);
      this.onWindowClosed();
    });

    return window;
  }

  focus(providerId: string): void {
    this.windows.get(providerId)?.focus();
  }

  has(providerId: string): boolean {
    return this.windows.has(providerId);
  }
}
