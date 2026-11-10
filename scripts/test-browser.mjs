// Browser contract tests for the simple public portfolio. No production writes.
import { chromium } from "@playwright/test";
import { defaultSettings } from "../src/lib/portfolio/model.ts";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import assert from "node:assert/strict";
mkdirSync("/tmp/portfolio-validation", { recursive: true });
const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
c.setDefaultTimeout(25000);
const p = await c.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const s = structuredClone(defaultSettings);
s.current_period = "p";
s.periods = [{ id: "p", name: "فترة اختبار", archived: false }];
s.schedules = [
  { id: "s", lessons: [{ id: "l", day: 3, period: 1, subject: "انتظار", duty: "انتظار" }] },
];
let revision = 1;
const id = "10000000-0000-4000-8000-000000000001";
await p.goto("http://localhost:5173/");
const png = await p.evaluate(() => {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 480;
  const x = c.getContext("2d");
  x.fillStyle = "#e9f5ef";
  x.fillRect(0, 0, 640, 480);
  x.fillStyle = "#19465b";
  x.font = "32px Arial";
  x.fillText("Original test image", 150, 240);
  return c.toDataURL("image/png").split(",")[1];
});
const sha = createHash("sha256").update(Buffer.from(png, "base64")).digest("hex");
const assets = [1, 2].map((i) => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  name: `test-${i}.png`,
  mime: "image/png",
  sha256: sha,
  size: Buffer.from(png, "base64").length,
}));
const report = {
  id,
  criterion: 4,
  period_id: "p",
  title: "تقرير تعلم فردي للاختبار",
  report: {
    description: "وصف مختصر للممارسة التعليمية من بيانات الاختبار.",
    objectives: ["هدف تعليمي أول", "هدف تعليمي ثان"],
    execution_on: "2026-10-20",
    date_estimated: true,
    audience: "طلاب الثالث الثانوي",
  },
  assets,
  updated_at: new Date().toISOString(),
};
await c.route("**/rest/v1/rpc/portfolio_public_view", (r) =>
  r.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ settings: s, publications: [report], revision }),
  }),
);
await c.route("**/rest/v1/portfolio_public_updates*", (r) =>
  r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ revision }) }),
);
await c.route("**/rest/v1/rpc/portfolio_report_asset", (r) =>
  r.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ name: "test.png", mime: "image/png", sha256: sha, base64: png }),
  }),
);
await p.reload();
await p.waitForSelector(".folio-report-card");
let checks = 0;
const ok = (v, label) => {
  assert.ok(v, label);
  checks++;
  console.log("PASS", label);
};
ok((await p.locator(".folio-header nav a").count()) === 4, "Four public navigation links only");
ok(
  !(await p.locator("body").innerText()).includes("مكتبة الشواهد"),
  "No separate evidence library in public navigation",
);
await p.getByRole("button", { name: "جميع العناصر", exact: true }).click();
await p.waitForSelector(".folio-criterion");
ok((await p.locator(".folio-criterion").count()) === 11, "All eleven elements are visible");
ok(
  (await p.locator(".folio-criterion").nth(3).innerText()).includes("1 تقارير"),
  "Report count is calculated under its primary element",
);
await p.locator(".folio-criterion").nth(3).click();
const card = p.locator(".folio-report-card");
ok(
  (await card.locator("h3").isVisible()) && (await card.locator("h3").innerText()) === report.title,
  "Card displays the report title",
);
ok(
  (await card.locator(".frc-date").innerText()).includes("2026-10-20") &&
    (await card.locator(".frc-date").innerText()).includes("تقديري"),
  "Card displays the execution date and its estimated label",
);
ok(
  (await card.locator(".frc-summary").innerText()) === report.report.description,
  "Card displays the saved report summary",
);
ok(
  await card.locator(".frc-photo").evaluate((el) => {
    const frame = el.getBoundingClientRect();
    const photo = el.querySelector("img").getBoundingClientRect();
    const body = el.nextElementSibling.getBoundingClientRect();
    return photo.bottom <= frame.bottom + 1 && photo.bottom <= body.top + 1;
  }),
  "Preview image stays inside its frame and does not cover card information",
);
const cardPdfPromise = c.waitForEvent("page");
await card.getByRole("button", { name: "تحميل PDF", exact: true }).click({ noWaitAfter: true });
const cardPdf = await cardPdfPromise;
await cardPdf.waitForSelector(".simple-report");
await cardPdf.waitForFunction(
  () =>
    document.querySelectorAll(".sr-photos img").length === 2 &&
    [...document.images].every((i) => i.complete && i.naturalWidth),
);
ok(
  (await cardPdf.locator(".sr-title").innerText()) === report.title &&
    (await cardPdf.locator(".sr-photos img").count()) === 2,
  "Card PDF includes report information and both images",
);
ok(p.url().endsWith("#criteria/4"), "Card PDF preserves the element page");
await cardPdf.close();
await p.setViewportSize({ width: 390, height: 844 });
ok(
  (await card.locator("h3").isVisible()) &&
    (await card.locator(".frc-summary").isVisible()) &&
    (await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)),
  "Card information and actions fit the iPhone viewport",
);
await p.setViewportSize({ width: 1440, height: 1000 });
await card.getByRole("button", { name: "عرض التقرير كاملًا", exact: true }).click();
await p.waitForFunction(
  () =>
    document.querySelectorAll(".sr-photos img").length === 2 &&
    [...document.querySelectorAll(".sr-photos img")].every((i) => i.complete && i.naturalWidth),
);
ok(
  (await p.locator(".sr-three").innerText()).includes("تقديري"),
  "Estimated date is labelled in the report",
);
ok((await p.locator(".sr-photos img").count()) === 2, "Both original images are inside the report");
ok(
  !(await p.locator(".report-pages").innerText()).includes("حالة البيانات"),
  "No workflow/status clutter in the report",
);
async function containedReportBoxes(page, label) {
  const violations = await page.evaluate(() =>
    [...document.querySelectorAll(".simple-report .sr-box")].flatMap((box) => {
      const rect = box.getBoundingClientRect();
      const nodes = [...box.querySelectorAll(".sr-label,p,li")];
      return nodes
        .filter((node) => {
          const r = node.getBoundingClientRect();
          return (
            r.left < rect.left + 3 ||
            r.right > rect.right - 3 ||
            r.top < rect.top + 3 ||
            r.bottom > rect.bottom - 3
          );
        })
        .map((n) => n.textContent);
    }),
  );
  ok(violations.length === 0, `${label}: all labels and text stay inside their boxes`);
}
await containedReportBoxes(p, "Desktop");
const promise = c.waitForEvent("page");
await p.getByRole("button", { name: "تحميل PDF", exact: true }).click({ noWaitAfter: true });
const pop = await promise;
await pop.waitForSelector(".simple-report");
await pop.evaluate(async () => {
  await Promise.race([
    document.fonts.load("16px Tajawal"),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Font load timed out")), 8000)),
  ]);
  await Promise.race([
    Promise.all([...document.images].map((i) => i.decode())),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Image decode timed out")), 8000)),
  ]);
  return true;
});
await pop.emulateMedia({ media: "print" });
await containedReportBoxes(pop, "A4 print");
ok((await pop.locator(".simple-report").count()) === 1, "Short report uses a single A4 document");
await pop.pdf({
  path: "/tmp/portfolio-validation/simple-report.pdf",
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await pop.close();
await p.setViewportSize({ width: 390, height: 844 });
await containedReportBoxes(p, "iPhone");
ok(
  await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  "Report fits the iPhone viewport",
);
await p.getByRole("button", { name: "العودة إلى عنصر الأداء" }).click();
await p.getByRole("button", { name: "فتح القائمة" }).click();
await p.getByRole("link", { name: "الجدول المدرسي", exact: true }).first().click();
await p.getByRole("button", { name: "الأربعاء", exact: true }).click();
ok(
  (await p.locator(".folio-daily").innerText()).includes("انتظار"),
  "Timetable is readable by day on mobile",
);
await p.getByRole("button", { name: "فتح القائمة" }).click();
await p.getByRole("link", { name: "الرئيسية", exact: true }).first().click();
await p.screenshot({ path: "/tmp/portfolio-validation/simple-home-mobile.png", fullPage: true });
report.title = "تقرير محدث مباشرة";
revision = 2;
await p.waitForFunction(
  () => document.querySelector(".folio")?.getAttribute("data-revision") === "2",
  {},
  { timeout: 22000 },
);
ok(
  (await p.locator(".folio-report-card").innerText()).includes("محدث مباشرة"),
  "Open page receives a content update without reload (polling fallback)",
);
ok(errors.length === 0, "No browser runtime errors");
await b.close();
console.log(`${checks} public portfolio browser checks passed.`);
