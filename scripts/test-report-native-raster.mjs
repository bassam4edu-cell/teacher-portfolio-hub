/** Native Arabic shaping, SVG mask and contain geometry in the actual shared PNG. */
import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const logoReference =
  "data:image/png;base64," +
  readFileSync(new URL("./fixtures/moe-white-share-reference.png", import.meta.url)).toString(
    "base64",
  );
const engine = process.env.TEST_BROWSER === "webkit" ? webkit : chromium;
const browser = await engine.launch({
  headless: true,
  ...(engine === chromium ? { args: ["--no-sandbox"] } : {}),
  ...(process.env.WEBKIT_EXECUTABLE_PATH
    ? { executablePath: process.env.WEBKIT_EXECUTABLE_PATH }
    : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await page.goto(process.env.TEST_BASE_URL || "http://localhost:5173");
  const result = await page.evaluate(async (logoReference) => {
    const font = new FontFace(
      "Tajawal",
      await (await fetch("/fonts/Tajawal-Regular.ttf")).arrayBuffer(),
    );
    await font.load();
    document.fonts.add(font);
    const text = "تعزيز التعلم الذاتي مع Mega Goal 3";
    const host = document.createElement("div");
    host.innerHTML =
      '<article class="simple-report"><div class="sr-narrative"><p style="position:absolute;left:20px;top:80px;width:600px;height:40px;font:24px Tajawal;line-height:40px;text-align:right;direction:rtl;white-space:nowrap"></p></div><div style="position:absolute;left:20px;top:160px;width:160px;height:120px;background:#15445a"><img class="test-logo" src="/brand/moe-white.svg" style="display:block;width:160px;height:120px;object-fit:contain"></div><img class="test-portrait" style="position:absolute;left:240px;top:160px;display:block;width:200px;height:100px;object-fit:contain"></article>';
    host.querySelector("p").innerHTML = 'تعزيز التعلم الذاتي مع <bdi dir="ltr">Mega Goal 3</bdi>';
    const portrait = document.createElement("canvas");
    portrait.width = 100;
    portrait.height = 200;
    portrait.getContext("2d").fillStyle = "#ff0000";
    portrait.getContext("2d").fillRect(0, 0, 100, 200);
    host.querySelector(".test-portrait").src = portrait.toDataURL();
    const { createReportFiles } = await import("/src/lib/portfolio/report-share.ts");
    const [file] = await createReportFiles(host, "اختبار سلامة الرسم", "png");
    const rendered = new Image();
    const url = URL.createObjectURL(file);
    rendered.src = url;
    await rendered.decode();
    const actual = document.createElement("canvas");
    actual.width = rendered.width;
    actual.height = rendered.height;
    const ac = actual.getContext("2d");
    ac.drawImage(rendered, 0, 0);
    URL.revokeObjectURL(url);
    const expected = document.createElement("canvas");
    expected.width = 1200;
    expected.height = 100;
    const ec = expected.getContext("2d");
    ec.scale(2, 2);
    ec.font = "24px Tajawal";
    ec.direction = "rtl";
    ec.textAlign = "right";
    ec.fillStyle = "#37414a";
    ec.fillText(text, 600, 35);
    function mask(ctx, x, y, w, h, kind) {
      const data = ctx.getImageData(x, y, w, h).data;
      let minX = w,
        minY = h,
        maxX = -1,
        maxY = -1;
      const test = (i) =>
        kind === "dark"
          ? data[i + 3] > 100 && data[i] < 170 && data[i + 1] < 170 && data[i + 2] < 170
          : kind === "white"
            ? data[i] > 220 && data[i + 1] > 220 && data[i + 2] > 220
            : data[i] > 220 && data[i + 1] < 30 && data[i + 2] < 30;
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++)
          if (test((j * w + i) * 4)) {
            minX = Math.min(minX, i);
            maxX = Math.max(maxX, i);
            minY = Math.min(minY, j);
            maxY = Math.max(maxY, j);
          }
      const pixels = new Set();
      for (let j = minY; j <= maxY; j++)
        for (let i = minX; i <= maxX; i++)
          if (test((j * w + i) * 4)) pixels.add(`${i - minX},${j - minY}`);
      return { pixels, width: maxX - minX + 1, height: maxY - minY + 1, minX, minY };
    }
    function overlap(a, b) {
      let best = 0;
      for (let dx = -2; dx <= 2; dx++)
        for (let dy = -2; dy <= 2; dy++) {
          let intersection = 0;
          for (const point of a.pixels) {
            const [x, y] = point.split(",").map(Number);
            if (b.pixels.has(`${x + dx},${y + dy}`)) intersection++;
          }
          best = Math.max(best, intersection / (a.pixels.size + b.pixels.size - intersection));
        }
      return best;
    }
    const textScore = overlap(
      mask(ac, 40, 160, 1200, 80, "dark"),
      mask(ec, 0, 0, 1200, 100, "dark"),
    );
    const logo = new Image();
    logo.src = logoReference;
    await logo.decode();
    const reference = document.createElement("canvas");
    reference.width = 320;
    reference.height = 240;
    const lc = reference.getContext("2d");
    lc.fillStyle = "#15445a";
    lc.fillRect(0, 0, 320, 240);
    const ratio = Math.min(320 / logo.naturalWidth, 240 / logo.naturalHeight);
    lc.drawImage(
      logo,
      (320 - logo.naturalWidth * ratio) / 2,
      (240 - logo.naturalHeight * ratio) / 2,
      logo.naturalWidth * ratio,
      logo.naturalHeight * ratio,
    );
    const logoScore = overlap(
      mask(ac, 40, 320, 320, 240, "white"),
      mask(lc, 0, 0, 320, 240, "white"),
    );
    const red = mask(ac, 480, 320, 400, 200, "red");
    return {
      textScore,
      logoScore,
      portrait: { width: red.width, height: red.height, left: red.minX },
      originalText: host.querySelector("p").textContent,
      iframeCount: document.querySelectorAll("iframe").length,
    };
  }, logoReference);
  assert(result.textScore > 0.85, `Arabic shape differs from native browser: ${result.textScore}`);
  assert(result.logoScore > 0.85, `SVG mask differs from native browser: ${result.logoScore}`);
  assert(
    Math.abs(result.portrait.width - 100) < 3 &&
      Math.abs(result.portrait.height - 200) < 3 &&
      Math.abs(result.portrait.left - 150) < 3,
    "portrait was stretched or cropped",
  );
  assert.equal(result.originalText, "تعزيز التعلم الذاتي مع Mega Goal 3");
  assert.equal(result.iframeCount, 0);
  console.log(engine.name(), result);
} finally {
  await browser.close();
}
