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

const thresholds = [
  { file: "src/main/index.ts", max: 250 },
  { file: "src/renderer/App.tsx", max: 220 }
];

for (const rule of thresholds) {
  const count = lineCount(rule.file);
  if (count > rule.max) {
    errors.push(`${rule.file} 超过阈值：${count} > ${rule.max}`);
  }
}

const sourceFiles = walk(toAbsolute("src"))
  .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
  .map((file) => path.relative(rootDir, file));

for (const file of sourceFiles) {
  const count = lineCount(file);
  if (count > 500) {
    errors.push(`${file} 超过单文件阈值：${count} > 320`);
  }
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

if (errors.length > 0) {
  console.error("架构检查失败：");
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log("架构检查通过。");
