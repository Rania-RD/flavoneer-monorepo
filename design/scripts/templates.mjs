import { C, MASCOT_BOTTOM_PADDING, MASCOT_FILE, MASCOT_RATIO, fileUrl, fontFaceCss, markSvg, wordmarkSvg } from "./lib.mjs";

const mascotUrl = fileUrl(MASCOT_FILE);

export function page({ width, height, body, css = "", background = "transparent", dir = "ltr" }) {
  return `<!doctype html>
<html dir="${dir}"><head><meta charset="utf-8"><style>
${fontFaceCss()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${width}px;height:${height}px;overflow:hidden;background:${background}}
body{position:relative;font-family:"DM Sans",ui-sans-serif,system-ui,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased}
.display{font-family:"Fraunces",Georgia,serif;font-weight:800;letter-spacing:-0.02em}
.ar{font-family:"SF Arabic","Geeza Pro",system-ui,sans-serif;letter-spacing:0}
.abs{position:absolute}
.loop{position:relative;display:inline-block;padding:0 .14em;white-space:nowrap}
.loop svg{position:absolute;inset:-.16em -.12em -.1em;width:calc(100% + .24em);height:calc(100% + .26em);overflow:visible}
.loop path{fill:none;stroke:${C.orange};stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.bubble{position:absolute;border-radius:999px;border:var(--b,2px) solid rgba(28,74,60,.22);background:rgba(255,255,255,.16)}
.dark .bubble{border-color:rgba(210,242,212,.16);background:rgba(210,242,212,.04)}
.grid-bg{background-image:linear-gradient(rgba(210,242,212,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(210,242,212,.06) 1px,transparent 1px);background-size:var(--g,32px) var(--g,32px)}
${css}
</style></head><body>${body}</body></html>`;
}

/** Hand-drawn orange ellipse from the landing hero. `weight` scales the stroke for large canvases. */
export const loop = (text, weight = 1) => `<span class="loop"><svg viewBox="0 0 800 500" preserveAspectRatio="none" aria-hidden="true">
<path style="stroke-width:${4 * weight}px" d="M112 31C266 4 584 5 699 40C771 63 794 140 787 245C781 349 755 423 676 462C535 493 250 494 104 459C28 431 9 345 15 242C21 137 43 61 112 31Z"/>
<path style="stroke-width:${2 * weight}px;opacity:.94" d="M96 48C244 13 592 12 714 53C779 81 790 157 778 253C769 352 739 416 660 451C516 481 226 482 88 445C24 407 21 325 29 224C36 130 54 70 96 48Z"/>
</svg><span style="position:relative">${text}</span></span>`;

/** Scattered bubbles; positions are fractions of the canvas, sizes are px. */
export const bubbles = (list, border = 2) =>
  list
    .map(([x, y, s]) => `<span class="bubble" style="left:${x * 100}%;top:${y * 100}%;width:${s}px;height:${s}px;--b:${border}px"></span>`)
    .join("");

/** The mascot peeking over the bottom edge of its container. `width` in px. */
export const mascot = ({ width, left, right, bottom = 0, flip = false }) => {
  const h = width * MASCOT_RATIO;
  const side = left !== undefined ? `left:${left}px` : `right:${right}px`;
  return `<img class="abs" src="${mascotUrl}" style="${side};bottom:${bottom - h * MASCOT_BOTTOM_PADDING}px;width:${width}px;height:${h}px;${flip ? "transform:scaleX(-1);" : ""}" alt="">`;
};

/** Forest blob that the mascot sits on, from the mobile hero. */
export const blob = ({ width, height, left, right, bottom, rotate = -6, color = C.forest }) => {
  const side = left !== undefined ? `left:${left}px` : `right:${right}px`;
  return `<span class="abs" style="${side};bottom:${bottom}px;width:${width}px;height:${height}px;border-radius:48%;background:${color};transform:rotate(${rotate}deg)"></span>`;
};

export const wordmark = (style, height) => {
  const w = wordmarkSvg({ style, fontSize: 200, id: `w${Math.round(Math.random() * 1e6)}` });
  return w.svg.replace(/width="[^"]+" height="[^"]+"/, `height="${height}" width="${(w.width / w.height) * height}"`);
};

