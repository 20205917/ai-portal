#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { _electron as electron } from "playwright";
import { buildElectronFlags } from "./lib/runtime-env.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function createOutputDir() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(rootDir, "artifacts", "visual", stamp);
  fs.mkdirSync(dir, { recursive: true });
  return { dir, stamp };
}

function writeIndex(targetDir, stamp, records) {
  const lines = [
    "# AIDC 视觉验收截图",
    "",
    `- 生成时间: ${new Date().toISOString()}`,
    `- 任务批次: ${stamp}`,
    `- 会话环境: ${process.env.XDG_SESSION_TYPE || "unknown"} / ${process.env.XDG_CURRENT_DESKTOP || "unknown"}`,
    "",
    "| 文件 | 场景 | 时间 |",
    "|---|---|---|"
  ];

  for (const record of records) {
    lines.push(`| [${record.file}](${record.file}) | ${record.scene} | ${record.time} |`);
  }

  fs.writeFileSync(path.join(targetDir, "index.md"), `${lines.join("\n")}\n`);
}

async function main() {
  run("npm", ["run", "build"]);

  const { dir: outputDir, stamp } = createOutputDir();
  const records = [];
  const appEnv = {
    ...process.env,
    AIDC_ALLOW_MULTI_INSTANCE: "1",
    AIDC_NO_SANDBOX: process.env.AIDC_NO_SANDBOX || "1"
  };
  delete appEnv.ELECTRON_RUN_AS_NODE;
  const electronFlags = buildElectronFlags(appEnv);

  const electronApp = await electron.launch({
    executablePath: require("electron"),
    args: [...electronFlags, rootDir, "--", "show"],
    env: appEnv
  });

  try {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1200);

    async function shot(file, scene) {
      await page.screenshot({
        path: path.join(outputDir, file),
        fullPage: true
      });
      records.push({
        file,
        scene,
        time: new Date().toISOString()
      });
    }

    await page.getByRole("button", { name: "首页" }).click();
    await page.waitForTimeout(1000);
    await shot("01-home.png", "启动后首页");

    await page.getByRole("button", { name: "ChatGPT" }).first().click();
    await page.waitForTimeout(1800);
    await shot("02-workspace-chatgpt.png", "工作区-ChatGPT");

    await page.getByRole("button", { name: "豆包" }).first().click();
    await page.waitForTimeout(1800);
    await shot("03-workspace-doubao.png", "工作区-豆包");

    await page.getByRole("button", { name: "设置" }).click();
    await page.waitForTimeout(800);
    await shot("04-settings.png", "设置页");

    await page.getByRole("button", { name: "ChatGPT" }).first().click();
    await page.waitForTimeout(900);
    await page.evaluate(() => {
      const host = window;
      if (typeof host.__aidcForceWebviewError === "function") {
        host.__aidcForceWebviewError();
        return;
      }
      window.dispatchEvent(new CustomEvent("aidc:force-webview-error"));
    });
    await page.getByText("无法正常显示").first().waitFor({ state: "visible", timeout: 5_000 });
    await shot("05-error-overlay.png", "注入失败场景-错误覆盖层");

    writeIndex(outputDir, stamp, records);
    console.log(`视觉验收完成：${path.relative(rootDir, outputDir)}`);
  } finally {
    await electronApp.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
