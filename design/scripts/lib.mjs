import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import zlib from "node:zlib";
import * as fontkitModule from "fontkit";

const fontkit = fontkitModule.default ?? fontkitModule;

export const BRAND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_DIR = path.resolve(BRAND_DIR, "..");

export const tokens = JSON.parse(readFileSync(path.join(BRAND_DIR, "tokens.json"), "utf8"));
export const C = tokens.color;

const googleFont = (pkg, file) => path.join(REPO_DIR, "node_modules/@expo-google-fonts", pkg, file);

export const FONT_FILES = {
  fraunces700: googleFont("fraunces", "700Bold/Fraunces_700Bold.ttf"),
  fraunces800: googleFont("fraunces", "800ExtraBold/Fraunces_800ExtraBold.ttf"),
  fraunces900: googleFont("fraunces", "900Black/Fraunces_900Black.ttf"),
  dmSans400: googleFont("dm-sans", "400Regular/DMSans_400Regular.ttf"),
  dmSans500: googleFont("dm-sans", "500Medium/DMSans_500Medium.ttf"),
  dmSans600: googleFont("dm-sans", "600SemiBold/DMSans_600SemiBold.ttf"),
  dmSans700: googleFont("dm-sans", "700Bold/DMSans_700Bold.ttf"),
  dmSans800: googleFont("dm-sans", "800ExtraBold/DMSans_800ExtraBold.ttf"),
};

export const MASCOT_FILE = path.join(REPO_DIR, "apps/landing/public/assets/flavoneer-mascot.png");
export const MASCOT_PAN_FILE = path.join(REPO_DIR, "apps/landing/public/assets/flavoneer-logo-square.png");
// The mascot artwork is 1402x1122 with transparent padding under the paws.
export const MASCOT_RATIO = 1122 / 1402;
export const MASCOT_BOTTOM_PADDING = 0.172;

const fraunces = fontkit.openSync(FONT_FILES.fraunces800);

const fmt = (n) => Number(n.toFixed(2)).toString();

function pathToD(fontPath) {
  return fontPath.commands
    .map(({ command, args }) => {
      const a = args.map(fmt).join(" ");
      switch (command) {
        case "moveTo":
          return `M${a}`;
        case "lineTo":
          return `L${a}`;
        case "quadraticCurveTo":
          return `Q${a}`;
        case "bezierCurveTo":
          return `C${a}`;
        default:
          return "Z";
      }
    })
    .join("");
}

/** Lays out text as an SVG path in pixels: baseline at y = 0, y grows downward. */
export function textPath(text, size, { font = fraunces, tracking = 0 } = {}) {
  const run = font.layout(text);
  const scale = size / font.unitsPerEm;
  const bbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  let x = 0;
  let d = "";

  run.glyphs.forEach((glyph, index) => {
    const position = run.positions[index];
    const glyphPath = glyph.path
      .scale(scale, -scale)
      .translate(x + position.xOffset * scale, -position.yOffset * scale);

    if (glyphPath.commands.length > 0) {
      d += pathToD(glyphPath);
      const b = glyphPath.bbox;
      bbox.minX = Math.min(bbox.minX, b.minX);
      bbox.minY = Math.min(bbox.minY, b.minY);
      bbox.maxX = Math.max(bbox.maxX, b.maxX);
      bbox.maxY = Math.max(bbox.maxY, b.maxY);
    }

    x += position.xAdvance * scale + tracking;
  });

  return { d, width: x - tracking, bbox };
}

// Signature style: amber fill, ink outline, and a deep-forest offset shadow, all relative to font size.
const SIGNATURE = { stroke: 0.0165, shadow: 0.0175, wordStroke: 0.03, wordShadow: 0.03 };

/**
 * Font outlines overlap (crossbars, ligatures), so a plain stroke would draw lines inside letters.
 * The outline is a double-width stroke under the fill, which leaves only the outer half visible.
 */
const signatureLayers = (d, x, y, { outline, shadow, fillId }) => {
  const sw = fmt(outline * 2);
  return `<g opacity=".35"><path d="${d}" transform="translate(${fmt(x + shadow)} ${fmt(y + shadow)})" fill="${C.deepForest}" stroke="${C.deepForest}" stroke-width="${sw}" stroke-linejoin="round"/></g>
  <path d="${d}" transform="translate(${fmt(x)} ${fmt(y)})" fill="${C.ink}" stroke="${C.ink}" stroke-width="${sw}" stroke-linejoin="round"/>
  <path d="${d}" transform="translate(${fmt(x)} ${fmt(y)})" fill="url(#${fillId})"/>`;
};

const signatureDefs = (id) => `
    <linearGradient id="${id}" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="${C.amberBright}"/>
      <stop offset="1" stop-color="${C.amber}"/>
    </linearGradient>`;

const tileBackground = (id) => `
    <radialGradient id="${id}" cx="50%" cy="46%" r="70%">
      <stop offset="0" stop-color="${C.mintSoft}"/>
      <stop offset="1" stop-color="${C.mint}"/>
    </radialGradient>`;