export const markTile = (size, radius = 0.2237) =>
  `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:${radius * size}px;overflow:hidden;box-shadow:0 0 0 ${Math.max(1, size / 64)}px rgba(23,62,51,.18)">${markSvg({ size, background: "tile", id: `t${Math.round(Math.random() * 1e6)}` })}</span>`;

// --- Social covers ---------------------------------------------------------

/**
 * Banner layout: text on one side, mascot on a forest blob on the other.
 * `safe` is the region every platform shows; the decoration can bleed outside it.
 */
export function cover({ width, height, safe, scale = 1, headline = false, band = false, mascotSide = "right", tagline = "The intelligent workspace for food formulations" }) {
  const s = safe ?? { x: 0, y: 0, w: width, h: height };
  const mascotWidth = Math.min(s.h * 1.15, s.w * 0.36);
  const mascotOffset = s.w * 0.05;
  const mascotX = mascotSide === "right" ? width - (s.x + s.w) + mascotOffset : s.x + mascotOffset;
  const bottomGap = band ? height - (s.y + s.h) : 0;
  const textSide = mascotSide === "right" ? `left:${s.x + s.w * 0.06}px` : `right:${s.x + s.w * 0.06}px;text-align:right`;
  const blobW = mascotWidth * 1.5;

  const body = `
  <div class="abs" style="inset:0;background:radial-gradient(120% 140% at 30% 30%,${C.mintSoft} 0%,${C.mint} 60%)"></div>
  ${bubbles(
    [
      [0.52, 0.12, 22 * scale],
      [0.6, 0.7, 14 * scale],
      [0.44, 0.78, 30 * scale],
      [0.9, 0.1, 36 * scale],
      [0.04, 0.16, 18 * scale],
      [0.33, 0.06, 12 * scale],
      [0.72, 0.3, 10 * scale],
    ],
    Math.max(1, 1.5 * scale),
  )}
  ${bottomGap > 0 ? `<div class="abs grid-bg" style="left:0;right:0;bottom:0;height:${bottomGap}px;background-color:${C.deepForest};--g:${32 * scale}px"></div>` : ""}
  ${blob({ width: blobW, height: mascotWidth * 0.62, [mascotSide]: mascotX - blobW * 0.18, bottom: bottomGap - mascotWidth * 0.36, rotate: mascotSide === "right" ? -6 : 6 })}
  ${mascot({ width: mascotWidth, [mascotSide]: mascotX, bottom: bottomGap })}
  <div class="abs" style="${textSide};top:${s.y}px;height:${s.h}px;width:${s.w * 0.58}px;display:flex;flex-direction:column;justify-content:center;align-items:${mascotSide === "right" ? "flex-start" : "flex-end"};gap:${s.h * 0.07}px">
    ${wordmark("signature", s.h * (headline ? 0.17 : 0.26))}
    ${
      headline
        ? `<div class="display" style="font-size:${s.h * 0.15}px;line-height:1.04;color:${C.inkDeep}">The intelligent workspace for ${loop("food formulations", scale)}</div>`
        : `<div style="font-size:${s.h * 0.1}px;line-height:1.2;font-weight:600;color:${C.forest}">${tagline}</div>`
    }
    <div style="display:inline-flex;align-items:center;gap:.5em;border-radius:999px;background:${C.forest};color:${C.cream};font-weight:700;font-size:${s.h * 0.065}px;padding:.55em 1.1em">flavoneer.com</div>
  </div>`;

  return page({ width, height, body });
}

// --- Social posts ----------------------------------------------------------

