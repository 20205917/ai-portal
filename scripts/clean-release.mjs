import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = path.join(rootDir, "release");

fs.rmSync(releaseDir, { recursive: true, force: true });
console.log(`cleaned ${releaseDir}`);
