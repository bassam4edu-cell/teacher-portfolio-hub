/** Local browser fixtures only: no database writes. */
import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { defaultSettings } from "../src/lib/portfolio/model.ts";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const settings = structuredClone(defaultSettings);
const image =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1cAAAAASUVORK5CYII=";
const sha = createHash("sha256").update(Buffer.from(image, "base64")).digest("hex");
let reports = Array.from({ length: 3 }, (_, i) => ({
  id: `00000000-0000-4000-8000-00000000000${i + 1}`,
  title: `تقرير تعليمي ${i + 1}`,
  criterion: 4,
  period_id: settings.current_period,
  updated_at: "2026-11-01",
  report: {
    description: "شرح الممارسة التعليمية.",
    objectives: ["تنمية التعلم"],
    execution_on: "2026-11-01",
  },
  assets: [{ id: `asset-${i}`, name: "شاهد الاختبار", mime: "image/png", sha256: sha, size: 68 }],
}));
await context.route("**/rest/v1/rpc/portfolio_public_documents", (r) => r.fulfill({ json: [] }));
await context.route("**/rest/v1/rpc/portfolio_public_view", (route) =>
  route.fulfill({ json: { settings, publications: reports, revision: 1 } }),
);
await context.route("**/rest/v1/portfolio_public_updates*", (route) =>
  route.fulfill({ json: { revision: 1 } }),
);
await context.route("**/rest/v1/rpc/portfolio_report_asset", (route) =>
  route.fulfill({ json: { name: "شاهد الاختبار", mime: "image/png", sha256: sha, base64: image } }),
);
const base = process.env.TEST_BASE_URL || "http://localhost:5173";
const counter = () => page.locator(".classroom-counter").innerText();
async function releaseInteraction() {
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.activeElement?.blur());
}
try {
  await page.goto(base);
  await page.locator(".classroom-gallery").scrollIntoViewIfNeeded();
  await page.locator('.classroom-slide[aria-hidden="false"] img').waitFor();
  assert.equal(await page.locator(".classroom-slide").count(), 3);
  assert.equal(await page.locator('.classroom-slide[aria-hidden="false"]').count(), 1);
  assert.equal(await counter(), "01 / 03");
  await releaseInteraction();
  await page.waitForTimeout(5600);
  assert.equal(await counter(), "02 / 03", "autoplay after five seconds");
  await page.locator(".classroom-viewport").hover();
  const frozen = await counter();
  await page.waitForTimeout(5600);
  assert.equal(await counter(), frozen, "hover pauses");
  await releaseInteraction();
  await page.waitForTimeout(5600);
  assert.equal(await counter(), "03 / 03", "leaving resumes");
  await page.waitForTimeout(5600);
  assert.equal(await counter(), "01 / 03", "last loops to first");
  await page.getByRole("button", { name: "إيقاف العرض التلقائي", exact: true }).click();
  await releaseInteraction();
  const paused = await counter();
  await page.waitForTimeout(5600);
  assert.equal(await counter(), paused, "explicit pause persists");
  await page.getByRole("button", { name: "التقرير التالي", exact: true }).click();
  assert.equal(await counter(), "02 / 03");
  await page.getByRole("button", { name: "التقرير السابق", exact: true }).click();
  assert.equal(await counter(), "01 / 03");
  await page.getByRole("button", { name: "التقرير 3: تقرير تعليمي 3", exact: true }).click();
  assert.equal(await counter(), "03 / 03");
  await page.getByRole("button", { name: "التقرير السابق", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  assert.equal(await counter(), "01 / 03", "RTL keyboard advances");
  await page.getByRole("button", { name: "تشغيل العرض التلقائي", exact: true }).click();
  await releaseInteraction();
  await page.waitForTimeout(5600);
  assert.equal(await counter(), "02 / 03", "manual resume");
  await page.getByRole("button", { name: "التقرير السابق", exact: true }).focus();
  const focused = await counter();
  await page.waitForTimeout(5600);
  assert.equal(await counter(), focused, "keyboard focus pauses");
  await releaseInteraction();
  await page.locator(".hero-title-art").scrollIntoViewIfNeeded();
  const outside = await counter();
  await page.waitForTimeout(5600);
  assert.equal(await counter(), outside, "offscreen pauses");
  await page.locator(".classroom-gallery").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "إيقاف العرض التلقائي", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(
    await page
      .locator('.classroom-slide[aria-hidden="false"] img')
      .evaluate((img) => getComputedStyle(img).objectFit),
    "contain",
  );
  await page.locator(".classroom-viewport").scrollIntoViewIfNeeded();
  const box = await page.locator(".classroom-viewport").boundingBox();
  const beforeSwipe = await counter();
  await page.mouse.move(box.x + box.width * 0.75, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.15, box.y + 100, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  assert.notEqual(await counter(), beforeSwipe, "swipe navigates");
  await page.locator('.classroom-slide[aria-hidden="false"] .classroom-open').click();
  await page.waitForURL(/#criteria\/4\/report\//);
  assert(await page.locator(".simple-report").count());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(base);
  await page.locator(".classroom-gallery").scrollIntoViewIfNeeded();
  assert.equal(await page.locator(".classroom-playback button").count(), 0);
  await releaseInteraction();
  const reduced = await counter();
  await page.waitForTimeout(5600);
  assert.equal(await counter(), reduced, "reduced motion disables autoplay");
  reports = reports.map((r) => ({ ...r, updated_at: "2026-12-01" })).reverse();
  await page.reload();
  await page.locator(".classroom-gallery").waitFor();
  assert.equal(
    await page.locator(".classroom-slide").first().locator("h3").innerText(),
    "تقرير تعليمي 1",
    "updated_at does not reorder",
  );
  reports = reports.slice(0, 1);
  await page.reload();
  await page.locator(".classroom-gallery").waitFor();
  assert.equal(await page.locator(".classroom-controls").count(), 0, "single report is static");
  reports = [];
  await page.reload();
  await page.locator(".home-reference-cover").waitFor();
  assert.equal(await page.locator(".classroom-gallery").count(), 0, "empty gallery omitted");
  assert.deepEqual(errors, []);
  console.log(
    "Gallery: autoplay, hover, loop, pause/resume, focus, offscreen, RTL arrows, dots, swipe, open report, contain, reduced motion, stable order, single and empty passed.",
  );
} finally {
  await browser.close();
}
