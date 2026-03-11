#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(target) {
  return fs.readFileSync(path.join(rootDir, target), "utf8");
}

function extractCommandList(content) {
  const match = content.match(/\[(\s*"toggle"\s*,\s*"show"\s*,\s*"hide"\s*,\s*"open"\s*,\s*"status"\s*)\]/);
  if (!match) {
    return null;
  }
  return match[1].replace(/\s+/g, "");
}

const errors = [];

const sharedCommands = read("src/shared/commands.ts");
const runtimeCommands = read("scripts/lib/runtime-env.mjs");
const sharedList = extractCommandList(sharedCommands);
const runtimeList = extractCommandList(runtimeCommands);

if (!sharedList) {
  errors.push("src/shared/commands.ts 未找到命令枚举。");
}
if (!runtimeList) {
  errors.push("scripts/lib/runtime-env.mjs 未找到命令枚举。");
}
if (sharedList && runtimeList && sharedList !== runtimeList) {
  errors.push("CLI 与 shared 命令枚举不一致。");
}

if (!sharedCommands.includes("error?: string")) {
  errors.push("CommandResponse 未声明 error?: string。");
}

const commandServer = read("src/main/command-server.ts");
if (!commandServer.includes("error:")) {
  errors.push("CommandServer 错误响应未返回 error 字段。");
}

const aidcCli = read("bin/aidc.mjs");
if (!aidcCli.includes("COMMAND_NAMES")) {
  errors.push("bin/aidc.mjs 未复用统一命令枚举。");
}

if (errors.length > 0) {
  console.error("协议检查失败：");
  for (const message of errors) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log("协议检查通过。");
