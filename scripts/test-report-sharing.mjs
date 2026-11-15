/** Requires the local Vite server. TEST_BROWSER=webkit optionally exercises Safari's engine. */
import { chromium, webkit } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
const engine = process.env.TEST_BROWSER === "webkit" ? webkit : chromium;
const browser = await engine.launch({
  headless: true,
  ...(process.env.WEBKIT_EXECUTABLE_PATH
    ? { executablePath: process.env.WEBKIT_EXECUTABLE_PATH }
    : {}),
  ...(engine === chromium ? { args: ["--no-sandbox"] } : {}),
  ...(process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } }
    : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await page.goto(process.env.TEST_BASE_URL || "http://localhost:5173");
  const result = await page.evaluate(async () => {
    const { createReportFiles } = await import("/src/lib/portfolio/report-share.ts");
    const photo = document.createElement("canvas");
    photo.width = 200;
    photo.height = 200;
    const ctx = photo.getContext("2d");
    ctx.fillStyle = "#00bb00";
    ctx.fillRect(0, 0, 200, 200);
    const host = document.createElement("div");
    for (let i = 0; i < 2; i++) {
      const sheet = document.createElement("article");
      sheet.className = "simple-report";
      sheet.dir = "rtl";
      sheet.innerHTML =
        '<div style="direction:ltr;display:flex;justify-content:space-between;height:60px;width:794px"><div style="width:60px;height:60px;background:#ff0000"></div><div style="width:60px;height:60px;background:#0000ff"></div></div><h2>تقرير اختبار العربية</h2>';
      const image = new Image();
      image.src = photo.toDataURL();
      image.style.cssText = "display:block;width:200px;height:200px;margin:100px auto 0";
      sheet.append(image);
      host.append(sheet);
    }
    const files = await createReportFiles(host, "اختبار اكتمال التقرير", "png");
    const image = new Image();
    const url = URL.createObjectURL(files[0]);
    image.src = url;
    await image.decode();
    const probe = document.createElement("canvas");
    probe.width = image.naturalWidth;
    probe.height = image.naturalHeight;
    const pixels = probe.getContext("2d");
    pixels.drawImage(image, 0, 0);
    const pixel = (x, y) => Array.from(pixels.getImageData(x, y, 1, 1).data);
    const left = pixel(20, 20),
      right = pixel(probe.width - 20, 20);
    let green = 0;
    for (let y = 100; y < 1000; y += 4) {
      const rgb = pixel(Math.floor(probe.width / 2), y);
      if (rgb[1] > 140 && rgb[0] < 30 && rgb[2] < 30) green++;
    }
    URL.revokeObjectURL(url);
    const pdf = await createReportFiles(host, "اختبار اكتمال التقرير", "pdf");
    const broken = host.cloneNode(true);
    broken.querySelector("img").src = "data:image/png;base64,broken";
    let rejected = false;
    try {
      await createReportFiles(broken, "صورة غير مكتملة", "png");
    } catch {
      rejected = true;
    }
    return {
      count: files.length,
      width: probe.width,
      height: probe.height,
      left,
      right,
      green,
      rejected,
      pdf: Array.from(new Uint8Array(await pdf[0].arrayBuffer())),
    };
  });
  if (result.count !== 2 || result.width !== 1588 || result.height < 2246)
    throw Error("Incorrect exported page dimensions/count");
  if (result.left[0] < 240 || result.left[2] > 20 || result.right[2] < 240 || result.right[0] > 20)
    throw Error("An RTL page edge was cropped or shifted");
  if (result.green < 40) throw Error("Embedded image is missing");
  if (!result.rejected) throw Error("Broken image did not prevent export");
  if ((await PDFDocument.load(new Uint8Array(result.pdf))).getPageCount() !== 2)
    throw Error("PDF lost pages");
  console.log(
    `${engine.name()}: full RTL edges, image pixels, two PNGs, two PDF pages and broken-image rejection passed`,
  );
} finally {
  await browser.close();
}
