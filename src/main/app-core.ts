import { app } from "electron";
import { CommandServer } from "./command-server";
import { ExternalWindowManager } from "./external-window-manager";
import {
  broadcastProviders,
  broadcastRuntime,
  broadcastSettings,
  registerIpc
} from "./ipc";
import { MainWindowController } from "./main-window-controller";
import { ProviderIconOrchestrator } from "./provider-icon-orchestrator";
import {
  isProviderEngineAllowed,
  pickDefaultProvider,
  resolveProviders
} from "./provider-registry";
import { AppStore } from "./store";
import { TrayController } from "./tray-controller";
import { parseAidcArgs, type CommandPayload, type CommandResponse } from "../shared/commands";
import type {
  AppSettings,
  HostEnvironment,
  NewProviderInput,
  ProviderDefinition,
  RuntimeSnapshot,
  RuntimeState,
  UiSettingsPatch
} from "../shared/types";

interface AppCoreOptions {
  configDir: string;
  socketPath: string;
  iconPath: string;
  trayIconPath: string;
  rendererIndex: string;
  rendererUrl?: string;
  hostEnvironment: HostEnvironment;
  debugRenderer: boolean;
}
export class AppCore {
  private providers: ProviderDefinition[];
  private activeProviderId: string;
  private runtime: RuntimeSnapshot;
  private shutdownRequested = false;
  private readonly store: AppStore;
  private readonly externalWindowManager: ExternalWindowManager;
  private readonly commandServer: CommandServer;
  private readonly windowController: MainWindowController;
  private readonly providerIconOrchestrator: ProviderIconOrchestrator;
  private trayController: TrayController | null = null;

  constructor(private readonly options: AppCoreOptions) {
    this.store = new AppStore(options.configDir);
    this.providers = resolveProviders(this.store.getSettings());
    this.activeProviderId = this.providers.find((provider) => provider.id === this.store.getSettings().lastProviderId)?.id
      ?? pickDefaultProvider(this.providers).id;
    this.runtime = {
      state: "hidden",
      activeProviderId: this.activeProviderId,
      updatedAt: new Date().toISOString()
    };
    this.externalWindowManager = new ExternalWindowManager(options.iconPath, () => {
      this.syncRuntime();
    });
    this.commandServer = new CommandServer(options.socketPath, this.handleCommand.bind(this));
    this.windowController = new MainWindowController({
      iconPath: options.iconPath,
      rendererIndex: options.rendererIndex,
      rendererUrl: options.rendererUrl,
      debugRenderer: options.debugRenderer,
      getWindowBounds: () => this.getSettings().windowBounds,
      shouldCloseWindow: () => this.shutdownRequested || this.trayController === null,
      onRuntimeSignal: () => this.syncRuntime(),
      onWindowClosed: () => {
        if (!this.shutdownRequested) {
          app.quit();
        }
      },
      onWindowBoundsChanged: (bounds) => {
        this.store.saveWindowBounds(bounds);
      },
      onAfterLoaded: () => {
        this.broadcastAppState();
      }
    });
    this.providerIconOrchestrator = new ProviderIconOrchestrator({
      saveProviderIconDataUrl: (providerId, iconDataUrl) => {
        this.store.saveProviderIconDataUrl(providerId, iconDataUrl);
      },
      onProviderIconUpdated: () => this.broadcastAppState()
    });

    registerIpc({
      getProviders: () => this.providers,
      getActiveProviderId: () => this.activeProviderId,
      getRuntime: () => this.runtime,
      getConfigDir: () => this.options.configDir,
      getSocketPath: () => this.options.socketPath,
      getEnvironment: () => this.options.hostEnvironment,
      getUiSettings: () => this.getSettings().ui,
      selectProvider: this.selectProvider.bind(this),
      updateUiSettings: this.updateUiSettings.bind(this),
      setProviderEngine: this.setProviderEngine.bind(this),
      setProviderEnabled: this.setProviderEnabled.bind(this),
      createProvider: this.createProvider.bind(this),
      removeProvider: this.removeProvider.bind(this),
      openExternalProvider: async (providerId) => {
        const provider = this.getProvider(providerId);
        this.externalWindowManager.open(provider);
      }
    });
  }

  async start(initialCommand: CommandPayload): Promise<void> {
    await this.commandServer.listen();
    await this.windowController.ensureWindow();
    const tray = new TrayController({
      iconPath: this.options.trayIconPath,
      onToggleWindow: () => this.toggleMainWindow(),
      onShowWindow: () => this.revealMainWindow(),
      onHideWindow: () => this.hideMainWindow(),
      onExitApp: () => {
        this.shutdownRequested = true;
        app.quit();
      },
      onTrayUnavailable: () => undefined
    });
    this.trayController = tray.isAvailable() ? tray : null;

    if (initialCommand.command === "hide") {
      await this.hideMainWindow();
      return;
    }
    if (initialCommand.command === "status") {
      this.syncRuntime();
      return;
    }
    await this.handleCommand(initialCommand);
  }

  handleSecondInstance(argv: string[]): void {
    const payload = parseAidcArgs(argv) ?? { command: "toggle" as const };
    void this.handleCommand(payload);
  }

  shutdown(): void {
    this.shutdownRequested = true;
    this.store.flushPendingWrites();
    this.commandServer.close();
    this.trayController?.destroy();
  }

  private getSettings(): AppSettings {
    return this.store.getSettings();
  }

