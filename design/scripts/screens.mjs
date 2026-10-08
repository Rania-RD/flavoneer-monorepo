import { C, markSvg, tokens } from "./lib.mjs";
import { bubbles, loop, page } from "./templates.mjs";

// Phone screens are drawn at 390x844 points (iPhone logical size) and scaled into each store frame.
const SCREEN_W = 390;
const SCREEN_H = 844;
const S = tokens.status;

const statusBar = (dark = false) => `
<div style="height:54px;display:flex;align-items:center;justify-content:space-between;padding:14px 30px 0 34px;font-weight:700;font-size:16px;color:${dark ? "#fff" : C.ink}" dir="ltr">
  <span>9:41</span>
  <span style="display:flex;gap:6px;align-items:center">
    <svg width="18" height="12" viewBox="0 0 18 12"><g fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></g></svg>
    <svg width="16" height="12" viewBox="0 0 16 12"><path fill="currentColor" d="M8 2.6c2.2 0 4.2.8 5.7 2.2l1.2-1.3A10 10 0 0 0 8 .8 10 10 0 0 0 1.1 3.5l1.2 1.3A8.2 8.2 0 0 1 8 2.6Zm0 3.6c1.2 0 2.3.4 3.2 1.2l1.2-1.3A6.6 6.6 0 0 0 8 4.4c-1.7 0-3.2.6-4.4 1.7l1.2 1.3c.9-.8 2-1.2 3.2-1.2ZM8 8c-.7 0-1.3.3-1.8.7L8 10.6l1.8-1.9C9.3 8.3 8.7 8 8 8Z"/></svg>
    <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor"/><rect x="25" y="4.5" width="1.5" height="4" rx=".7" fill="currentColor" opacity=".4"/></svg>
  </span>
</div>`;

const homeIndicator = (dark = false) =>
  `<div style="position:absolute;left:50%;bottom:8px;width:134px;height:5px;border-radius:3px;background:${dark ? "#fff" : C.ink};transform:translateX(-50%);opacity:.9"></div>`;

const chip = (label, status) =>
  `<span style="display:inline-block;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:700;background:${S[status].background};color:${S[status].text};white-space:nowrap">${label}</span>`;

const tile = (size) =>
  `<span style="display:inline-block;width:${size}px;height:${size}px;border-radius:${size * 0.28}px;overflow:hidden;box-shadow:0 0 0 1px rgba(23,62,51,.14)">${markSvg({ size, background: "tile", glyphScale: 0.6, id: `s${Math.round(Math.random() * 1e6)}` })}</span>`;

const header = (subtitle, ar = false) => `
<div style="display:flex;align-items:center;gap:12px;padding:6px 20px 0">
  ${tile(44)}
  <div style="flex:1">
    <div class="display" style="font-size:22px;line-height:26px;letter-spacing:0">Flavoneer</div>
    <div class="${ar ? "ar" : ""}" style="margin-top:2px;font-size:11px;line-height:16px;font-weight:800;letter-spacing:${ar ? 0 : 2}px;text-transform:uppercase;color:${C.copy}">${subtitle}</div>
  </div>
  <span style="width:40px;height:40px;border-radius:999px;background:#FFE3A8;color:#6B3F05;display:grid;place-items:center;font-weight:800;font-size:14px">SA</span>
</div>`;

const card = (inner, extra = "") =>
  `<div style="background:${C.cream};border:1px solid rgba(28,74,60,.14);border-radius:16px;${extra}">${inner}</div>`;

