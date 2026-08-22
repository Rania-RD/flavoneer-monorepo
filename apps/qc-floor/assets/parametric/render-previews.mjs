#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const assetKey = process.argv[2] ?? "rxgj-6";
const previewDirectory = path.resolve(scriptDirectory, `../previews/${assetKey}`);
const names = ["front", "side", "three-quarter"];

const browser = await chromium.launch({ headless: true });
try {
  for (const name of names) {
    const page = await browser.newPage({
      viewport: { width: 1000, height: 720 },
      deviceScaleFactor: 1,
    });
    const source = path.join(previewDirectory, `${name}.svg`);
    const destination = path.join(previewDirectory, `${name}.png`);
    const svgData = fs.readFileSync(source).toString("base64");
    await page.setContent(`
      <style>html, body { margin: 0; width: 1000px; height: 720px; overflow: hidden; }</style>
      <img id="preview" width="1000" height="720" src="data:image/svg+xml;base64,${svgData}" />
    `);
    await page.screenshot({ path: destination, fullPage: false });
    await page.close();
    console.log(`Rendered ${path.relative(process.cwd(), destination)}`);
  }
} finally {
  await browser.close();
}
