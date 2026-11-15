// Full print document contract. Fixtures only; no database writes.
import { chromium } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { defaultSettings } from "../src/lib/portfolio/model.ts";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import jsQR from "jsqr";
mkdirSync("/tmp/portfolio-print", { recursive: true });
const b = await chromium.launch({ args: ["--no-sandbox"] });
const c = await b.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const p = await c.newPage();
const errors = [];
c.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
const s = structuredClone(defaultSettings);
s.teacher.contact = "SECRET-PHONE";
s.current_period = "1448-term-1";
s.periods = [
  { id: s.current_period, name: "العام الدراسي 1448هـ — الفصل الدراسي الأول", archived: false },
];
s.about = {
  introduction:
    "بداية المقدمة " +
    "تعليم اللغة الإنجليزية وتطوير الممارسة المهنية. ".repeat(350) +
    " نهاية المقدمة",
  objectives: "توثيق الممارسة\nتطوير التعلم",
};
s.career = [
  {
    id: "degree",
    type: "qualification",
    title: "بكالوريوس اللغة الإنجليزية",
    institution: "جامعة اختبار",
    description: "مؤهل محفوظ",
  },
];
s.schedules = [
  {
    id: "weekly",
    effective_on: "2026-09-01",
    lessons: [
      {
        id: "lesson",
        day: 0,
        period: 1,
        subject: "اللغة الإنجليزية",
        grade: "ثالث ثانوي",
        duty: "تدريس",
      },
    ],
  },
];
await p.goto("http://localhost:5173/#about");
const png = await p.evaluate(() => {
  const c = document.createElement("canvas");
  c.width = 300;
  c.height = 200;
  const x = c.getContext("2d");
  x.fillStyle = "#07a869";
  x.fillRect(0, 0, 300, 200);
  return c.toDataURL("image/png").split(",")[1];
});
let sourcePng = png;
const hash = (base64) => createHash("sha256").update(Buffer.from(base64, "base64")).digest("hex");
const samplePdf = await PDFDocument.create();
samplePdf.addPage([500, 300]).drawText("Public certificate preview");
const cert = Buffer.from(await samplePdf.save()).toString("base64");
const report = {
  id: "10000000-0000-4000-8000-000000000001",
  criterion: 4,
  period_id: s.current_period,
  title: "تقرير تعليم الأقران",
  report: {
    description: "وصف الاستراتيجية الكامل",
    objectives: ["هدف محفوظ"],
    execution_on: "2026-10-20",
  },
  assets: [
    {
      id: "asset",
      name: "صورة الشاهد الأصلية.png",
      mime: "image/png",
      sha256: hash(png),
      size: 100,
    },
  ],
  updated_at: "2026-11-15",
};
const courses = Array.from({ length: 26 }, (_, i) => ({
  id: `course-${i}`,
  version: 1,
  archived: false,
  title: i === 0 ? "<img src=x onerror=alert(1)> عنوان محفوظ" : `دورة محفوظة رقم ${i + 1}`,
  provider: "جهة تدريب موثقة",
  execution_on: `2026-10-${String(i + 1).padStart(2, "0")}`,
  duration_value: i === 2 ? 2 : 5,
  duration_unit: i === 2 ? "days" : "hours",
  updated_at: "2026-11-15",
  is_public: true,
  document:
    i < 2 ? { id: `doc-${i}`, mime: "application/pdf", sha256: hash(cert), size: 100 } : null,
}));
let certificateReads = 0,
  assetReads = 0;
await c.route("**/rest/v1/rpc/**", (r) => {
  const endpoint = r.request().url().split("/").at(-1);
  let data;
  if (endpoint === "portfolio_public_view")
    data = { settings: s, publications: [report], revision: 1 };
  else if (endpoint === "portfolio_courses_view") data = courses;
  else if (endpoint === "portfolio_report_asset") {
    assetReads++;
    data = { name: "test.png", mime: "image/png", base64: sourcePng, sha256: hash(sourcePng) };
  } else if (endpoint === "portfolio_course_document") {
    certificateReads++;
    data = { name: "certificate.pdf", mime: "application/pdf", base64: cert, sha256: hash(cert) };
  } else data = [];
  return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
});
await p.reload();
await p.getByRole("button", { name: "توليد التقرير الختامي الكامل", exact: true }).waitFor();
await p.waitForFunction(() => !document.querySelector(".gov-print-link").disabled);
const popupPromise = p.waitForEvent("popup");
await p.getByRole("button", { name: "توليد التقرير الختامي الكامل", exact: true }).click();
const popup = await popupPromise;

