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
s.about = {
  introduction: "مقدمة محفوظة من إعدادات المعلم",
  ethics: "ملخص الميثاق المحفوظ",
  policy: "ملخص السياسة المحفوظ",
  objectives: "هدف الملف الأول\nهدف الملف الثاني",
};
s.vision = "رؤية المعلم المحفوظة";
s.mission = "رسالة المعلم المحفوظة";
s.values = ["الأمانة: ألتزم بالأمانة المهنية واحترام الطلاب في عملي اليومي.", "الإتقان"];
s.teacher.contact = "private-contact@example.test";
s.career = [
  {
    id: "cv-test-degree",
    type: "qualification",
    title: "بكالوريوس اللغة الإنجليزية",
    institution: "جامعة اختبار",
  },
  { id: "cv-test-work", type: "experience", title: "معلم", institution: "وزارة التعليم" },
  {
    id: "cv-test-skill",
    type: "skill",
    title: "تقنيات التعليم",
    description: "استخدام المنصات التعليمية",
  },
  { id: "cv-test-other", type: "course", title: "دورة محفوظة سابقة" },
];
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
ok(
  (await p.locator(".folio-header nav a").count()) === 5,
  "Five public navigation links including courses",
);
ok(
  !(await p.locator("body").innerText()).includes("مكتبة الشواهد"),
  "No separate evidence library in public navigation",
);
ok(
  await p
    .locator("#home-performance")
    .evaluate((el) =>
      Boolean(
        el.compareDocumentPosition(document.querySelector(".home-practices")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    ),
  "Performance criteria precede recent classroom reports",
);
ok(
  (await p.locator(".folio-criterion").first().innerText()).includes(s.criteria[3].name),
  "Criteria with reports are shown first",
);
await p.getByRole("button", { name: "استعراض ملف الإنجاز", exact: true }).click();
ok(
  await p.locator("#home-performance").evaluate((el) => document.activeElement === el),
  "Main action moves reading and keyboard focus to criteria",
);
await p.getByRole("button", { name: "جميع العناصر", exact: true }).click();
await p.waitForSelector(".folio-criterion");
ok((await p.locator(".folio-criterion").count()) === 11, "All eleven elements are visible");
ok(
  (
    await p.locator(".folio-criterion").filter({ hasText: s.criteria[3].name }).innerText()
  ).includes("1 تقارير"),
  "Report count is calculated under its primary element",
);
await p.locator(".folio-criterion").filter({ hasText: s.criteria[3].name }).click();
const card = p.locator(".folio-report-card");
ok(
  (await card.locator("h3").isVisible()) && (await card.locator("h3").innerText()) === report.title,
  "Card displays the report title",
);
ok(
  (await card.locator(".frc-date").innerText()).includes("2026-10-20") &&
    !(await card.locator(".frc-date").innerText()).includes("تقديري"),
  "Card displays the execution date without an estimated label",
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
await card.getByRole("button", { name: "عرض التقرير", exact: true }).click();
await p.waitForFunction(
  () =>
    document.querySelectorAll(".sr-photos img").length === 2 &&
    [...document.querySelectorAll(".sr-photos img")].every((i) => i.complete && i.naturalWidth),
);
ok(
  !(await p.locator(".sr-three").innerText()).includes("تقديري"),
  "Report date omits the estimated label",
);
ok(
  (await p.locator('.sr-box[aria-label="مدة التنفيذ"]').innerText()).includes("حصة دراسية"),
  "Existing and future report templates use one class period",
);
ok(
  (await p.locator('.sr-box[aria-label="المستفيدون"]').innerText()).includes(
    "طلاب الصف الثالث الثانوي",
  ) && !(await p.locator(".simple-report").innerText()).includes("العدد غير محدد"),
  "Report beneficiaries use the agreed grade without a count placeholder",
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
await p.getByRole("link", { name: "عن المعلم", exact: true }).first().click();
await p.getByRole("tab", { name: "المقدمة", exact: true }).waitFor();
ok((await p.getByRole("tab").count()) === 6, "About section has six accessible tabs");
ok(
  (await p.getByRole("tabpanel").innerText()).includes(s.about.introduction),
  "Introduction uses saved owner content",
);
await p.getByRole("tab", { name: "الرؤية والرسالة والقيم", exact: true }).click();
ok(
  (await p.getByRole("tabpanel").innerText()).includes(s.vision) &&
    p.url().endsWith("#about/vision"),
  "Vision tab uses saved content and a direct URL",
);
ok(
  (await p.locator(".about-value-card").count()) === 2 &&
    (await p.locator(".about-value-card").first().locator("h4").innerText()) === "الأمانة" &&
    (await p.locator(".about-value-card").first().locator("p").innerText()).includes(
      "الأمانة المهنية",
    ),
  "Values display separate titles and full descriptions",
);
ok(
  await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  "Detailed values fit the iPhone viewport",
);
await p.getByRole("tab", { name: "ميثاق أخلاقيات مهنة التعليم", exact: true }).click();
ok(
  (await p.getByRole("tabpanel").innerText()).includes(s.about.ethics) &&
    (await p.getByRole("tabpanel").locator('a[href^="https://drive.uqu.edu.sa/"]').count()) === 1,
  "Ethics summary has a source document",
);
await p
  .getByRole("tab", { name: "سياسة التعليم في المملكة العربية السعودية", exact: true })
  .click();
ok(
  (await p.getByRole("tabpanel").locator('a[href^="https://www.moe.gov.sa/"]').count()) === 1,
  "Education policy links to its official source",
);
await p.goBack();
await p.waitForFunction(
  () => document.querySelector('[role="tab"][aria-selected="true"]')?.id === "about-tab-ethics",
);
ok(
  (await p
    .getByRole("tab", { name: "ميثاق أخلاقيات مهنة التعليم", exact: true })
    .getAttribute("aria-selected")) === "true",
  "Browser back restores the previous tab",
);
await p.getByRole("tab", { name: "ميثاق أخلاقيات مهنة التعليم", exact: true }).focus();
await p.keyboard.press("ArrowLeft");
ok(
  (await p
    .getByRole("tab", { name: "سياسة التعليم في المملكة العربية السعودية", exact: true })
    .getAttribute("aria-selected")) === "true",
  "Arrow keys follow RTL tab order",
);
await p.getByRole("tab", { name: "السيرة الذاتية", exact: true }).click();
ok((await p.locator(".cv-highest").count()) === 0, "CV omits an unavailable highest qualification");
ok(
  (await p.locator(".cv-section-qualification").innerText()).includes(
    "بكالوريوس اللغة الإنجليزية",
  ) && (await p.locator(".cv-section-experience").innerText()).includes("وزارة التعليم"),
  "CV groups qualifications and experience from saved data",
);
ok(
  (await p.locator(".cv-section-other").innerText()).includes("دورة محفوظة سابقة"),
  "CV preserves existing career entries with other types",
);
ok(
  !(await p.getByRole("tabpanel").innerText()).includes("private-contact@example.test") &&
    (await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)),
  "CV omits personal contact and fits iPhone",
);
await p.getByRole("tab", { name: "أهداف الملف", exact: true }).click();
ok(
  (await p.locator(".about-objectives li").count()) === 2 &&
    (await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)),
  "Objectives and scrollable tabs fit iPhone without page overflow",
);
await p.screenshot({ path: "/tmp/portfolio-validation/about-mobile.png", fullPage: true });
await p.reload();
await p.getByRole("tabpanel").waitFor();
ok(
  (await p.getByRole("tab", { name: "أهداف الملف", exact: true }).getAttribute("aria-selected")) ===
    "true",
  "Direct tab URL survives reload",
);
await p.emulateMedia({ reducedMotion: "reduce" });
await p.getByRole("tab", { name: "المقدمة", exact: true }).click();
ok(
  await p.locator(".about-panel").evaluate((el) => getComputedStyle(el).animationName === "none"),
  "Reduced motion preference disables panel animation",
);
await p.setViewportSize({ width: 1440, height: 1000 });
await p.screenshot({ path: "/tmp/portfolio-validation/about-desktop.png", fullPage: true });
await p.setViewportSize({ width: 390, height: 844 });
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