export function postHero({ width, height, eyebrow = "Built for modern food R&D" }) {
  const u = width / 1080;
  const body = `
  <div class="abs" style="inset:0;background:radial-gradient(110% 80% at 50% 25%,${C.mintSoft} 0%,${C.mint} 65%)"></div>
  ${bubbles([[0.08, 0.1, 30 * u], [0.84, 0.08, 48 * u], [0.9, 0.42, 22 * u], [0.06, 0.5, 18 * u], [0.74, 0.56, 14 * u]], 2 * u)}
  <div class="abs" style="left:${72 * u}px;top:${72 * u}px">${wordmark("signature", 64 * u)}</div>
  <div class="abs" style="left:${72 * u}px;right:${72 * u}px;top:${height * 0.2}px;text-align:center">
    <div style="display:inline-block;border:${2 * u}px solid rgba(28,74,60,.2);background:rgba(255,255,255,.35);border-radius:999px;padding:${12 * u}px ${24 * u}px;font-size:${22 * u}px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.forest}">${eyebrow}</div>
    <div class="display" style="margin-top:${48 * u}px;font-size:${96 * u}px;line-height:1.02;color:${C.inkDeep}">The intelligent workspace for ${loop("food formulations", 1.6 * u)}</div>
  </div>
  ${blob({ width: 900 * u, height: 340 * u, left: -120 * u, bottom: -210 * u })}
  ${blob({ width: 700 * u, height: 300 * u, right: -160 * u, bottom: -200 * u, rotate: 8 })}
  ${mascot({ width: 820 * u, left: (width - 820 * u) / 2, bottom: 0 })}`;
  return page({ width, height, body });
}

export function postFeature({ width, height }) {
  const u = width / 1080;
  const row = (name, kg) => `<div style="display:grid;grid-template-columns:1fr auto auto;gap:${24 * u}px;padding:${16 * u}px 0;border-bottom:1px solid #d6e7d8;font-size:${24 * u}px"><b>${name}</b><span style="color:#658276">${kg}.00 kg</span><b style="width:${70 * u}px;text-align:right">${kg}%</b></div>`;
  const metric = (label, value) => `<div style="padding:${22 * u}px;border-right:1px solid #bfd8c6"><div style="font-size:${17 * u}px;font-weight:600;color:#698477">${label}</div><div style="margin-top:${6 * u}px;font-size:${32 * u}px;font-weight:700">${value}</div></div>`;
  const body = `
  <div class="abs grid-bg dark" style="inset:0;background-color:${C.deepForest};--g:${36 * u}px"></div>
  <div class="abs" style="left:${80 * u}px;right:${80 * u}px;top:${84 * u}px">
    <div style="font-size:${22 * u}px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${C.amber}">Formula intelligence</div>
    <div class="display" style="margin-top:${20 * u}px;font-size:${88 * u}px;line-height:1.02;color:#EFFBEF">Mass balance that ${loop("never drifts.", 1.6 * u)}</div>
    <div style="margin-top:${24 * u}px;font-size:${28 * u}px;line-height:1.45;color:#B9D8C7;max-width:${820 * u}px">Normalize every unit and reconcile batch yield before a trial reaches pilot production.</div>
  </div>
  <div class="abs" style="left:${80 * u}px;right:${80 * u}px;bottom:${150 * u}px;border-radius:${10 * u}px;overflow:hidden;background:#EDF8ED;color:${C.ink};box-shadow:0 ${30 * u}px ${60 * u}px rgba(0,0,0,.3)">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:${22 * u}px ${28 * u}px;border-bottom:1px solid #bfd8c6">
      <div><div style="font-size:${15 * u}px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#658276">Active formulation</div><div style="margin-top:${4 * u}px;font-size:${28 * u}px;font-weight:700">Cultured Oat Drink · V4</div></div>
      <span style="border-radius:999px;background:#F6C768;color:#5A3B08;font-weight:700;font-size:${18 * u}px;padding:${6 * u}px ${16 * u}px">Draft</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #bfd8c6">${metric("Batch weight", "100.0 kg")}${metric("Batch cost", "$184.20")}${metric("Cost / serving", "$0.37")}${metric("Mass balance", `<span style="color:${C.success}">✓</span> 100%`)}</div>
    <div style="padding:${8 * u}px ${28 * u}px ${16 * u}px">${row("Oat base", 84)}${row("Canola oil", 8)}${row("Pea protein", 6)}${row("Mineral blend", 2)}</div>
  </div>
  <div class="abs" style="left:${80 * u}px;bottom:${56 * u}px">${wordmark(C.amber, 52 * u)}</div>
  <div class="abs" style="right:${80 * u}px;bottom:${62 * u}px;font-size:${24 * u}px;font-weight:700;color:${C.mint}">flavoneer.com</div>`;
  return page({ width, height, body });
}