await popup
  .locator("[role=status], [role=alert]")
  .filter({ hasText: /جاهز:|تعذر إنشاء الملف/ })
  .waitFor({ timeout: 90000 });
console.log(await popup.locator("[role=status], [role=alert]").innerText());
const result = await popup.evaluate(() => {
  const pages = [...document.querySelectorAll(".fp-page")];
  return {
    count: pages.length,
    overflow: [...document.querySelectorAll(".fp-body")].filter(
      (e) => e.scrollHeight > e.clientHeight + 1,
    ).length,
    toc: [...document.querySelectorAll("[data-toc]")].every((a) => {
      const target = document.getElementById(a.getAttribute("href").slice(1));
      return Number(a.querySelector("strong").textContent) === pages.indexOf(target) + 1;
    }),
    footer: pages.every((page, i) =>
      page.querySelector(".fp-footer").textContent.includes(`صفحة ${i + 1} من ${pages.length}`),
    ),
    text: document.body.innerText,
    criteria: document.querySelectorAll("[id^=fp-criterion-]").length,
    images: [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  };
});
assert(result.count > 25, "Content grows beyond fixed page limit");
assert.equal(result.overflow, 0);
assert(result.toc);
assert(result.footer);
assert.equal(result.criteria, 11);
assert(result.images);
assert(result.text.includes("نهاية المقدمة"));
assert(!result.text.includes("SECRET-PHONE"));
assert(result.text.includes("<img src=x onerror=alert(1)>"));
assert.equal(await popup.locator(".fp-course").count(), 26);
assert.equal(await popup.locator(".fp-course img").count(), 2);
assert.equal(await popup.locator(".sr-photos img").count(), 1);
assert.equal(certificateReads, 0, "Preparing the portfolio never fetches certificate documents");
assert.equal(
  await popup.locator(".fp-report-sheet").count(),
  1,
  "A one-page approved report stays on one page",
);
assert.equal(await popup.locator(".fp-report-sheet .fp-header .fp-report-qr").count(), 0);
assert.equal(await popup.locator(".fp-report-sheet .sr-header .fp-report-qr").count(), 1);
assert(
  (await popup.locator(".fp-report-sheet .fp-header").innerText()).includes(s.criteria[3].name),
);
const qrPixels = await popup.locator(".fp-report-qr img,.fp-course-qr img").evaluateAll((images) =>
  images.map((img) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const x = canvas.getContext("2d");
    x.drawImage(img, 0, 0);
    return {
      width: canvas.width,
      height: canvas.height,
      data: Array.from(x.getImageData(0, 0, canvas.width, canvas.height).data),
      url: img.closest("a").href,
    };
  }),
);
for (const qr of qrPixels)
  assert.equal(
    jsQR(Uint8ClampedArray.from(qr.data), qr.width, qr.height)?.data,
    qr.url,
    "QR opens exactly the linked report or certificate",
  );