function inspectionsScreen(ar = false) {
  const t = ar
    ? {
        section: "مراقبة الجودة",
        overline: "مراقبة خط الإنتاج",
        title: "الفحوصات الساعية",
        current: "الساعة الحالية",
        where: "صالة الإنتاج 2 · خط التغطية 1",
        cta: "فحص جديد",
        recent: "السجلات الأخيرة",
        product: "قطع الويفر بالشوكولاتة",
        pending: "قيد المراجعة",
        approved: "معتمد",
        returned: "معاد",
        line: "خط التغطية 1",
      }
    : {
        section: "Quality control",
        overline: "Production monitoring",
        title: "Hourly inspections",
        current: "Current hour",
        where: "Production hall 2 · Coating line 1",
        cta: "New inspection",
        recent: "Recent records",
        product: "Milk chocolate wafer bites",
        pending: "Pending review",
        approved: "Approved",
        returned: "Returned",
        line: "Coating line 1",
      };
  const cls = ar ? "ar" : "";
  const records = [
    ["H2-0412", "13:00", t.pending, "pendingReview"],
    ["H2-0411", "12:00", t.approved, "approved"],
    ["H2-0410", "11:00", t.returned, "returned"],
    ["H2-0409", "10:00", t.approved, "approved"],
    ["H2-0408", "09:00", t.approved, "approved"],
  ]
    .map(
      ([serial, time, label, status], i) => `
    <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;${i ? "border-top:1px solid rgba(28,74,60,.1);" : ""}">
      <div style="flex:1;min-width:0">
        <div style="font-family:ui-monospace,Menlo,monospace;font-size:12px;color:${C.copy}"><span dir="ltr">${serial}</span></div>
        <div class="${cls}" style="margin-top:2px;font-size:15px;font-weight:700">${t.product}</div>
        <div class="${cls}" style="margin-top:2px;font-size:12px;color:${C.copy}"><span dir="ltr">${time}</span> · ${t.line}</div>
      </div>
      ${chip(label, status)}
    </div>`,
    )
    .join("");

  return `
${statusBar()}
${header(t.section, ar)}
<div style="padding:26px 20px 0">
  <div class="${cls}" style="font-size:11px;font-weight:800;letter-spacing:${ar ? 0 : 2}px;text-transform:uppercase;color:${C.copy}">${t.overline}</div>
  <div class="${ar ? "ar" : "display"}" style="margin-top:4px;font-size:34px;line-height:40px;font-weight:800;letter-spacing:${ar ? 0 : -0.8}px">${t.title}</div>
</div>
<div style="margin:20px 20px 0;padding:20px;border-radius:20px;background:${C.forest};color:${C.cream};position:relative;overflow:hidden">
  <span style="position:absolute;${ar ? "left" : "right"}:-30px;top:-40px;width:140px;height:140px;border-radius:999px;background:rgba(210,242,212,.07)"></span>
  <div class="${cls}" style="font-size:11px;font-weight:800;letter-spacing:${ar ? 0 : 2}px;text-transform:uppercase;color:${C.amber}">${t.current}</div>
  <div class="display" style="margin-top:6px;font-size:34px;line-height:38px"><span dir="ltr">14:00 – 15:00</span></div>
  <div class="${cls}" style="margin-top:6px;font-size:14px;color:${C.darkCopy}">${t.where}</div>
  <div class="${cls}" style="margin-top:16px;display:flex;align-items:center;justify-content:center;gap:8px;height:48px;border-radius:999px;background:${C.amber};color:${C.ink};font-weight:800;font-size:16px;box-shadow:inset 0 -3px 0 rgba(182,97,8,.22)">+ ${t.cta}</div>
</div>
<div class="${ar ? "ar" : "display"}" style="margin:26px 20px 10px;font-size:22px;font-weight:800">${t.recent}</div>
<div style="margin:0 20px">${card(records)}</div>`;
}

