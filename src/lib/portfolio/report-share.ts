import reportCss from "@/components/portfolio/simple-report.css?raw";
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
      '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head><body></body></html>',
    );
    doc.close();
    const font = await fetch("/fonts/Tajawal-Regular.ttf");
    if (!font.ok) throw new Error("تعذر تحميل خط التقرير");
    const fontCss = `@font-face{font-family:Tajawal;src:url(${await asDataUrl(await font.blob())}) format('truetype');font-weight:100 900}`;
    const style = doc.createElement("style");
    style.textContent =
      fontCss +
      reportCss +
      "body{margin:0;background:white}.simple-report{width:794px;max-width:none;min-height:1123px;margin:0;border:0}.report-pages{margin:0}";
    doc.head.append(style);
    const clone = source.cloneNode(true) as HTMLElement;
    for (const image of clone.querySelectorAll<HTMLImageElement>("img")) {
      const response = await fetch(image.src);
      if (!response.ok) throw new Error("تعذر تحميل إحدى صور التقرير");
      image.src = await asDataUrl(await response.blob());
      image.removeAttribute("loading");
      image.removeAttribute("srcset");
    }
    doc.body.append(clone);
    await doc.fonts.load("16px Tajawal");
    await doc.fonts.ready;
    await Promise.all([...doc.images].map((image) => image.decode()));
    const pages = [...clone.querySelectorAll<HTMLElement>(".simple-report")];
    if (!pages.length) throw new Error("لا توجد صفحات للتصدير");
    const { toBlob } = await import("html-to-image");
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
      const blob = await toBlob(page, {
        pixelRatio: 2,
        backgroundColor: "#fff",
        fontEmbedCSS: fontCss,
        width: 794,
        height: Math.ceil(page.getBoundingClientRect().height),
        cacheBust: false,
      });
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
