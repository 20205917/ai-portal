#!/usr/bin/env node

import net from "node:net";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  buildElectronFlags,
  COMMAND_NAMES,
  resolveSocketPath
} from "../scripts/lib/runtime-env.mjs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const validCommands = new Set(COMMAND_NAMES);

function parseArgs(argv) {
  const firstCommand = argv.findIndex((value) => validCommands.has(value));
  if (firstCommand === -1) {
    return { command: "toggle" };
  }

  const command = argv[firstCommand];
  if (command === "open") {
    const providerId = argv[firstCommand + 1];
    if (!providerId) {
      throw new Error("Usage: aidc open <providerId>");
    }

    return { command, providerId };
  }

  return { command };
}

function sendCommand(socketPath, payload) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let raw = "";

    socket.on("connect", () => {
      socket.write(`${JSON.stringify(payload)}\n`);
    });

    socket.on("data", (chunk) => {
      raw += chunk.toString("utf8");
    });

    socket.on("end", () => {
      if (!raw.trim()) {
        resolve({ ok: true });
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });

    socket.on("error", (error) => {
      reject(error);
    });
  });
}

function launchElectron(payload) {
  let electronBinary;

  try {
    electronBinary = require("electron");
  } catch {
    throw new Error("Electron dependency is not installed. Run npm install first.");
  }

  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const electronFlags = buildElectronFlags(env);

  const args = [...electronFlags, rootDir, "--", payload.command];
  if (payload.providerId) {
    args.push(payload.providerId);
  }

  const child = spawn(electronBinary, args, {
    cwd: rootDir,
    detached: true,
    stdio: "ignore",
    env
  });

  child.unref();
}

async function main() {
  const payload = parseArgs(process.argv.slice(2));
  const socketPath = resolveSocketPath(process.env);

  try {
    const response = await sendCommand(socketPath, payload);
    if (payload.command === "status") {
      console.log(JSON.stringify(response, null, 2));
    }
    return;
  } catch (error) {
    const code = /** @type {{ code?: string }} */ (error).code;
    const canBoot = payload.command === "toggle" || payload.command === "show" || payload.command === "open";

    if (code !== "ENOENT" && code !== "ECONNREFUSED" && code !== "EPIPE") {
      throw error;
    }

    if (payload.command === "status") {
      console.log(JSON.stringify({ ok: true, state: "stopped" }, null, 2));
      return;
    }

    if (!canBoot) {
      console.log(JSON.stringify({ ok: true, state: "stopped" }, null, 2));
      return;
    }

    launchElectron(payload);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