function captureScreen() {
  return `
<div style="position:absolute;inset:0 0 auto;height:470px;background:#0D2B24;overflow:hidden">
  ${statusBar(true)}
  <div style="position:absolute;left:44px;right:44px;top:120px;height:230px;transform:rotate(-2deg);border-radius:6px;background:linear-gradient(160deg,#D9B67C,#C49A5C);box-shadow:0 20px 40px rgba(0,0,0,.4)">
    <div style="position:absolute;inset:26px 26px;background:#FBF6EA;border-radius:4px;padding:18px 20px;font-family:ui-monospace,Menlo,monospace;color:#1d1d1d">
      <div style="font-size:11px;letter-spacing:2px;opacity:.6">MILK CHOCOLATE WAFER BITES</div>
      <div style="margin-top:12px;font-size:28px;font-weight:700;letter-spacing:1px">060826 1</div>
      <div style="margin-top:10px;font-size:12px;line-height:18px">BEST BEFORE 06/02/2027<br>NET WT 1.0 KG · HALL 2</div>
    </div>
  </div>
  ${["left:30px;top:100px;border-width:4px 0 0 4px", "right:30px;top:100px;border-width:4px 4px 0 0", "left:30px;top:340px;border-width:0 0 4px 4px", "right:30px;top:340px;border-width:0 4px 4px 0"]
    .map((pos) => `<span style="position:absolute;${pos};width:44px;height:44px;border-style:solid;border-color:${C.amber};border-radius:6px"></span>`)
    .join("")}
  <div style="position:absolute;left:0;right:0;top:404px;text-align:center;color:#D2F2D4;font-size:14px;font-weight:600">Place the complete printed code inside the frame.</div>
</div>
<div style="position:absolute;left:0;right:0;top:440px;bottom:0;background:${C.mintSoft};border-radius:28px 28px 0 0;padding:26px 20px">
  <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${C.copy}">Carton batch label</div>
  <div class="display" style="margin-top:4px;font-size:26px;line-height:32px">Confirm the batch code</div>
  <div style="margin-top:20px;font-size:13px;font-weight:700">Printed batch code</div>
  <div style="margin-top:8px;height:58px;border-radius:14px;border:2px solid ${C.forest};background:${C.cream};display:flex;align-items:center;padding:0 16px;font-family:ui-monospace,Menlo,monospace;font-size:24px;font-weight:700;letter-spacing:1px">060826 1<span style="margin-left:2px;width:2px;height:26px;background:${C.orange}"></span></div>
  <div style="margin-top:6px;font-size:12px;color:${C.copy}">Example: 060826 1</div>
  <div style="margin-top:18px;display:flex;gap:12px;align-items:center;font-size:15px;font-weight:600">
    <span style="width:26px;height:26px;border-radius:8px;background:${C.forest};color:${C.cream};display:grid;place-items:center;font-size:16px">✓</span>
    I confirm the code matches the photo
  </div>
  <div style="margin-top:24px;height:54px;border-radius:999px;background:${C.forest};color:${C.cream};display:grid;place-items:center;font-weight:800;font-size:17px">Confirm batch code</div>
</div>`;
}

function approvalScreen() {
  const check = (label, value, range) => `
  <div style="display:flex;align-items:center;gap:12px;padding:13px 16px;border-top:1px solid rgba(28,74,60,.1)">
    <span style="width:24px;height:24px;border-radius:999px;background:${C.mint};color:${C.success};display:grid;place-items:center;font-size:14px;font-weight:800">✓</span>
    <div style="flex:1"><div style="font-size:15px;font-weight:700">${label}</div><div style="font-size:12px;color:${C.copy}">${range}</div></div>
    <b style="font-size:15px">${value}</b>
  </div>`;
  return `
${statusBar()}
<div style="display:flex;align-items:center;gap:10px;padding:8px 20px 0">
  <span style="width:40px;height:40px;border-radius:999px;border:1px solid rgba(28,74,60,.18);display:grid;place-items:center;font-size:20px">‹</span>
  <span style="flex:1;font-family:ui-monospace,Menlo,monospace;font-size:13px;color:${C.copy}">H2-0412</span>
  ${chip("Pending review", "pendingReview")}
</div>
<div style="padding:18px 20px 0">
  <div class="display" style="font-size:30px;line-height:36px">Hourly inspection</div>
  <div style="margin-top:6px;font-size:14px;color:${C.copy}">Hall 2 · Coating line 1 · 13:00 – 14:00</div>
</div>
<div style="margin:18px 20px 0">${card(
    `<div style="padding:12px 16px;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${C.copy}">Checks</div>
    ${check("Coated-piece weight", "12.4 g", "Spec 12.0 – 13.0 g")}
    ${check("Chocolate weight", "5.1 g", "Spec 4.8 – 5.4 g")}
    ${check("Carton weight", "1,004 g", "Spec 995 – 1,015 g")}
    ${check("Carton batch label", "060826 1", "Photo matched")}`,
  )}</div>
<div style="position:absolute;inset:0;background:rgba(13,43,36,.28)"></div>
<div style="position:absolute;left:50%;top:330px;width:170px;height:170px;transform:translateX(-50%);border-radius:36px;background:rgba(245,245,240,.94);box-shadow:0 20px 50px rgba(0,0,0,.25);display:grid;place-items:center;text-align:center">
  <div>
    <svg width="74" height="74" viewBox="0 0 74 74" fill="none" stroke="${C.success}" stroke-width="4" stroke-linecap="round"><path d="M4 20V12a8 8 0 0 1 8-8h8M54 4h8a8 8 0 0 1 8 8v8M70 54v8a8 8 0 0 1-8 8h-8M20 70h-8a8 8 0 0 1-8-8v-8"/><path d="M24 26v6M50 26v6M37 28v14h-4M27 51c6 5 14 5 20 0"/></svg>
    <div style="margin-top:12px;font-size:16px;font-weight:600;color:#1d1d1d">Face ID</div>
  </div>
</div>
<div style="position:absolute;left:0;right:0;bottom:0;padding:16px 20px 34px;background:${C.cream};border-top:1px solid rgba(28,74,60,.12);display:flex;gap:12px">
  <div style="flex:1;height:52px;border-radius:999px;border:2px solid ${C.forest};display:grid;place-items:center;font-weight:800;font-size:16px">Return</div>
  <div style="flex:1.4;height:52px;border-radius:999px;background:${C.forest};color:${C.cream};display:grid;place-items:center;font-weight:800;font-size:16px">Approve record</div>
</div>`;
}

