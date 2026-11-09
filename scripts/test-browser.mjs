// UI/network contract tests with a mocked Supabase service, never production writes.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
const artifactDir = "/tmp/portfolio-validation";
mkdirSync(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
context.setDefaultTimeout(20000);
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const { defaultSettings: publicDefaults } = await import("../src/lib/portfolio/model.ts");
await context.route("**/rest/v1/rpc/portfolio_public_view", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ settings: publicDefaults, evidence: [], attachments: [] }),
  }),
);
await page.goto("http://localhost:5173/");
await page.waitForSelector(".cover");
const settings = await page.evaluate(async () =>
  structuredClone((await import("/src/lib/portfolio/model.ts")).defaultSettings),
);
settings.current_period = "test-period";
settings.periods = [{ id: "test-period", name: "فترة اختبار معزولة", archived: false }];
settings.targets = [1, 2, 3].map((i) => ({
  id: `test-target-${i}`,
  criterion: 4,
  period_id: "test-period",
  title: `مستهدف اختبار ${i}`,
}));
settings.schedules = [
  {
    id: "test-schedule",
    effective_on: "2026-01-01",
    lessons: [
      {
        id: "l1",
        day: 0,
        period: 1,
        subject: "اللغة الإنجليزية",
        grade: "الثالث الثانوي",
        duty: "تدريس",
      },
      {
        id: "l2",
        day: 1,
        period: 2,
        subject: "اللغة الإنجليزية",
        grade: "الثالث الثانوي",
        duty: "تدريس",
      },
    ],
  },
];
const evidence = [],
  attachments = [],
  reviews = [],
  originals = {},
  imports = new Map();
let settingsVersion = 1;
const uid = "00000000-0000-4000-8000-000000000001";
const user = {
  id: uid,
  aud: "authenticated",
  role: "authenticated",
  email: "owner@example.test",
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: new Date().toISOString(),
};
const token = [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(
    JSON.stringify({ sub: uid, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 7200 }),
  ).toString("base64url"),
  "test-signature",
].join(".");
await context.route("**/auth/v1/**", async (route) => {
  const path = new URL(route.request().url()).pathname;
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(
      path.endsWith("/user")
        ? user
        : {
            access_token: token,
            token_type: "bearer",
            expires_in: 7200,
            expires_at: Math.floor(Date.now() / 1000) + 7200,
            refresh_token: "isolated-test-token",
            user,
          },
    ),
  });
});
await context.route("**/rest/v1/**", async (route) => {
  const request = route.request(),
    url = new URL(request.url()),
    table = url.pathname.split("/").at(-1);
  let result;
  if (url.pathname.includes("/rpc/")) {
    const p = request.postDataJSON() ?? {};
    if (table === "portfolio_is_owner") result = true;
    else if (table === "portfolio_import") {
      const pack = p.p_package;
      if (imports.has(pack.request_id))
        result = { ...imports.get(pack.request_id), duplicate: true };
      else if (pack.operation === "create") {
        const item = {
          ...pack.evidence,
          id: crypto.randomUUID(),
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        evidence.unshift(item);
        result = { id: item.id, version: 1 };
        for (const a of pack.attachments ?? []) {
          const id = crypto.randomUUID();
          attachments.push({
            id,
            evidence_id: item.id,
            purpose: "evidence",
            path: `integration/${item.id}/${a.sha256}`,
            name: a.name,
            mime: a.mime,
            sha256: a.sha256,
            size: Buffer.from(a.base64, "base64").length,
          });
          originals[id] = a.base64;
        }
        imports.set(pack.request_id, result);
      } else if (pack.operation === "settings") {
        Object.assign(settings, pack.data);
        settingsVersion++;
        result = { saved: true };
        imports.set(pack.request_id, result);
      } else {
        result = {};
      }
    } else result = [];
  } else if (table === "portfolio_settings")
    result = {
      id: true,
      data: settings,
      version: settingsVersion,
      updated_at: new Date().toISOString(),
    };
  else if (table === "portfolio_evidence") result = evidence;
  else if (table === "portfolio_attachments") result = attachments;
  else if (table === "portfolio_reviews") result = reviews;
  else if (table === "portfolio_originals") {
    const id = url.searchParams.get("attachment_id")?.replace("eq.", "");
    result = { content_base64: originals[id] };
  } else result = [];
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(result),
  });
});
let checks = 0;
function ok(value, label) {
  assert.ok(value, label);
  checks++;
  console.log("PASS", label);
}
await page.getByRole("button", { name: "الدخول", exact: true }).click();
await page.getByLabel("البريد الإلكتروني", { exact: true }).fill("owner@example.test");
await page.getByLabel("كلمة المرور", { exact: true }).fill("isolated-password");
await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
await page.getByRole("link", { name: "استقبال الشواهد" }).waitFor();
await page.locator(".stats-grid").waitFor();
ok(await page.locator(".stats-grid").isVisible(), "Owner dashboard loads real returned metrics");
await page.getByRole("button", { name: "استعراض الشواهد", exact: true }).click();
await page.getByRole("button", { name: "إضافة شاهد", exact: true }).click();
const dialog = page.getByRole("dialog");
await dialog
  .getByLabel("العنوان", { exact: true })
  .fill("شاهد اختبار الواجهة — ليس إنجازًا فعليًا");
