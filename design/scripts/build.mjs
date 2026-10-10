// Generates every Flavoneer brand asset into design/exports.
// Run from the repository root: node design/scripts/build.mjs [filter]
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { BRAND_DIR, C, MASCOT_FILE, MASCOT_PAN_FILE, dataUrl, markSvg, mascotWordmarkSvg, stripAlpha, toIco, wordmarkSvg } from "./lib.mjs";
import { SCREENSHOTS, screenshot } from "./screens.mjs";
import { avatar, cover, featureGraphic, openGraph, page, postFeature, postHero, postStat, story } from "./templates.mjs";

const OUT = path.join(BRAND_DIR, "exports");
const CACHE = path.join(BRAND_DIR, ".cache");
const filter = process.argv[2];

const write = async (file, content) => {
  const target = path.join(OUT, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
  console.log(`  ${file}`);
};

// --- Vector masters ----------------------------------------------------------

const mascotHref = dataUrl(MASCOT_FILE);

const lockupSvg = (wordStyle) => {
  const word = wordmarkSvg({ style: wordStyle, fontSize: 200, id: "lw" });
  const tile = 260;
  const gap = 64;
  const width = tile + gap + word.width;
  const radius = tile * 0.2237;
  const wordY = (tile - word.height) / 2 + 14;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(1)}" height="${tile}" viewBox="0 0 ${width.toFixed(1)} ${tile}" role="img" aria-label="Flavoneer">
  <defs><clipPath id="tile-clip"><rect width="${tile}" height="${tile}" rx="${radius}"/></clipPath></defs>
  <g clip-path="url(#tile-clip)">${markSvg({ size: tile, background: "tile", id: "lt" }).replace(/<svg[^>]*>/, `<svg width="${tile}" height="${tile}" viewBox="0 0 ${tile} ${tile}">`)}</g>
  <svg x="${tile + gap}" y="${wordY.toFixed(1)}" width="${word.width.toFixed(1)}" height="${word.height.toFixed(1)}">${word.svg.replace(/<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</svg>
</svg>`;
};

const SOLIDS = { forest: C.ink, amber: C.amber, cream: C.cream, black: "#000000", white: "#FFFFFF" };

const vectors = {
  "logo/svg/flavoneer-mark.svg": () => markSvg({ size: 1024 }),
  "logo/svg/flavoneer-mark-tile.svg": () => markSvg({ size: 1024, background: "tile" }),
  ...Object.fromEntries(Object.entries(SOLIDS).map(([name, color]) => [`logo/svg/flavoneer-mark-${name}.svg`, () => markSvg({ size: 1024, style: color })])),
  "logo/svg/flavoneer-wordmark.svg": () => wordmarkSvg({ style: "signature" }).svg,
  ...Object.fromEntries(Object.entries(SOLIDS).map(([name, color]) => [`logo/svg/flavoneer-wordmark-${name}.svg`, () => wordmarkSvg({ style: color }).svg])),
  "logo/svg/flavoneer-mascot-wordmark.svg": () => mascotWordmarkSvg({ style: "signature", mascotHref }).svg,
  "logo/svg/flavoneer-mascot-wordmark-on-dark.svg": () => mascotWordmarkSvg({ style: "flat", mascotHref }).svg,
  "logo/svg/flavoneer-lockup.svg": () => lockupSvg(C.ink),
  "logo/svg/flavoneer-lockup-on-dark.svg": () => lockupSvg(C.cream),
  "web/favicon.svg": () =>
    markSvg({ size: 64, background: "tile", glyphScale: 0.7 }).replace("<defs>", '<defs><clipPath id="r"><rect width="64" height="64" rx="14"/></clipPath>').replace(/(<rect width="64" height="64" fill="url\(#m-bg\)"\/>)/, '<g clip-path="url(#r)">$1</g>'),
};

// --- Raster assets -------------------------------------------------------------

const svgPage = (svg, width, height, background = "transparent") =>
  page({ width, height, background, body: svg.replace(/<svg([^>]*?) width="[^"]+" height="[^"]+"/, `<svg$1 width="${width}" height="${height}"`) });

const fit = (file, width) => async () => {
  const svg = await readFile(path.join(OUT, file), "utf8");
  const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  return { html: svgPage(svg, width, Math.round((width * h) / w)), width, height: Math.round((width * h) / w) };
};

const square = (file, size, background) => async () => ({ html: svgPage(await readFile(path.join(OUT, file), "utf8"), size, size, background), width: size, height: size });

const html = (width, height, build) => () => ({ html: build({ width, height }), width, height });

const rasters = {
  // Logo
  "logo/png/flavoneer-mark-1024.png": square("logo/svg/flavoneer-mark.svg", 1024),
  "logo/png/flavoneer-mark-512.png": square("logo/svg/flavoneer-mark.svg", 512),
  "logo/png/flavoneer-mark-tile-1024.png": square("logo/svg/flavoneer-mark-tile.svg", 1024),
  "logo/png/flavoneer-mark-forest-1024.png": square("logo/svg/flavoneer-mark-forest.svg", 1024),
  "logo/png/flavoneer-mark-cream-1024.png": square("logo/svg/flavoneer-mark-cream.svg", 1024),
  "logo/png/flavoneer-wordmark-2000.png": fit("logo/svg/flavoneer-wordmark.svg", 2000),
  "logo/png/flavoneer-wordmark-forest-2000.png": fit("logo/svg/flavoneer-wordmark-forest.svg", 2000),
  "logo/png/flavoneer-wordmark-amber-2000.png": fit("logo/svg/flavoneer-wordmark-amber.svg", 2000),
  "logo/png/flavoneer-wordmark-cream-2000.png": fit("logo/svg/flavoneer-wordmark-cream.svg", 2000),
  "logo/png/flavoneer-mascot-wordmark-2000.png": fit("logo/svg/flavoneer-mascot-wordmark.svg", 2000),
  "logo/png/flavoneer-mascot-wordmark-on-dark-2000.png": fit("logo/svg/flavoneer-mascot-wordmark-on-dark.svg", 2000),
  "logo/png/flavoneer-lockup-2000.png": fit("logo/svg/flavoneer-lockup.svg", 2000),
  "logo/png/flavoneer-lockup-on-dark-2000.png": fit("logo/svg/flavoneer-lockup-on-dark.svg", 2000),

  // Apple App Store
  "app-store/ios/app-icon-1024.png": square("logo/svg/flavoneer-mark-tile.svg", 1024, C.mint),
  ...Object.fromEntries(SCREENSHOTS.map((shot) => [`app-store/ios/screenshots-6.9in/${shot.id}-1320x2868.png`, html(1320, 2868, (size) => screenshot({ ...size, shot }))])),

  // Google Play
  "app-store/google-play/icon-512.png": square("logo/svg/flavoneer-mark-tile.svg", 512, C.mint),
  "app-store/google-play/feature-graphic-1024x500.png": html(1024, 500, featureGraphic),
  ...Object.fromEntries(SCREENSHOTS.map((shot) => [`app-store/google-play/phone-screenshots/${shot.id}-1080x1920.png`, html(1080, 1920, (size) => screenshot({ ...size, shot }))])),

  // Social profile images
  "social/profile/avatar-mark-800.png": html(800, 800, ({ width }) => avatar({ size: width, variant: "mark" })),
  "social/profile/avatar-mark-400.png": html(400, 400, ({ width }) => avatar({ size: width, variant: "mark" })),
  "social/profile/avatar-mascot-800.png": html(800, 800, ({ width }) => avatar({ size: width, variant: "mascot" })),
  "social/profile/avatar-mascot-400.png": html(400, 400, ({ width }) => avatar({ size: width, variant: "mascot" })),

  // Social covers
  "social/covers/x-header-1500x500.png": html(1500, 500, (s) => cover({ ...s, safe: { x: 120, y: 50, w: 1380, h: 400 } })),
  "social/covers/linkedin-company-cover-1128x191.png": html(1128, 191, (s) => cover({ ...s, safe: { x: 180, y: 0, w: 948, h: 191 }, scale: 0.6, tagline: "Food formulation and QC workspace" })),
  "social/covers/linkedin-banner-1584x396.png": html(1584, 396, (s) => cover({ ...s, safe: { x: 380, y: 30, w: 1204, h: 336 } })),
  "social/covers/facebook-cover-1640x624.png": html(1640, 624, (s) => cover({ ...s, safe: { x: 265, y: 40, w: 1110, h: 544 }, headline: true, scale: 1.2 })),
  "social/covers/youtube-banner-2560x1440.png": html(2560, 1440, (s) => cover({ ...s, safe: { x: 507, y: 508, w: 1546, h: 423 }, band: true, headline: true, scale: 1.6 })),

  // Social posts
  "social/posts/post-hero-1080x1350.png": html(1080, 1350, postHero),
  "social/posts/post-feature-1080x1080.png": html(1080, 1080, postFeature),
  "social/posts/post-stat-1080x1080.png": html(1080, 1080, postStat),
  "social/posts/story-1080x1920.png": html(1080, 1920, story),
  "social/posts/open-graph-1200x630.png": html(1200, 630, openGraph),

  // Web
  "web/apple-touch-icon-180.png": square("logo/svg/flavoneer-mark-tile.svg", 180, C.mint),
  "web/icon-192.png": square("logo/svg/flavoneer-mark-tile.svg", 192, C.mint),
  "web/icon-512.png": square("logo/svg/flavoneer-mark-tile.svg", 512, C.mint),
  "web/icon-maskable-512.png": html(512, 512, ({ width }) => page({ width, height: width, body: markSvg({ size: width, background: "tile", glyphScale: 0.46 }) })),
  "web/og-image-1200x630.png": html(1200, 630, openGraph),
  "web/favicon-16.png": square("web/favicon.svg", 16),
  "web/favicon-32.png": square("web/favicon.svg", 32),
  "web/favicon-48.png": square("web/favicon.svg", 48),
};

// Icons with an alpha channel are rejected by App Store Connect.
const OPAQUE = new Set(["app-store/ios/app-icon-1024.png", "app-store/google-play/icon-512.png", "web/apple-touch-icon-180.png"]);

// Falls back to any cached headless shell when the pinned Playwright build is not downloaded.
async function launchChromium() {
  try {
    return await chromium.launch();
  } catch (error) {
    const cache = path.join(os.homedir(), "Library/Caches/ms-playwright");
    const builds = (await readdir(cache).catch(() => [])).filter((name) => name.startsWith("chromium_headless_shell-")).sort().reverse();
    for (const build of builds) {
      const executablePath = path.join(cache, build, "chrome-headless-shell-mac-arm64/chrome-headless-shell");
      try {
        return await chromium.launch({ executablePath });
      } catch {}
    }
    throw error;
  }
}

// --- Run -----------------------------------------------------------------------

const selected = (file) => !filter || file.includes(filter);

console.log("Vectors");
for (const [file, build] of Object.entries(vectors)) {
  if (selected(file) || Object.keys(rasters).some((r) => selected(r))) await write(file, build());
}

console.log("Rasters");
await rm(CACHE, { recursive: true, force: true });
await mkdir(CACHE, { recursive: true });
const browser = await launchChromium();
const context = await browser.newContext({ deviceScaleFactor: 1 });
const tab = await context.newPage();

for (const [file, build] of Object.entries(rasters)) {
  if (!selected(file)) continue;
  const { html: markup, width, height } = await build();
  const htmlFile = path.join(CACHE, `${file.replaceAll("/", "__")}.html`);
  await writeFile(htmlFile, markup);
  await tab.setViewportSize({ width, height });
  await tab.goto(`file://${htmlFile}`);
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForLoadState("networkidle");
  const png = await tab.screenshot({ omitBackground: !OPAQUE.has(file), clip: { x: 0, y: 0, width, height } });
  await write(file, OPAQUE.has(file) ? stripAlpha(png) : png);
}

await browser.close();

if (selected("web/favicon.ico")) {
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map(async (size) => ({ size, png: await readFile(path.join(OUT, `web/favicon-${size}.png`)) })));
  await write("web/favicon.ico", toIco(images));
}

if (selected("social/profile")) {
  await write("logo/png/flavoneer-mascot-pan-1024.png", await readFile(MASCOT_PAN_FILE));
}

await rm(CACHE, { recursive: true, force: true });
console.log("Done");
