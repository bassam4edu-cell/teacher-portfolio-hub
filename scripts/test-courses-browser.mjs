// Uses synthetic local certificates only; never writes production courses.
import { chromium } from "@playwright/test";
import { defaultSettings } from "../src/lib/portfolio/model.ts";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
mkdirSync("/tmp/portfolio-validation", { recursive: true });
const base = process.env.PORTFOLIO_TEST_URL || "http://localhost:5173";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  ...(process.env.PORTFOLIO_TEST_URL
    ? { proxy: { server: process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY } }
    : {}),
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const fixture = await context.newPage();
  await fixture.setContent(
    '<div style="break-after:page">Synthetic certificate page one</div><div>Synthetic certificate page two</div>',
  );
  const pdf = await fixture.pdf({ format: "A4" });
  await fixture.close();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
    "base64",
  );
  const assets = [
    { id: "60000000-0000-4000-8000-000000000001", mime: "application/pdf", bytes: pdf },
    { id: "60000000-0000-4000-8000-000000000002", mime: "image/png", bytes: png },
  ];
  for (const a of assets) {
    a.sha256 = createHash("sha256").update(a.bytes).digest("hex");
    a.size = a.bytes.length;
  }
  let courses = [
    {
      id: "50000000-0000-4000-8000-000000000001",
      version: 1,
      title: "استراتيجيات تدريس اللغة الإنجليزية",
      provider: "جهة تدريب للاختبار",
      execution_on: "2026-10-20",
      date_label: "20 / 10 / 2026",
      duration_value: 6,
      duration_unit: "hours",
      is_public: true,
      archived: false,
      document: assets[0],
    },
    {
      id: "50000000-0000-4000-8000-000000000002",
      version: 1,
      title: "تقنيات التعلم",
      provider: "جهة تدريب أخرى",
      execution_on: "2026-09-10",
      duration_value: 2,
      duration_unit: "days",
      is_public: true,
      archived: false,
      document: assets[1],
    },
    {
      id: "50000000-0000-4000-8000-000000000003",
      version: 1,
      title: "دورة بمدة غير محددة",
      provider: null,
      execution_on: null,
      duration_value: null,
      duration_unit: null,
      is_public: true,
      archived: false,
      document: null,
    },
  ];
  await context.route("**/rest/v1/rpc/portfolio_public_view", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ settings: defaultSettings, publications: [], revision: 1 }),
    }),
  );
  await context.route("**/rest/v1/portfolio_public_updates*", (r) =>
    r.fulfill({ contentType: "application/json", body: '[{"revision":1}]' }),
  );
  await context.route("**/rest/v1/rpc/portfolio_courses_view", (r) =>
    r.fulfill({ contentType: "application/json", body: JSON.stringify(courses) }),
  );
  await context.route("**/rest/v1/rpc/portfolio_course_document", (r) => {
    const id = r.request().postDataJSON().p_id;
    const a = assets.find((a) => a.id === id);
    return r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        name: "شهادة الدورة",
        mime: a.mime,
        sha256: a.sha256,
        base64: a.bytes.toString("base64"),
      }),
    });
  });
  let checks = 0;
  function ok(value, label) {
    assert.ok(value, label);
    checks++;
    console.log("PASS", label);
  }
  await page.goto(base + "/#courses");
  await page.locator(".course-card").first().waitFor();
  ok(
    (await page.locator(".course-card").count()) === 3,
    "All saved courses appear on the standalone page",
  );
  const stats = await page.locator(".courses-stats").innerText();
  ok(
    stats.includes("6") && stats.includes("2") && !stats.includes("22"),
    "Hours and days remain separate in totals",
  );
  ok(
    (await page.locator(".course-card").last().innerText()).includes("المدة غير محددة"),
    "Unknown durations are not invented",
  );
  const viewPromise = context.waitForEvent("page");
  await page
    .locator(".course-card")
    .nth(1)
    .getByRole("button", { name: "عرض الشهادة", exact: true })
    .click();
  const viewed = await viewPromise;
  await viewed.waitForFunction(() => document.querySelector("img")?.naturalWidth > 0);
  ok(
    (await viewed.locator("a[download]").count()) === 1,
    "Certificate can be viewed and downloaded",
  );
  await viewed.close();
  ok(
    (await page.locator(".course-date").first().innerText()).includes("20/10/2026"),
    "Course dates use numeric day/month/year",
  );
  await page.getByLabel("ترتيب الدورات").selectOption("oldest");
  ok(
    (await page.locator(".course-card h2").first().innerText()) === "تقنيات التعلم",
    "Oldest-first ordering updates the reader view",
  );
  ok(
    (await page.locator(".course-card").last().innerText()).includes("التاريخ غير محدد"),
    "Undated courses remain last in either order",
  );
  await page.getByRole("checkbox", { name: "إرفاق الشهادات في صفحات تالية" }).check();
  const popupPromise = context.waitForEvent("page");
  await page.getByRole("button", { name: "طباعة تقرير الدورات", exact: true }).click();
  const popup = await popupPromise;
  const popupErrors = [];
  popup.on("pageerror", (e) => popupErrors.push(e.message));
  await popup.locator(".course-print-report").waitFor({ timeout: 60000 });
  await popup.waitForFunction(
    () =>
      document.images.length === 3 &&
      [...document.images].every((i) => i.complete && i.naturalWidth),
  );
  ok(
    (await popup.locator("tbody tr").count()) === 3,
    "Arabic print report lists every course and duration",
  );
  ok(
    (await popup.locator(".course-certificate").count()) === 3,
    "Every PDF page and image certificate is attached to the report",
  );
  ok(
    (await popup.locator("tbody tr").first().innerText()).includes("تقنيات التعلم") &&
      (await popup.locator("tbody tr").first().innerText()).includes("10/09/2026"),
    "Printed table follows selected order and numeric dates",
  );
  ok(
    (await popup.locator(".course-certificate h2").first().innerText()) === "تقنيات التعلم",
    "Certificate attachments follow the selected order",
  );
  await popup.emulateMedia({ media: "print" });
  await popup.pdf({
    path: "/tmp/portfolio-validation/courses-report.pdf",
    format: "A4",
    preferCSSPageSize: true,
    printBackground: true,
  });
  const info = execFileSync("pdfinfo", ["/tmp/portfolio-validation/courses-report.pdf"], {
    encoding: "utf8",
  });
  ok(/Pages:\s+4/.test(info), "Combined report prints as four complete A4 pages");
  await popup.screenshot({ path: "/tmp/portfolio-validation/courses-print.png", fullPage: true });
  await popup.close();
  const singlePromise = context.waitForEvent("page");
  await page
    .locator(".course-card")
    .last()
    .getByRole("button", { name: "طباعة التقرير", exact: true })
    .click();
  const single = await singlePromise;
  await single.locator(".course-print-report").waitFor();
  ok(
    (await single.locator("tbody tr").count()) === 1,
    "Single-course report is available without a certificate",
  );
  await single.close();
  await page.setViewportSize({ width: 390, height: 844 });
  ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Course page and actions fit iPhone",
  );
  await page.screenshot({ path: "/tmp/portfolio-validation/courses-mobile.png", fullPage: true });
  await page.reload();
  await page.locator(".course-card").first().waitFor();
  ok(
    (await page.locator(".course-card").count()) === 3,
    "Course records remain visible after reload",
  );
  courses = [];
  await page.reload();
  await page.locator(".courses-empty").waitFor();
  ok(
    (await page.locator(".course-card").count()) === 0 &&
      !(await page.getByRole("button", { name: "طباعة تقرير الدورات", exact: true }).count()),
    "Empty portfolio does not invent courses or offer a fake report",
  );
  ok(
    errors.length === 0 && popupErrors.length === 0,
    "Course view and export have no runtime errors",
  );
  console.log(`${checks} course browser checks passed.`);
} finally {
  await browser.close();
}
