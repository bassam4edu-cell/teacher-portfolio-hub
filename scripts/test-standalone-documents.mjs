/** Controlled fixtures only; no database writes. Original PDF bytes must survive open/download. */
import { chromium } from "@playwright/test";
import { PDFDocument, rgb } from "pdf-lib";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { defaultSettings } from "../src/lib/portfolio/model.ts";
const pdf = await PDFDocument.create();
pdf
  .addPage([842, 595])
  .drawRectangle({ x: 50, y: 50, width: 200, height: 200, color: rgb(0, 1, 0) });
pdf
  .addPage([842, 595])
  .drawRectangle({ x: 50, y: 50, width: 200, height: 200, color: rgb(1, 0, 0) });
const bytes = Buffer.from(await pdf.save());
const sha = createHash("sha256").update(bytes).digest("hex");
const settings = structuredClone(defaultSettings);
settings.current_period = "1448-term-1";
const document = {
  id: "00000000-0000-4000-8000-000000000006",
  title: "توزيع المنهج — وثيقة اختبار",
  criterion: 6,
  period_id: settings.current_period,
  asset_id: "00000000-0000-4000-8000-000000000060",
  name: "توزيع المنهج.pdf",
  mime: "application/pdf",
  sha256: sha,
  size: bytes.length,
  pages: 2,
};
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let corrupt = false;
await context.route("**/rest/v1/rpc/**", (r) => {
  const name = r.request().url().split("/").at(-1);
  return r.fulfill({
    json:
      name === "portfolio_public_view"
        ? { settings, publications: [], revision: 1 }
        : name === "portfolio_public_documents"
          ? [document]
          : name === "portfolio_public_document"
            ? {
                name: document.name,
                mime: document.mime,
                sha256: sha,
                base64: (corrupt ? Buffer.from("bad PDF") : bytes).toString("base64"),
              }
            : [],
  });
});
const base = process.env.TEST_BASE_URL || "http://localhost:5173";
try {
  await page.goto(base + "/#criteria/6");
  const card = page.locator(".criterion-document-card");
  await card.waitFor();
  const preview = card.locator(".document-file-preview img");
  await preview.waitFor();
  await preview.evaluate((img) => img.decode());
  const pixels = await preview.evaluate((img) => {
    const canvas = window.document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let green = 0,
      red = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 60 && data[i + 1] > 180 && data[i + 2] < 60) green++;
      if (data[i] > 180 && data[i + 1] < 60 && data[i + 2] < 60) red++;
    }
    return { green, red, fit: getComputedStyle(img).objectFit, width: img.naturalWidth };
  });
  assert(pixels.green > 1000 && pixels.red === 0, "Preview must show page one, not another page");
  assert.equal(pixels.fit, "contain");
  assert(pixels.width > 800);

  assert.equal(await page.locator(".folio-report-card,.simple-report").count(), 0);
  assert.equal(await card.locator("h3").innerText(), document.title);
  assert.equal(await page.getByText("لم يُضف تقرير لهذا العنصر بعد", { exact: true }).count(), 0);
  const event = page.waitForEvent("download");
  await card.getByRole("button", { name: "تنزيل الأصل", exact: true }).click();
  const download = await event;
  assert.equal(
    createHash("sha256")
      .update(readFileSync(await download.path()))
      .digest("hex"),
    sha,
  );
  const popup = context.waitForEvent("page");
  await card.getByRole("button", { name: "فتح الملف", exact: true }).click();
  const view = await popup;
  const opened = await view.waitForEvent("download");
  assert.equal(
    createHash("sha256")
      .update(readFileSync(await opened.path()))
      .digest("hex"),
    sha,
  );
  if (!view.isClosed()) await view.close();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(
    await card.locator(".document-file-preview").evaluate((el) => getComputedStyle(el).flexBasis),
    "100%",
  );
  corrupt = true;
  await card.getByRole("button", { name: "تنزيل الأصل", exact: true }).click();
  await card.getByRole("alert").waitFor();
  assert((await card.getByRole("alert").innerText()).includes("تعذر التحقق"));
  assert.equal(
    await card.getByRole("button", { name: "تنزيل الأصل", exact: true }).isEnabled(),
    true,
  );
  await page.goto(base + "/#criteria/1");
  await page.locator(".criterion-page").waitFor();
  assert.equal(await page.locator(".criterion-document-card").count(), 0);
  await page.goto(base + "/#criteria");
  await page.locator(".criterion-tile").first().waitFor();
  assert(
    (
      await page
        .locator(".criterion-tile")
        .filter({ hasText: "إعداد وتنفيذ خطة التعلم" })
        .innerText()
    ).includes("1 شاهد"),
  );
  assert.deepEqual(errors, []);
  console.log(
    "Standalone documents: page-one preview pixels, contain, mobile preview, original bytes, open, download, separate counts, no activity template, criterion scoping and corruption rejection passed.",
  );
} finally {
  await browser.close();
}