await popup.emulateMedia({ media: "print" });
await popup.locator("#fp-cover").screenshot({ path: "/tmp/portfolio-print/cover.png" });
await popup.locator("#fp-contents").screenshot({ path: "/tmp/portfolio-print/contents.png" });
await popup.locator("#fp-career").screenshot({ path: "/tmp/portfolio-print/career.png" });
await popup.locator("#fp-criterion-4").screenshot({ path: "/tmp/portfolio-print/criterion.png" });
await popup.locator("#fp-courses").screenshot({ path: "/tmp/portfolio-print/courses.png" });
await popup.emulateMedia({ media: "print" });
const printed = await popup.pdf({
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  path: "/tmp/portfolio-print/native.pdf",
});
const native = await PDFDocument.load(printed);
assert.equal(native.getPageCount(), result.count, "Native print page count matches dynamic TOC");
await popup.emulateMedia({ media: "screen" });
// Generate direct-download PDF at mobile viewport, where earlier report sharing cropped RTL output.
await popup.setViewportSize({ width: 390, height: 844 });
const downloadPromise = popup.waitForEvent("download", { timeout: 180000 });
await popup.locator("#fp-download").click();
const download = await downloadPromise;
await download.saveAs("/tmp/portfolio-print/download.pdf");
const pdf = await PDFDocument.load(readFileSync("/tmp/portfolio-print/download.pdf"));
assert.equal(pdf.getPageCount(), result.count);
assert(pdf.getPages().every((p) => Math.abs(p.getWidth() - 595.28) < 0.1));
assert(
  pdf.getPages().some((p) => p.node.Annots()?.size() > 0),
  "PDF retains clickable links",
);
assert.equal(errors.length, 0, errors.join("\n"));
console.log({
  pages: result.count,
  allCriteria: result.criteria,
  toc: true,
  overflow: result.overflow,
  courseRows: 26,
  certificateQRs: 2,
  certificateReadsDuringPrint: 0,
  longTextPreserved: true,
  privateContactOmitted: true,
  htmlEscaped: true,
  nativePdf: true,
  directMobilePdf: true,
  links: true,
  approvedReportPage: Number(
    await popup.locator(".fp-report-sheet").first().getAttribute("data-page"),
  ),
  errors,
});
// Same snapshot reuses image previews, including across main-page reload.
const before = assetReads;
await p.reload();
await p.waitForFunction(() => !document.querySelector(".gov-print-link").disabled);
const again = p.waitForEvent("popup");
await p.getByRole("button", { name: "توليد التقرير الختامي الكامل", exact: true }).click();
const second = await again;
await second.locator("#fp-download").waitFor({ timeout: 90000 });
assert.equal(assetReads, before, "Reloaded print reuses IndexedDB image preview");
assert.equal(await second.locator("html").getAttribute("data-image-cache-hits"), "1");
sourcePng = await p.evaluate(() => {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 200;
  const x = canvas.getContext("2d");
  x.fillStyle = "#15445a";
  x.fillRect(0, 0, 300, 200);
  return canvas.toDataURL("image/png").split(",")[1];
});
report.assets[0].sha256 = hash(sourcePng);
const beforeChanged = assetReads;
const changedPromise = p.waitForEvent("popup");
await p.getByRole("button", { name: "توليد التقرير الختامي الكامل", exact: true }).click();
const changed = await changedPromise;
await changed.locator("#fp-download").waitFor({ timeout: 90000 });
assert.equal(assetReads, beforeChanged + 1, "Changed SHA invalidates only the altered preview");
report.report.description =
  "وصف طويل " + "ممارسة تعليمية وتغذية راجعة واضحة. ".repeat(250) + " END-LONG-REPORT";
const longPromise = p.waitForEvent("popup");
await p.getByRole("button", { name: "توليد التقرير الختامي الكامل", exact: true }).click();
const long = await longPromise;
await long.locator("#fp-download").waitFor({ timeout: 90000 });
assert(
  (await long.locator(".fp-report-sheet").count()) > 1,
  "Genuinely long approved report continues without truncation",
);
assert((await long.locator("body").innerText()).includes("END-LONG-REPORT"));
assert(
  await long
    .locator(".fp-report-sheet")
    .evaluateAll((pages) =>
      pages.every(
        (p) =>
          p.querySelectorAll(".sr-header .fp-report-qr").length === 1 &&
          !p.querySelector(".fp-header .fp-report-qr") &&
          p.querySelector(".fp-body").scrollHeight <= p.querySelector(".fp-body").clientHeight + 1,
      ),
    ),
);
await p.goto("http://localhost:5173/#courses/certificate/doc-0");
await p.locator(".certificate-view iframe").waitFor();
assert.equal(certificateReads, 1, "Public certificate route fetches only the requested document");
await p.reload();
await p.locator(".certificate-view iframe").waitFor();
assert.equal(certificateReads, 2, "Certificate deep link survives reload");
await p.goto("http://localhost:5173/#courses/certificate/private-doc");
await p.getByRole("alert").filter({ hasText: "غير متاحة للعرض العام" }).waitFor();
assert.equal(certificateReads, 2, "Unlisted document cannot be fetched through public viewer");
console.log({
  qrDecoded: qrPixels.length,
  cacheAcrossReload: true,
  cacheInvalidation: true,
  longReportContinuation: true,
  directCertificateRoute: true,
  unlistedCertificateBlocked: true,
});
await b.close();