export function postStat({ width, height }) {
  const u = width / 1080;
  const body = `
  <div class="abs" style="inset:0;background:${C.amber}"></div>
  ${bubbles([[0.78, 0.1, 60 * u], [0.88, 0.3, 26 * u], [0.1, 0.84, 34 * u]], 2 * u)}
  <div class="abs" style="left:${88 * u}px;top:${96 * u}px;font-size:${24 * u}px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${C.ink};opacity:.75">Dynamic allergen mapping</div>
  <div class="abs display" style="left:${80 * u}px;top:${170 * u}px;font-size:${330 * u}px;line-height:1;color:${C.ink}">2</div>
  <div class="abs display" style="left:${88 * u}px;right:${88 * u}px;top:${520 * u}px;font-size:${72 * u}px;line-height:1.05;color:${C.ink}">label modes, FDA and EU, recalculated as you formulate.</div>
  <div class="abs" style="left:${88 * u}px;bottom:${80 * u}px">${wordmark(C.ink, 54 * u)}</div>
  <div class="abs" style="right:${88 * u}px;bottom:${80 * u}px">${markTile(96 * u)}</div>`;
  return page({ width, height, body });
}

export function story({ width, height }) {
  const u = width / 1080;
  const body = `
  <div class="abs" style="inset:0;background:radial-gradient(120% 70% at 50% 30%,${C.mintSoft} 0%,${C.mint} 70%)"></div>
  ${bubbles([[0.1, 0.18, 40 * u], [0.82, 0.14, 60 * u], [0.86, 0.48, 26 * u], [0.06, 0.56, 20 * u], [0.7, 0.62, 14 * u]], 2 * u)}
  <div class="abs" style="left:0;right:0;top:${260 * u}px;text-align:center">${wordmark("signature", 96 * u)}</div>
  <div class="abs" style="left:${80 * u}px;right:${80 * u}px;top:${520 * u}px;text-align:center">
    <div class="display" style="font-size:${108 * u}px;line-height:1.02;color:${C.inkDeep}">From benchtop trial to ${loop("factory release", 1.8 * u)}</div>
    <div style="margin:${44 * u}px auto 0;max-width:${760 * u}px;font-size:${34 * u}px;line-height:1.45;font-weight:500;color:#285B4D">Formulation, compliance, and production QC in one connected record.</div>
    <div style="margin-top:${56 * u}px;display:inline-flex;align-items:center;gap:${14 * u}px;border-radius:999px;background:${C.amber};box-shadow:inset 0 -${5 * u}px 0 rgba(182,97,8,.23);padding:${26 * u}px ${44 * u}px;font-size:${34 * u}px;font-weight:700;color:${C.ink}">Start at flavoneer.com →</div>
  </div>
  ${blob({ width: 1000 * u, height: 380 * u, left: -200 * u, bottom: -230 * u })}
  ${blob({ width: 800 * u, height: 340 * u, right: -220 * u, bottom: -240 * u, rotate: 8 })}
  ${mascot({ width: 760 * u, left: (width - 760 * u) / 2, bottom: 0 })}`;
  return page({ width, height, body });
}

export function avatar({ size, variant }) {
  const body =
    variant === "mascot"
      ? `<img src="${fileUrl(MASCOT_FILE.replace("flavoneer-mascot.png", "flavoneer-logo-square.png"))}" style="width:${size}px;height:${size}px;display:block" alt="">`
      : markSvg({ size, background: "tile", glyphScale: 0.56 });
  return page({ width: size, height: size, body });
}

export function featureGraphic({ width = 1024, height = 500 }) {
  return cover({ width, height, safe: { x: 24, y: 70, w: width - 24, h: 360 }, tagline: "Food R&amp;D and production quality in one app" });
}

export function openGraph({ width = 1200, height = 630 }) {
  return cover({ width, height, headline: true, scale: 1.2 });
}
