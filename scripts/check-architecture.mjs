#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function toAbsolute(target) {
  return path.join(rootDir, target);
}

function read(target) {
  return fs.readFileSync(toAbsolute(target), "utf8");
}

function lineCount(target) {
  return read(target).split("\n").length;
}

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(target));
    } else {
      result.push(target);
    }
  }
  return result;
}

const errors = [];
const warnings = [];
const strictWarnings = process.env.AIDC_ARCH_FAIL_ON_WARN === "1";

const entryFileThresholds = [
  { file: "src/main/index.ts", warn: 260, fail: 380 },
  { file: "src/renderer/App.tsx", warn: 260, fail: 380 }
];

const sourceFiles = walk(toAbsolute("src"))
  .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
  .map((file) => path.relative(rootDir, file));

const sourceFileStats = sourceFiles.map((file) => ({ file, count: lineCount(file) }));

for (const rule of entryFileThresholds) {
  const stat = sourceFileStats.find((item) => item.file === rule.file);
  if (!stat) {
    continue;
  }
  if (stat.count > rule.fail) {
    errors.push(`${rule.file} 超过入口文件硬阈值：${stat.count} > ${rule.fail}`);
  } else if (stat.count > rule.warn) {
    warnings.push(`${rule.file} 超过入口文件建议阈值：${stat.count} > ${rule.warn}`);
  }
}

const globalWarnLineLimit = 360;
const globalFailLineLimit = 560;
for (const stat of sourceFileStats) {
  if (stat.count > globalFailLineLimit) {
    errors.push(`${stat.file} 超过单文件硬阈值：${stat.count} > ${globalFailLineLimit}`);
  } else if (stat.count > globalWarnLineLimit) {
    warnings.push(`${stat.file} 超过单文件建议阈值：${stat.count} > ${globalWarnLineLimit}`);
  }
}

const tinyFileLimit = 35;
const tinyFiles = sourceFileStats.filter((item) => item.count <= tinyFileLimit);
if (sourceFileStats.length >= 30 && tinyFiles.length / sourceFileStats.length >= 0.45) {
  warnings.push(
    `源码文件碎片化偏高：${tinyFiles.length}/${sourceFileStats.length} 个文件 <= ${tinyFileLimit} 行，建议按领域适度合并`
  );
}

const scriptFiles = [
  "bin/aidc.mjs",
  "scripts/start.mjs",
  "scripts/dev.mjs"
];
for (const file of scriptFiles) {
  const content = read(file);
  if (content.includes("AIDC_NO_SANDBOX") || content.includes("AIDC_DISABLE_GPU")) {
    errors.push(`${file} 仍包含运行环境重复判定逻辑，请复用 scripts/lib/runtime-env.mjs`);
  }
}

const commandLiteralPattern = /\["toggle",\s*"show",\s*"hide",\s*"open",\s*"status"\]/g;
const commandLiteralFiles = [
  "src/shared/commands.ts",
  "scripts/lib/runtime-env.mjs",
  "bin/aidc.mjs",
  "scripts/start.mjs",
  "scripts/dev.mjs"
];
let literalHits = 0;
for (const file of commandLiteralFiles) {
  const matches = read(file).match(commandLiteralPattern);
  if (matches) {
    literalHits += matches.length;
  }
}
if (literalHits > 2) {
  errors.push(`命令枚举字面量重复定义过多（${literalHits} 处），应仅保留 shared 与 runtime-env 两处。`);
}

if (warnings.length > 0 && !strictWarnings) {
  console.log("架构检查告警：");
  for (const message of warnings) {
    console.log(`- ${message}`);
  }
}

if (errors.length > 0 || (strictWarnings && warnings.length > 0)) {
  console.error("架构检查失败：");
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  if (strictWarnings && warnings.length > 0) {
    console.error("- AIDC_ARCH_FAIL_ON_WARN=1：告警已按失败处理。");
    for (const message of warnings) {
      console.error(`- ${message}`);
    }
  }
  process.exit(1);
}

console.log("架构检查通过。");