/**
 * The F symbol. `background`: "tile" (mint gradient, square), "none", or a color.
 * `style`: "signature" | a solid color for single-color versions.
 * `glyphScale` is the F height as a share of the canvas.
 */
export function markSvg({ size = 1024, background = "none", style = "signature", glyphScale = 0.64, id = "m" } = {}) {
  const probe = textPath("F", 1000);
  const fontSize = (1000 * glyphScale * size) / (probe.bbox.maxY - probe.bbox.minY);
  const glyph = textPath("F", fontSize);
  const { bbox } = glyph;
  const signature = style === "signature";
  const shadow = signature ? SIGNATURE.shadow * fontSize : 0;
  const outline = signature ? SIGNATURE.stroke * fontSize * 0.75 : 0;
  const x = (size - (bbox.maxX - bbox.minX) - shadow) / 2 - bbox.minX;
  const y = (size - (bbox.maxY - bbox.minY) - shadow) / 2 - bbox.minY;

  const defs = [signature ? signatureDefs(`${id}-fill`) : "", background === "tile" ? tileBackground(`${id}-bg`) : ""].join("");
  const bg =
    background === "tile"
      ? `<rect width="${size}" height="${size}" fill="url(#${id}-bg)"/>`
      : background === "none"
        ? ""
        : `<rect width="${size}" height="${size}" fill="${background}"/>`;

  const body = signature
    ? signatureLayers(glyph.d, x, y, { outline, shadow, fillId: `${id}-fill` })
    : `<path d="${glyph.d}" transform="translate(${fmt(x)} ${fmt(y)})" fill="${style}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Flavoneer">
  <defs>${defs}
  </defs>
  ${bg}
  ${body}
</svg>`;
}

/** The lowercase "flavoneer" wordmark, outlined to paths. Height is set by `fontSize`. */
export function wordmarkSvg({ style = "signature", fontSize = 200, id = "w" } = {}) {
  const word = textPath("flavoneer", fontSize);
  const signature = style === "signature";
  const outline = signature ? SIGNATURE.wordStroke * fontSize * 0.6 : 0;
  const shadow = signature ? SIGNATURE.wordShadow * fontSize : 0;
  const pad = outline + 1;
  const { bbox } = word;
  const width = bbox.maxX - bbox.minX + pad * 2 + shadow;
  const height = bbox.maxY - bbox.minY + pad * 2 + shadow;
  const x = pad - bbox.minX;
  const y = pad - bbox.minY;

  const body = signature
    ? signatureLayers(word.d, x, y, { outline, shadow, fillId: `${id}-fill` })
    : `<path d="${word.d}" transform="translate(${fmt(x)} ${fmt(y)})" fill="${style}"/>`;

  return {
    width,
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}" height="${fmt(height)}" viewBox="0 0 ${fmt(width)} ${fmt(height)}" role="img" aria-label="Flavoneer">
  <defs>${signature ? signatureDefs(`${id}-fill`) : ""}
  </defs>
  ${body}
</svg>`,
  };
}

/**
 * The mascot wordmark from the landing page: "flav", the mascot pan as the "o", then "neer".
 * Geometry mirrors `.brand-pan-o` in apps/landing/app/assets/css/main.css.
 */
export function mascotWordmarkSvg({ style = "signature", fontSize = 200, id = "mw", mascotHref }) {
  const em = fontSize;
  const left = textPath("flav", em);
  const right = textPath("neer", em);
  const signature = style === "signature";
  const stroke = signature ? SIGNATURE.wordStroke * em * 0.6 : 0;
  const shadow = signature ? SIGNATURE.wordShadow * em : 0.035 * em;

  const panX = left.width + 0.025 * em;
  const rightX = panX + 0.865 * em;
  const cx = panX + 0.42 * em;
  const cy = -0.34 * em;
  const radius = 0.42 * em;
  const border = 0.075 * em;
  const handleTop = -0.76 * em + 0.76 * 0.84 * em;
  const imageWidth = 0.84 * 1.54 * em;
  const imageHeight = imageWidth * MASCOT_RATIO;
  const imageCy = -0.76 * em + 0.54 * 0.84 * em;

  const minY = Math.min(left.bbox.minY, right.bbox.minY, cy - radius) - stroke;
  const maxY = handleTop + 0.72 * em + 0.08 * em;
  const minX = left.bbox.minX - stroke;
  const maxX = rightX + right.bbox.maxX + stroke + shadow;
  const width = maxX - minX;
  const height = maxY - minY + shadow;
  const ox = -minX;
  const oy = -minY;

  const letters = (d, dx) =>
    signature
      ? signatureLayers(d, ox + dx, oy, { outline: stroke, shadow, fillId: `${id}-fill` })
      : `<path d="${d}" transform="translate(${fmt(ox + dx)} ${fmt(oy + shadow)})" fill="${C.deepForest}" opacity=".16"/>
  <path d="${d}" transform="translate(${fmt(ox + dx)} ${fmt(oy)})" fill="${C.amber}"/>`;

  const pcx = ox + cx;
  const pcy = oy + cy;

  return {
    width,
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${fmt(width)}" height="${fmt(height)}" viewBox="0 0 ${fmt(width)} ${fmt(height)}" role="img" aria-label="Flavoneer">
  <defs>${signatureDefs(`${id}-fill`)}
    <clipPath id="${id}-face"><circle cx="${fmt(pcx)}" cy="${fmt(pcy)}" r="${fmt(radius - border)}"/></clipPath>
  </defs>
  <rect x="${fmt(pcx - 0.045 * em)}" y="${fmt(oy + handleTop + 0.08 * em)}" width="${fmt(0.09 * em)}" height="${fmt(0.72 * em)}" rx="${fmt(0.045 * em)}" fill="#0d2821"/>
  <rect x="${fmt(pcx - 0.045 * em)}" y="${fmt(oy + handleTop)}" width="${fmt(0.09 * em)}" height="${fmt(0.72 * em)}" rx="${fmt(0.045 * em)}" fill="${C.ink}"/>
  <circle cx="${fmt(pcx)}" cy="${fmt(pcy)}" r="${fmt(radius - border)}" fill="${C.amber}"/>
  <image href="${mascotHref}" xlink:href="${mascotHref}" x="${fmt(pcx - imageWidth / 2)}" y="${fmt(oy + imageCy - imageHeight / 2)}" width="${fmt(imageWidth)}" height="${fmt(imageHeight)}" clip-path="url(#${id}-face)"/>
  <circle cx="${fmt(pcx)}" cy="${fmt(pcy)}" r="${fmt(radius - border / 2)}" fill="none" stroke="${C.ink}" stroke-width="${fmt(border)}"/>
  ${letters(left.d, 0)}
  ${letters(right.d, rightX)}
</svg>`,
  };
}

