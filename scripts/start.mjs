#!/usr/bin/env node

import fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildElectronFlags, withRuntimeDefaults } from "./lib/runtime-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const env = withRuntimeDefaults(process.env);
const distMainEntry = path.join(rootDir, "dist", "main", "index.js");
const distRendererEntry = path.join(rootDir, "dist", "renderer", "index.html");

delete env.ELECTRON_RUN_AS_NODE;
const electronFlags = buildElectronFlags(env);

function shouldBuildArtifacts() {
  if (env.AIPROTAL_SKIP_BUILD === "1") {
    return false;
  }
  if (env.AIPROTAL_FORCE_BUILD === "1") {
    return true;
  }
  return !fs.existsSync(distMainEntry) || !fs.existsSync(distRendererEntry);
}

if (shouldBuildArtifacts()) {
  const build = spawnSync("npm", ["run", "build"], {
    cwd: rootDir,
    env,
    stdio: "inherit"
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

const child = spawn("npm", ["exec", "--", "electron", ...electronFlags, "."], {
  cwd: rootDir,
  env,
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
