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
const artifactsRoot = path.join(rootDir, "artifacts", "visual");
const require = createRequire(import.meta.url);
const visualKeepRuns = Math.max(
  Number.parseInt(process.env.AIDC_VISUAL_KEEP ?? "8", 10) || 8,
  1
);
const strictVisual = process.env.AIDC_VISUAL_STRICT === "1";
const enableDarkCheck = process.env.AIDC_VISUAL_DARK_CHECK !== "0";

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
  const dir = path.join(artifactsRoot, stamp);
  fs.mkdirSync(dir, { recursive: true });
  return { dir, stamp };
}

function pruneOldBatches() {
  if (!fs.existsSync(artifactsRoot)) {
    return [];
  }

  const directories = fs.readdirSync(artifactsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse();

  const stale = directories.slice(visualKeepRuns);
  for (const dir of stale) {
    fs.rmSync(path.join(artifactsRoot, dir), { recursive: true, force: true });
  }
  return stale;
}

function writeIndex(targetDir, stamp, records, removed) {
  const lines = [
    "# AIDC 视觉验收截图",
    "",
    `- 生成时间: ${new Date().toISOString()}`,
    `- 任务批次: ${stamp}`,
    `- 会话环境: ${process.env.XDG_SESSION_TYPE || "unknown"} / ${process.env.XDG_CURRENT_DESKTOP || "unknown"}`,
    `- 保留批次数: ${visualKeepRuns}`,
    `- 本次清理批次: ${removed.length > 0 ? removed.join(", ") : "无"}`,
    "",
    "| 文件 | 场景 | 状态 | 备注 | 时间 |",
    "|---|---|---|---|---|"
  ];

  for (const record of records) {
    lines.push(
      `| [${record.file}](${record.file}) | ${record.scene} | ${record.status} | ${record.note || "-"} | ${record.time} |`
    );
  }

  fs.writeFileSync(path.join(targetDir, "index.md"), `${lines.join("\n")}\n`);
}

function analyzeDarkRatio(imagePath) {
  if (!enableDarkCheck) {
    return null;
  }

  const script = `
import json
import math
import sys
from PIL import Image

target = sys.argv[1]
image = Image.open(target).convert("RGB")
w, h = image.size
step = max(1, int(math.sqrt((w * h) / 250000)))
pixels = image.load()
dark = 0
total = 0
for y in range(0, h, step):
    for x in range(0, w, step):
        r, g, b = pixels[x, y]
        if r < 24 and g < 24 and b < 24:
            dark += 1
        total += 1
ratio = (dark / total) if total else 0
print(json.dumps({"darkRatio": ratio, "sampled": total}))
`.trim();

  const result = spawnSync("python3", ["-c", script, imagePath], {
    cwd: rootDir,
    env: process.env,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    return null;
  }

  try {
    const payload = JSON.parse(result.stdout.trim());
    if (typeof payload.darkRatio !== "number") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

async function detectWorkspaceState(page) {
  return page.evaluate(() => {
    const card = document.querySelector(".webview-overlay-card");
    if (!card) {
      return "ready";
    }

    const text = (card.textContent || "").replace(/\s+/g, " ");
    if (text.includes("无法正常显示")) {
      return "error";
    }
    if (text.includes("正在加载")) {
      return "loading";
    }
    return "overlay";
  });
}

async function waitWorkspaceStable(page, timeoutMs = 12_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const state = await detectWorkspaceState(page);
    if (state !== "loading") {
      return { state, timedOut: false };
    }
    await page.waitForTimeout(300);
  }

  return { state: "loading", timedOut: true };
}

async function probeWebview(page) {
  return page.evaluate(async () => {
    const host = document.querySelector("webview.provider-webview");
    if (!host || typeof host.executeJavaScript !== "function") {
      return { ok: false, reason: "未找到可用 webview" };
    }

    try {
      const data = await host.executeJavaScript(
        `(() => {
          const body = document.body || document.documentElement;
          const text = (body?.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 160);
          const interactive = document.querySelectorAll("a,button,input,textarea,[role='button']").length;
          return {
            href: location.href,
            title: document.title || "",
            textLength: text.length,
            interactive,
            bg: getComputedStyle(body).backgroundColor
          };
        })()`,
        true
      );

      return { ok: true, ...data };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error ? error.message : String(error)
      };
    }
  });
}

function summarizeWorkspace(providerName, state, probe) {
  if (state === "error") {
    return {
      status: "error",
      note: `${providerName} 出现错误覆盖层`
    };
  }

  if (state === "loading") {
    return {
      status: "warn",
      note: `${providerName} 超时仍在加载`
    };
  }

  if (!probe.ok) {
    return {
      status: "warn",
      note: `${providerName} 探针失败: ${probe.reason}`
    };
  }

  const title = String(probe.title || "");
  const transparentBg = String(probe.bg || "").replace(/\s+/g, "") === "rgba(0,0,0,0)";
  const waitingTitle = /请稍候|稍等|Just a moment|Checking your browser/i.test(title);

  if (waitingTitle) {
    return {
      status: "warn",
      note: `${providerName} 仍处于站点校验页（title=${title || "-"})`
    };
  }

  if ((probe.textLength < 8 && probe.interactive <= 1) || (transparentBg && probe.textLength < 16)) {
    return {
      status: "warn",
      note: `${providerName} 疑似空白页（title=${title || "-"}; text=${probe.textLength}; interactive=${probe.interactive}）`
    };
  }

  return {
    status: "ok",
    note: `${providerName} 就绪（title=${title || "-"})`
  };
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

    async function shot(file, scene, status = "ok", note = "") {
      const outputPath = path.join(outputDir, file);
      await page.screenshot({
        path: outputPath,
        fullPage: true
      });
      const record = {
        file,
        scene,
        status,
        note,
        time: new Date().toISOString()
      };
      records.push(record);
      return { record, outputPath };
    }

    function applyDarkScreenHeuristic(record, outputPath, providerName) {
      const dark = analyzeDarkRatio(outputPath);
      if (!dark) {
        return;
      }

      if (dark.darkRatio >= 0.82) {
        const detail = `${providerName} 疑似黑屏（darkRatio=${dark.darkRatio.toFixed(3)}）`;
        if (record.status === "ok") {
          record.status = "warn";
          record.note = detail;
          return;
        }
        record.note = `${record.note}; ${detail}`;
      }
    }

    await page.getByRole("button", { name: "首页" }).click();
    await page.waitForTimeout(900);
    await shot("01-home.png", "启动后首页");

    await page.getByRole("button", { name: "ChatGPT" }).first().click();
    const chatgptState = await waitWorkspaceStable(page);
    const chatgptProbe = await probeWebview(page);
    const chatgptResult = summarizeWorkspace("ChatGPT", chatgptState.state, chatgptProbe);
    const chatgptShot = await shot(
      "02-workspace-chatgpt.png",
      "工作区-ChatGPT",
      chatgptResult.status,
      chatgptResult.note
    );
    applyDarkScreenHeuristic(chatgptShot.record, chatgptShot.outputPath, "ChatGPT");

    await page.getByRole("button", { name: "豆包" }).first().click();
    const doubaoState = await waitWorkspaceStable(page);
    const doubaoProbe = await probeWebview(page);
    const doubaoResult = summarizeWorkspace("豆包", doubaoState.state, doubaoProbe);
    const doubaoShot = await shot(
      "03-workspace-doubao.png",
      "工作区-豆包",
      doubaoResult.status,
      doubaoResult.note
    );
    applyDarkScreenHeuristic(doubaoShot.record, doubaoShot.outputPath, "豆包");

    await page.getByRole("button", { name: "设置" }).click();
    await page.waitForTimeout(800);
    await shot("04-settings.png", "设置页");

    await page.getByRole("button", { name: "ChatGPT" }).first().click();
    await page.waitForTimeout(700);
    await page.evaluate(() => {
      const host = window;
      if (typeof host.__aidcForceWebviewError === "function") {
        host.__aidcForceWebviewError();
        return;
      }
      window.dispatchEvent(new CustomEvent("aidc:force-webview-error"));
    });
    await page.getByText("无法正常显示").first().waitFor({ state: "visible", timeout: 5_000 });
    await shot("05-error-overlay.png", "注入失败场景-错误覆盖层", "ok", "错误覆盖层注入成功");

    const removed = pruneOldBatches();
    writeIndex(outputDir, stamp, records, removed);

    console.log(`视觉验收完成：${path.relative(rootDir, outputDir)}`);
    const warnings = records.filter((record) => record.status !== "ok");
    if (warnings.length > 0) {
      console.warn("视觉验收告警：");
      for (const warning of warnings) {
        console.warn(`- ${warning.scene}: ${warning.note || warning.status}`);
      }
      if (strictVisual) {
        process.exit(1);
      }
    }
  } finally {
    await electronApp.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