  private ensureAtLeastOneProvider(settings: AppSettings): void {
    if (!resolveProviders(settings).some((provider) => provider.enabled)) {
      throw new Error("左侧至少需要保留一个 AI 入口。");
    }
  }

  private refreshProviders(): void {
    this.providers = resolveProviders(this.getSettings());
  }

  private getProvider(providerId: string): ProviderDefinition {
    const provider = this.providers.find((entry) => entry.id === providerId && entry.enabled);
    if (!provider) {
      throw new Error(`Provider '${providerId}' is not enabled.`);
    }
    return provider;
  }

  private deriveRuntimeState(): RuntimeState {
    const window = this.windowController.getWindow();
    if (!window || window.isDestroyed()) {
      return "stopped";
    }

    if (!window.isVisible()) {
      return "hidden";
    }
    return window.isFocused() ? "visible-focused" : "visible-unfocused";
  }

  private syncRuntime(): RuntimeSnapshot {
    const nextState = this.deriveRuntimeState();
    const hasChanged = nextState !== this.runtime.state || this.activeProviderId !== this.runtime.activeProviderId;
    if (hasChanged) {
      this.runtime = {
        state: nextState,
        activeProviderId: this.activeProviderId,
        updatedAt: new Date().toISOString()
      };
      this.store.saveRuntime(this.runtime);
    }

    const window = this.windowController.getWindow();
    if (hasChanged && window && !window.isDestroyed()) {
      broadcastRuntime(window, this.runtime);
    }
    this.trayController?.refreshMenu(this.runtime.state);
    return this.runtime;
  }

  private broadcastAppState(): void {
    this.refreshProviders();
    if (!this.providers.some((provider) => provider.id === this.activeProviderId && provider.enabled)) {
      this.activeProviderId = pickDefaultProvider(this.providers).id;
      this.store.saveLastProviderId(this.activeProviderId);
    }
    const window = this.windowController.getWindow();
    if (window && !window.isDestroyed()) {
      broadcastProviders(window, this.providers, this.activeProviderId);
    }
    this.providerIconOrchestrator.ensure(this.providers);
    this.syncRuntime();
  }

  private async revealMainWindow(): Promise<void> {
    await this.windowController.reveal();
  }

  private async hideMainWindow(): Promise<void> {
    await this.windowController.hide();
  }

  private async toggleMainWindow(): Promise<void> {
    await this.windowController.toggle();
  }

  private async selectProvider(providerId: string): Promise<void> {
    const provider = this.getProvider(providerId);
    this.activeProviderId = provider.id;
    this.store.saveLastProviderId(provider.id);
    this.broadcastAppState();

    if (provider.engine === "isolated-external") {
      this.externalWindowManager.open(provider);
    }
  }

  private async updateUiSettings(patch: UiSettingsPatch): Promise<void> {
    this.store.saveUiSettings(patch);
    const window = this.windowController.getWindow();
    if (!window || window.isDestroyed()) {
      return;
    }
    broadcastSettings(window, this.getSettings().ui);
  }

  private async setProviderEngine(providerId: string, engine: ProviderDefinition["engine"]): Promise<void> {
    this.getProvider(providerId);
    if (!isProviderEngineAllowed(this.getSettings(), providerId, engine)) {
      throw new Error(`Engine '${engine}' is not supported by provider '${providerId}'.`);
    }

    this.store.saveProviderEngine(providerId, engine);
    await this.selectProvider(providerId);
  }

  private async setProviderEnabled(providerId: string, enabled: boolean): Promise<void> {
    const preview = this.getSettings();
    preview.providerOverrides = {
      ...preview.providerOverrides,
      [providerId]: {
        ...preview.providerOverrides[providerId],
        enabled
      }
    };
    this.ensureAtLeastOneProvider(preview);

    this.store.saveProviderEnabled(providerId, enabled);
    this.broadcastAppState();
  }

  private async createProvider(input: NewProviderInput): Promise<void> {
    if (!input.label.trim()) {
      throw new Error("请输入名称。");
    }

    if (!input.url.trim()) {
      throw new Error("请输入网址。");
    }

    const provider = this.store.addCustomProvider(input);
    this.activeProviderId = provider.id;
    this.store.saveLastProviderId(provider.id);
    this.broadcastAppState();
  }

  private async removeProvider(providerId: string): Promise<void> {
    const settings = this.getSettings();
    const target = settings.customProviders.find((provider) => provider.id === providerId);

    if (!target) {
      throw new Error("只能删除自定义 AI 网页。");
    }

    const preview: AppSettings = {
      ...settings,
      customProviders: settings.customProviders.filter((provider) => provider.id !== providerId),
      providerOverrides: Object.fromEntries(
        Object.entries(settings.providerOverrides).filter(([id]) => id !== providerId)
      )
    };
    this.ensureAtLeastOneProvider(preview);

    this.store.removeCustomProvider(providerId);
    this.broadcastAppState();
  }

  private async openProvider(providerId: string): Promise<void> {
    await this.selectProvider(providerId);
    await this.revealMainWindow();
  }

  private async handleCommand(command: CommandPayload): Promise<CommandResponse> {
    switch (command.command) {
      case "toggle":
        await this.toggleMainWindow();
        break;
      case "show":
        await this.revealMainWindow();
        break;
      case "hide":
        await this.hideMainWindow();
        break;
      case "open":
        if (!command.providerId) {
          throw new Error("ProviderId is required for open command.");
        }
        await this.openProvider(command.providerId);
        break;
      case "status":
        break;
    }
    return {
      ok: true,
      ...this.syncRuntime()
    };
  }
}
