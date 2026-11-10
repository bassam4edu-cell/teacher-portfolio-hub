import reportCss from "@/components/portfolio/simple-report.css?raw";
export async function printSimpleReport(report: HTMLElement, title: string, targetWindow?: Window) {
  const win = targetWindow ?? window.open("", "_blank");
  if (!win) throw new Error("اسمح بفتح نافذة التقرير لحفظ PDF.");
  win.document.open();
  win.document.write(
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head><body></body></html>',
  );
  win.document.close();
  win.document.title = title;
  try {
    const response = await fetch("/fonts/Tajawal-Regular.ttf");
    if (!response.ok) throw new Error("تعذر تحميل الخط");
    const bytes = new Uint8Array(await response.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 8192)
      bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const style = win.document.createElement("style");
    style.textContent =
      `@font-face{font-family:Tajawal;src:url(data:font/ttf;base64,${btoa(bin)}) format('truetype')}*{box-sizing:border-box}body{margin:0;background:#eef3f5;font-family:Tajawal,Arial,sans-serif} .print-toolbar{text-align:center;padding:16px;background:white;position:sticky;top:0;z-index:5}.print-toolbar button{padding:10px 30px;background:#19465b;color:white;border:0;border-radius:8px;font:inherit;cursor:pointer}@media print{.print-toolbar{display:none}}` +
      reportCss;
    const base = win.document.createElement("base");
    base.href = window.location.origin + "/";
    win.document.head.append(base, style);
    const bar = win.document.createElement("div");
    bar.className = "print-toolbar";
    const button = win.document.createElement("button");
    button.textContent = "حفظ PDF / طباعة";
    button.onclick = () => win.print();
    bar.append(button);
    const clone = report.cloneNode(true) as HTMLElement;
    const sourceImages = [...report.querySelectorAll<HTMLImageElement>("img")];
    const clonedImages = [...clone.querySelectorAll<HTMLImageElement>("img")];
    await Promise.all(
      sourceImages.map(async (image, index) => {
        const response = await fetch(image.currentSrc || image.src);
        if (!response.ok) throw new Error("تعذر تجهيز صورة التقرير");
        const blob = await response.blob();
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        clonedImages[index]!.src = data;
      }),
    );
    win.document.body.append(bar, clone);
    await win.document.fonts.load("16px Tajawal");
    await Promise.all([...win.document.images].map((img) => img.decode()));
    return win;
  } catch (err) {
    win.document.body.textContent = String(err);
    throw err;
  }
}
