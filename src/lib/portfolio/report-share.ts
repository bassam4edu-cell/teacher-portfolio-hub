import reportCss from "@/components/portfolio/simple-report.css?raw";
import { rasterizeReportImages, rasterizeReportNarrative } from "./report-raster";
export type ReportFormat = "png" | "pdf";
function asDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("تعذر قراءة ملف التقرير"));
    reader.readAsDataURL(blob);
  });
}
/** Render the approved template in an isolated desktop-width document, even on phones. */
export async function createReportFiles(
  source: HTMLElement,
  title: string,
  format: ReportFormat,
): Promise<File[]> {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:900px;height:1400px;border:0;pointer-events:none";
  document.body.append(frame);
  try {
    const doc = frame.contentDocument;
    if (!doc) throw new Error("تعذر تجهيز نسخة المشاركة");
    doc.open();
    doc.write(
      '<!doctype html><html lang="ar" dir="ltr"><head><meta charset="utf-8"></head><body></body></html>',
    );
    doc.close();
    const font = await fetch("/fonts/Tajawal-Regular.ttf");
    if (!font.ok) throw new Error("تعذر تحميل خط التقرير");
    const fontCss = `@font-face{font-family:Tajawal;src:url(${await asDataUrl(await font.blob())}) format('truetype');font-weight:100 900}`;
    const style = doc.createElement("style");
    style.textContent =
      fontCss +
      reportCss +
      "html,body{direction:ltr;margin:0;padding:0;width:794px;min-width:794px;overflow:visible;background:white;scroll-behavior:auto}.simple-report{direction:rtl;position:relative;left:0;right:auto;width:794px;max-width:none;min-height:1123px;margin:0;border:0;transform:none}.report-pages{direction:ltr;width:794px;margin:0;padding:0}";
    doc.head.append(style);
    const clone = source.cloneNode(true) as HTMLElement;
    for (const image of clone.querySelectorAll<HTMLImageElement>("img")) {
      const response = await fetch(image.src);
      if (!response.ok) throw new Error("تعذر تحميل إحدى صور التقرير");
      let imageBlob = await response.blob();
      if (imageBlob.type.includes("svg")) {
        const svgDoc = new DOMParser().parseFromString(await imageBlob.text(), "image/svg+xml");
        const svg = svgDoc.documentElement;
        const viewBox = svg.getAttribute("viewBox")?.split(/[ ,]+/).map(Number);
        if (svg.tagName === "svg" && viewBox?.length === 4 && viewBox[2]! > 0 && viewBox[3]! > 0) {
          // Give Safari a high-resolution intrinsic raster for small vector logos.
          svg.setAttribute("width", String(viewBox[2]! * 10));
          svg.setAttribute("height", String(viewBox[3]! * 10));
          imageBlob = new Blob([new XMLSerializer().serializeToString(svg)], {
            type: "image/svg+xml",
          });
        }
      }
      image.src = await asDataUrl(imageBlob);
      image.removeAttribute("loading");
      image.removeAttribute("srcset");
    }
    doc.body.append(clone);
    await doc.fonts.load("16px Tajawal");
    await doc.fonts.ready;
    await Promise.all(
      [...doc.images].map(async (image) => {
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight)
          throw new Error("تعذر تحميل صورة التقرير كاملة");
      }),
    );
    doc.documentElement.scrollLeft = 0;
    doc.body.scrollLeft = 0;
    // Flatten gradient border layers to bitmaps: Canvas renderers do not reliably
    // support layered background-clip, while the live/print template stays unchanged.
    for (const box of clone.querySelectorAll<HTMLElement>(".sr-box")) {
      const { width, height } = box.getBoundingClientRect();
      const border = doc.createElement("canvas");
      border.width = Math.ceil(width * 2);
      border.height = Math.ceil(height * 2);
      const ctx = border.getContext("2d");
      if (!ctx) throw new Error("تعذر رسم حدود التقرير");
      ctx.scale(2, 2);
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#2989bb");
      gradient.addColorStop(1, "#40b879");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 9);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.roundRect(1.3, 1.3, width - 2.6, height - 2.6, 7.7);
      ctx.fill();
      box.style.background = `url(${border.toDataURL("image/png")}) center / 100% 100% no-repeat border-box`;
      border.width = 0;
      border.height = 0;
    }
    // Keep list bullets on the RTL leading edge, including Safari/Canvas output.
    for (const list of clone.querySelectorAll<HTMLElement>(".sr-narrative ul")) {
      list.style.listStyle = "none";
      list.style.padding = "0";
      for (const item of list.children) {
        const bullet = doc.createElement("span");
        bullet.textContent = "• ";
        bullet.style.cssText = "display:inline-block;width:14px;text-align:right";
        item.prepend(bullet);
      }
    }
    await rasterizeReportImages(doc, clone);
    rasterizeReportNarrative(doc, clone);
    await Promise.all(
      [...clone.querySelectorAll<HTMLImageElement>("img")].map((img) => img.decode()),
    );
    const pages = [...clone.querySelectorAll<HTMLElement>(".simple-report")];
    if (!pages.length) throw new Error("لا توجد صفحات للتصدير");
    const { default: html2canvas } = await import("html2canvas");
    const safeName =
      title
        .replace(/[\\/:*?"<>|]/g, " ")
        .trim()
        .slice(0, 100) || "تقرير";
    const files: File[] = [];
    const pdf = format === "pdf" ? await (await import("pdf-lib")).PDFDocument.create() : null;
    if (pdf) {
      pdf.setTitle(title);
      pdf.setLanguage("ar");
    }
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]!;
      const height = Math.ceil(page.getBoundingClientRect().height);
      if (Math.abs(page.getBoundingClientRect().width - 794) > 1 || page.scrollWidth > 795) {
        throw new Error("تعذر ضبط عرض التقرير. أعد المحاولة قبل المشاركة.");
      }
      // Canvas renderer avoids Safari's SVG foreignObject cropping / missing-image bugs.
      // The viewport is LTR at x=0; only each report's contents use RTL.
      const canvas = await html2canvas(page, {
        scale: 2,
        backgroundColor: "#ffffff",
        width: 794,
        height,
        windowWidth: 900,
        windowHeight: Math.max(1400, height),
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: false,
        allowTaint: false,
        useCORS: false,
        imageTimeout: 20000,
        logging: false,
        onclone: async (clonedDoc) => {
          await clonedDoc.fonts.ready;
          await Promise.all(
            [...clonedDoc.images].map(async (image) => {
              await image.decode();
              if (!image.naturalWidth || !image.naturalHeight)
                throw new Error("إحدى صور التقرير غير مكتملة");
            }),
          );
        },
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      canvas.width = 0;
      canvas.height = 0;
      if (!blob) throw new Error("تعذر إنشاء صورة التقرير");
      if (pdf) {
        const image = await pdf.embedPng(await blob.arrayBuffer());
        const sheet = pdf.addPage([595.28, 841.89]);
        const scale = Math.min(sheet.getWidth() / image.width, sheet.getHeight() / image.height);
        const width = image.width * scale,
          height = image.height * scale;
        sheet.drawImage(image, {
          x: (sheet.getWidth() - width) / 2,
          y: sheet.getHeight() - height,
          width,
          height,
        });
      } else
        files.push(
          new File([blob], `${safeName}${pages.length > 1 ? ` - ${i + 1}` : ""}.png`, {
            type: "image/png",
          }),
        );
    }
    if (pdf)
      files.push(
        new File([new Uint8Array(await pdf.save())], `${safeName}.pdf`, {
          type: "application/pdf",
        }),
      );
    return files;
  } finally {
    frame.remove();
  }
}