await dialog.getByLabel("نوع الشاهد", { exact: true }).selectOption("strategy");
await dialog.getByLabel("الشاهد المستهدف", { exact: true }).selectOption("test-target-1");
for (const [label, value] of [
  ["سبب التصنيف", "تصنيف بيانات اختبار للعنصر الرابع"],
  ["الهدف", "هدف لاختبار حفظ التقرير"],
  ["وصف الممارسة", "محتوى اختبار آلي معزول ".repeat(200)],
  ["مصدر المعلومات", "اختبار محلي — لا يمثل ممارسة المعلم"],
])
  await dialog.getByLabel(label, { exact: true }).fill(value);
await dialog.getByLabel("حالة اكتمال البيانات", { exact: true }).selectOption("complete");
const png = await page.evaluate(() => {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 500;
  const x = c.getContext("2d");
  x.fillStyle = "#eef5f1";
  x.fillRect(0, 0, 900, 500);
  x.fillStyle = "#175a48";
  x.font = "48px Tajawal";
  x.direction = "rtl";
  x.fillText("صورة اختبار للأصل المحفوظ", 800, 250);
  return c.toDataURL("image/png").split(",")[1];
});
await dialog.getByLabel("إضافة أصول الصور والمرفقات").setInputFiles({
  name: "isolated-original.png",
  mimeType: "image/png",
  buffer: Buffer.from(png, "base64"),
});
await dialog.getByRole("button", { name: "حفظ الشاهد والنسخة" }).click();
await dialog.waitFor({ state: "hidden" });
ok(evidence.length === 1 && attachments.length === 1, "Witness and original sent in one package");
await page.reload();
await page.waitForSelector(".evidence-card");
ok(
  (await page.locator(".evidence-card").count()) === 1,
  "Stored witness remains after page reload",
);
await page.locator(".evidence-card").click();
await page.waitForSelector(".report-preview");
await page.waitForFunction(() =>
  Array.from(document.querySelectorAll(".report-preview img")).every(
    (i) => i.complete && i.naturalWidth > 0,
  ),
);
ok(
  await page
    .locator(".report-preview")
    .innerText()
    .then((t) => t.includes("تاريخ التنفيذ غير محدد")),
  "Unknown execution date remains explicitly unknown",
);
await page.screenshot({ path: `${artifactDir}/evidence-desktop.png`, fullPage: true });
const popupPromise = context.waitForEvent("page");
await page.getByRole("button", { name: "التقرير PDF / طباعة" }).click({ noWaitAfter: true });
const popup = await popupPromise;
await popup.waitForSelector(".export-page").catch(async (e) => {
  console.log("POPUP", await popup.locator("body").innerText(), "ERRORS", errors);
  throw e;
});
await popup.waitForFunction(() =>
  Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0),
);
await popup.evaluate(async () => {
  await document.fonts.load("16px Tajawal");
  return true;
});
const layout = await popup.evaluate(() => ({
  pages: document.querySelectorAll(".export-page").length,
  overflow: Array.from(document.querySelectorAll(".export-body")).some(
    (b) => b.scrollHeight > b.clientHeight + 2,
  ),
  photos: Array.from(document.querySelectorAll("img")).map((i) => ({
    w: i.naturalWidth,
    h: i.naturalHeight,
  })),
}));
ok(
  layout.pages >= 3 && !layout.overflow,
  "Long Arabic text paginates across A4 pages without clipping",
);
ok(
  layout.photos[0].w === 900 && layout.photos[0].h === 500,
  "Report preserves original image dimensions and aspect ratio",
);
await popup.pdf({
  path: `${artifactDir}/arabic-report.pdf`,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await popup.screenshot({ path: `${artifactDir}/report-page.png`, fullPage: false });
await popup.close();
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "صور التقرير PNG" }).click();
const download = await downloadPromise;
await download.saveAs(`${artifactDir}/report-page.png`);
ok(
  readFileSync(`${artifactDir}/report-page.png`).subarray(1, 4).toString() === "PNG",
  "PNG export produces a real image file",
);
await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await page.waitForSelector(".report-preview");
await page.waitForFunction(
  () => document.querySelector(".sidebar").getBoundingClientRect().left >= innerWidth - 1,
);
ok(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  "Evidence detail fits iPhone viewport without horizontal overflow",
);
await page.getByRole("button", { name: "فتح القائمة" }).click();
await page.getByRole("link", { name: "الرئيسية", exact: true }).click();
await page.waitForSelector(".cover");
await page.waitForFunction(
  () => document.querySelector(".sidebar").getBoundingClientRect().left >= innerWidth - 1,
);
await page.screenshot({ path: `${artifactDir}/home-iphone.png`, fullPage: true });
ok(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  "Home fits iPhone viewport without horizontal overflow",
);
await page.getByRole("button", { name: "فتح القائمة" }).click();
await page.getByRole("link", { name: "الجدول المدرسي", exact: true }).click();
await page.waitForSelector(".schedule-mobile");
ok(await page.locator(".schedule-mobile").isVisible(), "Timetable switches to mobile day view");
await page.getByRole("button", { name: "فتح القائمة" }).click();
await page.getByRole("link", { name: "الرئيسية", exact: true }).click();
await page.setViewportSize({ width: 1440, height: 1000 });
await page.screenshot({ path: `${artifactDir}/home-desktop.png`, fullPage: true });
ok(errors.length === 0, `No browser runtime errors: ${errors.join("; ")}`);
console.log(`\n${checks} local browser checks passed. Mocked backend only; production unchanged.`);
await browser.close();
