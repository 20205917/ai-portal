import path from "node:path";

import { app, shell } from "electron";

import { AppCore } from "./app-core";
import { shouldDisableGpu, shouldEnableNoSandbox } from "./env";
import { resolveSocketPath, resolveConfigDir } from "./paths";
import { APP_ID, APP_NAME } from "../shared/constants";
import { parseAidcArgs } from "../shared/commands";
import type { HostEnvironment } from "../shared/types";

const configDir = resolveConfigDir();
const socketPath = resolveSocketPath(configDir);
const iconPath = path.resolve(__dirname, "../../assets/icon.svg");
const trayIconPath = path.resolve(__dirname, "../../assets/tray-icon.png");
const rendererIndex = path.resolve(__dirname, "../renderer/index.html");
const rendererUrl = process.env.AIDC_RENDERER_URL;
const debugRenderer = process.env.AIDC_DEBUG === "1";
const allowMultiInstance = process.env.AIDC_ALLOW_MULTI_INSTANCE === "1";
const enableNoSandbox = shouldEnableNoSandbox(process.env);
const enableDisableGpu = shouldDisableGpu(process.env);
const initialCommand = parseAidcArgs(process.argv) ?? { command: "toggle" as const };
const hostEnvironment: HostEnvironment = {
  sessionType: process.env.XDG_SESSION_TYPE || "unknown",
  desktopSession: process.env.DESKTOP_SESSION || "unknown",
  currentDesktop: process.env.XDG_CURRENT_DESKTOP || "unknown",
  summary: `本机环境：Ubuntu GNOME ${String(process.env.XDG_SESSION_TYPE || "unknown").toUpperCase()}`
};

app.setName(APP_NAME);
app.setPath("userData", configDir);
(app as typeof app & { setDesktopName?: (desktopName: string) => void }).setDesktopName?.(
  `${APP_ID}.desktop`
);
app.commandLine.appendSwitch("class", APP_ID);
if (enableNoSandbox) {
  app.commandLine.appendSwitch("no-sandbox");
}
if (enableDisableGpu) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
}

const gotLock = app.requestSingleInstanceLock();
if (!allowMultiInstance && !gotLock) {
  app.exit(0);
}

const core = new AppCore({
  configDir,
  socketPath,
  iconPath,
  trayIconPath,
  rendererIndex,
  rendererUrl,
  hostEnvironment,
  debugRenderer
});

if (!allowMultiInstance) {
  app.on("second-instance", (_event, argv) => {
    core.handleSecondInstance(argv);
  });
}

app.whenReady().then(async () => {
  await core.start(initialCommand);
});

app.on("web-contents-created", (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
});

let shutdownInProgress = false;
app.on("before-quit", (event) => {
  if (shutdownInProgress) {
    return;
  }
  shutdownInProgress = true;
  event.preventDefault();
  void core.shutdown().finally(() => {
    app.exit(0);
  });
});
