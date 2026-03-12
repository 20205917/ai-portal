#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildElectronFlags } from "./lib/runtime-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const env = {
  ...process.env,
  AIPROTAL_RENDERER_URL: "http://127.0.0.1:5173",
  AIPROTAL_NO_SANDBOX: process.env.AIPROTAL_NO_SANDBOX || "1"
};
delete env.ELECTRON_RUN_AS_NODE;
const electronFlags = buildElectronFlags(env);

const children = [];

function spawnChild(command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd: rootDir,
    env: { ...env, ...extraEnv },
    stdio: "inherit"
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown(code);
    }
  });
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(code);
}

async function waitForRenderer(url) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 45_000) {
    const ready = await new Promise((resolve) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(Boolean(res.statusCode && res.statusCode < 500));
      });
      req.on("error", () => resolve(false));
    });

    if (ready) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error("Renderer dev server did not become ready in time.");
}

async function waitForMainOutput() {
  const startedAt = Date.now();
  const expected = path.join(rootDir, "dist", "main", "index.js");

  while (Date.now() - startedAt < 45_000) {
    if (fs.existsSync(expected)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error("Electron main bundle was not compiled in time.");
}

async function main() {
  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  spawnChild("npm", ["exec", "--", "tsc", "-w", "-p", "tsconfig.main.json", "--preserveWatchOutput"]);
  spawnChild("npm", ["exec", "--", "vite"]);

  await waitForRenderer(env.AIPROTAL_RENDERER_URL);
  await waitForMainOutput();

  const electron = spawnChild("npm", ["exec", "--", "electron", ...electronFlags, "."], {
    ELECTRON_ENABLE_LOGGING: "1"
  });

  electron.on("exit", (code) => shutdown(code ?? 0));
}

main().catch((error) => {
  console.error(error);
  shutdown(1);
});
