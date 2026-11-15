// Deterministic UI lifecycle checks; no production writes.
import { chromium } from "@playwright/test";
import { defaultSettings } from "../src/lib/portfolio/model.ts";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
mkdirSync("/tmp/print-progress", { recursive: true });
const b = await chromium.launch({ args: ["--no-sandbox"] });
const c = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await c.newPage();
const settings = structuredClone(defaultSettings);
settings.current_period = "1448-term-1";
settings.periods = [
  { id: settings.current_period, name: "1448هـ — الفصل الدراسي الأول", archived: false },
];
let hold, release;
let fail = false;
await c.route("**/rest/v1/rpc/**", async (route) => {
  const endpoint = route.request().url().split("/").at(-1);
  if (endpoint === "portfolio_public_view" && fail)
    return route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "تعذر قراءة بيانات الاختبار" }),
    });
  if (endpoint === "portfolio_courses_view" && hold) await hold;
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(
      endpoint === "portfolio_public_view" ? { settings, publications: [], revision: 1 } : [],
    ),
  });
});
await p.goto("http://localhost:5173/");
await p.waitForFunction(
  () =>
    document.querySelector(".gov-print-link") &&
    !document.querySelector(".gov-print-link").disabled,
);
hold = new Promise((r) => (release = r));
// Hold only the real ready-state display interval so its screenshot cannot race removal.
await p.evaluate(() => {
  window.__originalSetTimeout = window.setTimeout;
  window.setTimeout = (fn, ms, ...args) =>
    window.__originalSetTimeout(fn, ms === 500 ? 5000 : ms, ...args);
});
const promise = p.waitForEvent("popup");
await p.getByRole("button", { name: "توليد التقرير الختامي الكامل", exact: true }).click();
const popup = await promise;
await popup.getByRole("progressbar").waitFor();
await popup.evaluate(() => {
  window.__progress = [];
  const screen = document.querySelector(".fp-progress-screen");
  const record = () =>
    window.__progress.push(
      Number(screen.querySelector("[aria-valuenow]")?.getAttribute("aria-valuenow")),
    );
  record();
  new MutationObserver(record).observe(screen, {
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-valuenow"],
  });
});
await popup.waitForFunction(
  () => Number(document.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow")) === 12,
);
const paused = await popup.getByRole("progressbar").getAttribute("aria-valuenow");
await popup.waitForTimeout(500);
assert.equal(
  await popup.getByRole("progressbar").getAttribute("aria-valuenow"),
  paused,
  "Progress cannot advance while work is held",
);
assert(await p.locator(".gov-print-link").isDisabled());
await popup.screenshot({ path: "/tmp/print-progress/desktop.png" });
await popup.setViewportSize({ width: 390, height: 844 });
assert(!(await popup.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
await popup.screenshot({ path: "/tmp/print-progress/mobile.png" });
await popup.setViewportSize({ width: 320, height: 740 });
assert(!(await popup.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
await popup.screenshot({ path: "/tmp/print-progress/mobile-320.png" });
await popup.emulateMedia({ reducedMotion: "reduce" });
assert.equal(
  await popup.locator(".fp-progress-symbol").evaluate((el) => getComputedStyle(el).animationName),
  "none",
);
await popup.screenshot({ path: "/tmp/print-progress/reduced-motion.png" });
await popup.emulateMedia({ reducedMotion: "no-preference" });
release();
hold = null;
await popup.waitForFunction(
  () => document.querySelector(".fp-progress-screen")?.dataset.state === "complete",
);
assert.equal(await popup.getByRole("progressbar").getAttribute("aria-valuenow"), "100");
assert(
  !(await popup.evaluate(() => document.documentElement.scrollWidth > innerWidth)),
  "A4 staging must not shift the mobile progress viewport",
);
await popup.screenshot({ path: "/tmp/print-progress/complete.png", animations: "disabled" });
await popup.locator(".fp-progress-screen").waitFor({ state: "detached" });
await p.evaluate(() => {
  window.setTimeout = window.__originalSetTimeout;
});
assert(await popup.locator("#fp-download").isVisible());
assert(await popup.locator(".fp-document").isVisible());
const history = await popup.evaluate(() => window.__progress);
assert(history.every((n, i) => n >= 0 && n <= 100 && (i === 0 || n >= history[i - 1])));
assert(history.includes(100));
await p.waitForFunction(() => !document.querySelector(".gov-print-link").disabled);
// Fatal reads expose recovery; retry reuses the popup and owns the original busy state.
fail = true;
const errPromise = p.waitForEvent("popup");
await p.getByRole("button", { name: "توليد التقرير الختامي الكامل", exact: true }).click();
const err = await errPromise;
await err.getByRole("button", { name: "إعادة المحاولة", exact: true }).waitFor();
assert.equal(await err.getByRole("progressbar").count(), 0);
assert(!(await err.locator(".fp-progress-number").isVisible()));
await err.screenshot({ path: "/tmp/print-progress/error.png" });
fail = false;
hold = new Promise((r) => (release = r));
await err.getByRole("button", { name: "إعادة المحاولة", exact: true }).click();
await err.getByRole("progressbar").waitFor();
assert(await p.locator(".gov-print-link").isDisabled());
release();
hold = null;
await err.locator(".fp-progress-screen").waitFor({ state: "detached" });
assert(await err.locator("#fp-download").isVisible());
console.log({
  pausedPercent: paused,
  noTimerAdvance: true,
  monotonic: true,
  reaches100OnlyWhenReady: true,
  automaticReveal: true,
  retry: true,
  busyDuringRetry: true,
  reducedMotion: true,
  widths: [1440, 390, 320],
  emptyAttachments: true,
});
await b.close();