function formulationScreen() {
  const metric = (label, value, border) =>
    `<div style="padding:12px 14px;${border}"><div style="font-size:11px;font-weight:600;color:#698477">${label}</div><div style="margin-top:2px;font-size:19px;font-weight:700">${value}</div></div>`;
  const ingredient = (name, pct) => `
  <div style="padding:10px 0;border-top:1px solid #d6e7d8">
    <div style="display:flex;justify-content:space-between;font-size:14px"><b>${name}</b><b>${pct}%</b></div>
    <div style="margin-top:6px;height:6px;border-radius:3px;background:#DCEBDD"><div style="width:${pct}%;height:100%;border-radius:3px;background:${C.amber}"></div></div>
  </div>`;
  return `
${statusBar()}
${header("R&amp;D workspace")}
<div style="padding:24px 20px 0">
  <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${C.copy}">Research &amp; Development</div>
  <div class="display" style="margin-top:4px;font-size:34px;line-height:40px;letter-spacing:-.8px">Formulations</div>
</div>
<div style="margin:16px 20px 0;display:flex;padding:4px;border-radius:999px;background:${C.mint}">
  ${["Formulations", "Runs", "Materials"].map((label, i) => `<span style="flex:1;text-align:center;padding:9px 0;border-radius:999px;font-size:14px;font-weight:700;${i === 0 ? `background:${C.forest};color:${C.cream}` : ""}">${label}</span>`).join("")}
</div>
<div style="margin:16px 20px 0">${card(
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #bfd8c6">
      <div><div style="font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#658276">Active formulation</div><div style="margin-top:2px;font-size:17px;font-weight:700">Cultured Oat Drink · V4</div></div>
      <span style="border-radius:999px;background:#F6C768;color:#5A3B08;font-weight:700;font-size:12px;padding:4px 10px">Draft</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #bfd8c6">
      ${metric("Batch weight", "100.0 kg", "border-right:1px solid #bfd8c6;border-bottom:1px solid #bfd8c6")}
      ${metric("Batch cost", "$184.20", "border-bottom:1px solid #bfd8c6")}
      ${metric("Cost / serving", "$0.37", "border-right:1px solid #bfd8c6")}
      ${metric("Mass balance", `<span style="color:${C.success}">✓</span> 100%`, "")}
    </div>
    <div style="padding:4px 16px 10px">${ingredient("Oat base", 84)}${ingredient("Canola oil", 8)}${ingredient("Pea protein", 6)}${ingredient("Mineral blend", 2)}</div>`,
    "overflow:hidden",
  )}</div>