export const fileUrl = (file) => pathToFileURL(file).href;

export const dataUrl = (file, mime = "image/png") => `data:${mime};base64,${readFileSync(file).toString("base64")}`;

export const fontFaceCss = () =>
  [
    ["Fraunces", 700, FONT_FILES.fraunces700],
    ["Fraunces", 800, FONT_FILES.fraunces800],
    ["Fraunces", 900, FONT_FILES.fraunces900],
    ["DM Sans", 400, FONT_FILES.dmSans400],
    ["DM Sans", 500, FONT_FILES.dmSans500],
    ["DM Sans", 600, FONT_FILES.dmSans600],
    ["DM Sans", 700, FONT_FILES.dmSans700],
    ["DM Sans", 800, FONT_FILES.dmSans800],
  ]
    .map(([family, weight, file]) => `@font-face{font-family:"${family}";font-weight:${weight};src:url("${fileUrl(file)}")}`)
    .join("\n");

// --- PNG helpers -----------------------------------------------------------

function pngChunks(buffer) {
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    chunks.push({ type, data: buffer.subarray(offset + 8, offset + 8 + length) });
    offset += 12 + length;
  }
  return chunks;
}

function pngChunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** Re-encodes an 8-bit RGBA PNG as RGB. App Store Connect rejects icons with an alpha channel. */
export function stripAlpha(buffer) {
  const chunks = pngChunks(buffer);
  const ihdr = chunks.find((c) => c.type === "IHDR").data;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const colorType = ihdr[9];
  if (ihdr[8] !== 8 || ihdr[12] !== 0) throw new Error("Only 8-bit, non-interlaced PNGs are supported");
  if (colorType === 2) return buffer;
  if (colorType !== 6) throw new Error(`Unsupported PNG color type ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(chunks.filter((c) => c.type === "IDAT").map((c) => c.data)));
  const bpp = 4;
  const stride = width * bpp;
  const pixels = Buffer.alloc(stride * height);

  for (let row = 0; row < height; row++) {
    const filter = raw[row * (stride + 1)];
    const line = raw.subarray(row * (stride + 1) + 1, (row + 1) * (stride + 1));
    const out = pixels.subarray(row * stride, (row + 1) * stride);
    const prev = row > 0 ? pixels.subarray((row - 1) * stride, row * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let value = line[i];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[i] = value & 0xff;
    }
  }

  const rgb = Buffer.alloc((width * 3 + 1) * height);
  for (let row = 0; row < height; row++) {
    rgb[row * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const src = row * stride + x * 4;
      const dst = row * (width * 3 + 1) + 1 + x * 3;
      rgb[dst] = pixels[src];
      rgb[dst + 1] = pixels[src + 1];
      rgb[dst + 2] = pixels[src + 2];
    }
  }

  const header = Buffer.from(ihdr);
  header[9] = 2;
  return Buffer.concat([
    buffer.subarray(0, 8),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(rgb, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Packs PNG images into a .ico file. */
export function toIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}
