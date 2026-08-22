#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptDirectory, "../..");
const blenderScript = path.join(
  appDirectory,
  "assets/blender/tetra-pak-hoyer-flowrap-mw-1700-9.py",
);
const macBlender = "/Applications/Blender.app/Contents/MacOS/Blender";
const blenderBinary = process.env.FLOWRAP_MW1700_BLENDER_BINARY ??
  (fs.existsSync(macBlender) ? macBlender : "blender");

const result = spawnSync(
  blenderBinary,
  ["--background", "--factory-startup", "--python", blenderScript],
  { cwd: path.resolve(appDirectory, "../.."), stdio: "inherit" },
);

if (result.error) {
  console.error(`Unable to start Blender at ${blenderBinary}: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