<div style="margin:12px 20px 0">${card(
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px">
      <div><div style="font-size:16px;font-weight:700">Coated Wafer Bites · V12</div><div style="margin-top:2px;font-size:12px;color:${C.copy}">Released to Hall 2 · Allergens: milk, wheat, soy</div></div>
      ${chip("Approved", "approved")}
    </div>`,
  )}</div>`;
}

const SCREENS = {
  inspections: () => inspectionsScreen(false),
  capture: captureScreen,
  approval: approvalScreen,
  formulation: formulationScreen,
  arabic: () => inspectionsScreen(true),
};

export const SCREENSHOTS = [
  { id: "01-inspections", screen: "inspections", theme: "light", headline: `Every hour on the line, ${loop("recorded.", 1.4)}` },
  { id: "02-batch-label", screen: "capture", theme: "dark", headline: `Snap the label. Confirm the ${loop("batch.", 1.4)}` },
  { id: "03-approve", screen: "approval", theme: "light", headline: `Approve records with ${loop("Face ID.", 1.4)}` },
  { id: "04-formulations", screen: "formulation", theme: "dark", headline: `Formulas, runs, and materials in ${loop("one place.", 1.4)}` },
  {
    id: "05-arabic",
    screen: "arabic",
    theme: "light",
    dir: "rtl",
    headline: `<span class="ar">يعمل ${loop("بالعربية", 1.4)} والإنجليزية</span>`,
    sub: "Works in Arabic and English",
  },
];

/** A store screenshot: headline on top, scaled phone below. */
export function screenshot({ width, height, shot }) {
  const dark = shot.theme === "dark";
  const u = width / 1290;
  const headlineTop = height * 0.055;
  const headlineSize = 104 * u * (height / width > 2 ? 1 : 0.86);
  const phoneTop = height * (height / width > 2 ? 0.175 : 0.2);
  const bezel = 14;
  const scale = Math.min((height - phoneTop + 60 * u) / (SCREEN_H + bezel * 2), (width * 0.8) / (SCREEN_W + bezel * 2));
  const phoneW = (SCREEN_W + bezel * 2) * scale;

  const body = `
  <div class="abs ${dark ? "grid-bg dark" : ""}" style="inset:0;${dark ? `background-color:${C.deepForest};--g:${40 * u}px` : `background:radial-gradient(120% 60% at 50% 20%,${C.mintSoft},${C.mint} 70%)`}"></div>
  <div class="${dark ? "dark" : ""}">${bubbles([[0.06, 0.04, 40 * u], [0.86, 0.06, 64 * u], [0.9, 0.3, 24 * u], [0.04, 0.36, 18 * u]], 2 * u)}</div>
  <div class="abs" style="left:${80 * u}px;right:${80 * u}px;top:${headlineTop}px;text-align:center">
    <div class="display" style="font-size:${headlineSize}px;line-height:1.06;color:${dark ? "#EFFBEF" : C.inkDeep}" dir="${shot.dir ?? "ltr"}">${shot.headline}</div>
    ${shot.sub ? `<div style="margin-top:${24 * u}px;font-size:${40 * u}px;font-weight:600;color:${C.forest}">${shot.sub}</div>` : ""}
  </div>
  <div class="abs" style="left:${(width - phoneW) / 2}px;top:${phoneTop}px;width:${SCREEN_W + bezel * 2}px;height:${SCREEN_H + bezel * 2}px;transform:scale(${scale});transform-origin:0 0;border-radius:64px;background:${dark ? "#081F1A" : C.ink};padding:${bezel}px;box-shadow:0 30px 80px rgba(16,47,39,${dark ? 0.6 : 0.28}),inset 0 0 0 2px ${dark ? "rgba(210,242,212,.2)" : "rgba(255,255,255,.08)"}">
    <div style="position:relative;width:${SCREEN_W}px;height:${SCREEN_H}px;border-radius:50px;overflow:hidden;background:${C.mintSoft}" dir="${shot.dir ?? "ltr"}">
      ${SCREENS[shot.screen]()}
      <div style="position:absolute;left:50%;top:11px;width:122px;height:35px;border-radius:20px;background:#000;transform:translateX(-50%)"></div>
      ${homeIndicator()}
    </div>
  </div>`;
  return page({ width, height, body });
}
