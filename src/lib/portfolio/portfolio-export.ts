import { loadSimplePortfolio, publicReportAsset, errorText } from "./api";
import { loadCourses, courseDocument } from "./courses";
import type { Settings } from "./model";
import {
  portfolioSections,
  escapePrint,
  type DocumentSection,
  type DocumentBlock,
  type DocumentMedia,
} from "./portfolio-document";
import { createPrintProgress } from "./print-progress";
import css from "@/components/portfolio/portfolio-print.css?raw";
const e = escapePrint;

/** Pre-opened by the click handler so mobile browsers preserve the user gesture. */
export async function generatePortfolioReport(win: Window, onBusyChange?: (busy: boolean) => void) {
  onBusyChange?.(true);
  const doc = win.document;
  doc.open();
  doc.write(
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ملف الإنجاز المهني والتعليمي</title></head><body><p role="status">جارٍ قراءة بيانات الملف…</p></body></html>',
  );
  doc.close();
  const base = doc.createElement("base");
  base.href = window.location.origin + "/";
  doc.head.append(base);
  const progress = createPrintProgress(doc);
  const status = (message: string) => {
    if (win.closed) throw Error("أُغلقت نافذة التقرير.");
    const node = doc.querySelector("[role=status]");
    if (node) node.textContent = message;
  };
  try {
    const paths = [
      "/fonts/Tajawal-Regular.ttf",
      "/brand/moe-white.svg",
      "/brand/moe-color.png",
      "/brand/cover-arabesque.svg",
    ];
    let resourcesDone = 0;
    const embedded = new Map(
      await Promise.all(
        paths.map(async (path) => {
          const data = await embeddedAsset(path);
          progress.update((++resourcesDone * 8) / paths.length, "تجهيز موارد تصميم الملف…", 0);
          return [path, data] as const;
        }),
      ),
    );
    const style = doc.createElement("style");
    style.textContent = css
      .replace(
        /url\(["']?\/fonts\/Tajawal-Regular\.ttf["']?\)/,
        `url("${embedded.get(paths[0]!)}")`,
      )
      .replace(
        /url\(["']?\/brand\/cover-arabesque\.svg["']?\)/g,
        `url("${embedded.get(paths[3]!)}")`,
      );
    doc.head.append(style);
    let readsDone = 0;
    const readDone = () => progress.update(8 + ++readsDone * 4, "قراءة بيانات الملف والدورات…", 0);
    const [data, courses] = await Promise.all([
      loadSimplePortfolio().then((value) => {
        readDone();
        return value;
      }),
      loadCourses().then((value) => {
        readDone();
        return value;
      }),
    ]);
    const s = data.settings,
      media: DocumentMedia = { reports: {}, courses: {} };
    let failures = 0;
    // Read public display files only: private originals and database permissions stay untouched.
    const assets = [
      ...new Map(data.publications.flatMap((r) => r.assets).map((a) => [a.id, a])).values(),
    ].filter((a) => a.mime.startsWith("image/"));
    for (const [i, a] of assets.entries()) {
      progress.update(
        16 + (i * 24) / assets.length,
        `تجهيز صورة الشاهد ${i + 1} من ${assets.length}…`,
        1,
      );
      let url = "";
      try {
        url = await publicReportAsset(a.id);
        media.reports[a.id] = await imagePreview(url, 1200);
      } catch {
        failures++;
      } finally {
        if (url) URL.revokeObjectURL(url);
      }
      progress.update(
        16 + ((i + 1) * 24) / assets.length,
        `اكتمل تجهيز ${i + 1} من ${assets.length} صور شواهد`,
        1,
      );
    }
    progress.update(40, "تجهيز شهادات الدورات…", 2);
    const documented = courses.filter((course) => course.document);
    for (const [i, c] of documented.entries()) {
      progress.update(
        40 + (i * 40) / documented.length,
        `تجهيز الشهادة ${i + 1} من ${documented.length}…`,
        2,
      );
      try {
        media.courses[c.id] = await certificatePreview(await courseDocument(c.document!.id));
      } catch {
        failures++;
      }
      progress.update(
        40 + ((i + 1) * 40) / documented.length,
        `اكتمل تجهيز ${i + 1} من ${documented.length} شهادة`,
        2,
      );
    }
    progress.update(80, "تنسيق صفحات A4 والفهرس…", 3);
    const toolbar = doc.createElement("div");
    toolbar.className = "fp-toolbar";
    toolbar.innerHTML =
      '<button id="fp-download" type="button">تنزيل PDF الكامل</button><button id="fp-print" type="button">طباعة / حفظ PDF من المتصفح</button><span role="status" aria-live="polite"></span>';
    const host = doc.createElement("main");
    host.className = "fp-document";
    toolbar.style.visibility = "hidden";
    toolbar.inert = true;
    host.style.visibility = "hidden";
    host.inert = true;
    host.setAttribute("aria-hidden", "true");
    doc.body.append(toolbar, host);
    progress.update(80, "تحميل الخط العربي…", 3);
    await doc.fonts.load("16px PortfolioPrint");
    progress.update(84, "ترقيم صفحات الملف…", 3);
    const sections = portfolioSections(
      s,
      data.publications,
      courses,
      media,
      window.location.origin,
    );
    await paginatePortfolio(doc, host, s, sections, (done, total) => {
      progress.update(84 + (10 * done) / total, `تنسيق القسم ${done} من ${total}…`, 3);
    });
    for (const img of doc.images) {
      const data = embedded.get(img.getAttribute("src") ?? "");
      if (data) img.src = data;
    }
    const images = [...doc.images];
    let decoded = 0;
    await Promise.all(
      images.map(async (img) => {
        await img.decode();
        progress.update(
          94 + (5 * ++decoded) / images.length,
          "التحقق من الصور والفهرس النهائي…",
          3,
        );
      }),
    );
    const pages = [...host.querySelectorAll<HTMLElement>(".fp-page")];
    const warning = failures
      ? ` · تعذر تحميل ${failures} معاينة؛ تظهر أماكنها وروابطها في الملف.`
      : "";
    toolbar.querySelector("[role=status]")!.textContent = `جاهز: ${pages.length} صفحة${warning}`;
    if (failures) toolbar.querySelector("[role=status]")?.classList.add("fp-warning");
    doc.getElementById("fp-print")!.onclick = () => win.print();
    const download = doc.getElementById("fp-download") as HTMLButtonElement;
    download.onclick = async () => {
      download.disabled = true;
      try {
        await downloadPortfolioPdf(win, pages, (n) =>
          status(`توليد PDF: صفحة ${n} من ${pages.length}…`),
        );
        status(`تم تنزيل ${pages.length} صفحة${warning}`);
      } catch (err) {
        status(`تعذر تنزيل PDF: ${errorText(err)}. يمكنك استخدام طباعة / حفظ PDF من المتصفح.`);
      } finally {
        download.disabled = false;
      }
    };
    await progress.finish(pages.length, warning);
    toolbar.style.visibility = "visible";
    toolbar.inert = false;
    host.style.visibility = "visible";
    host.inert = false;
    host.removeAttribute("aria-hidden");
    download.focus({ preventScroll: true });
    return { window: win, pages: pages.length, previewFailures: failures };
  } catch (err) {
    if (!win.closed) {
      doc.querySelector(".fp-document")?.remove();
      doc.querySelector(".fp-toolbar")?.remove();
      progress.fail(errorText(err), () => generatePortfolioReport(win, onBusyChange));
    }
    throw err;
  } finally {
    onBusyChange?.(false);
  }
}

function makePage(
  doc: Document,
  host: HTMLElement,
  s: Settings,
  title: string,
  cover = false,
  id?: string,
) {
  const page = doc.createElement("article");
  page.className = `fp-page${cover ? " fp-cover fp-section-cover" : ""}`;
  if (id) page.id = id;
  if (cover) {
    page.innerHTML = `<img class="fp-cover-logo" src="/brand/moe-white.svg" alt="وزارة التعليم"><div class="fp-cover-identity">المملكة العربية السعودية — وزارة التعليم<br>${e(s.teacher.administration)}</div><div class="fp-cover-main"><h1>${e(title)}</h1><span class="fp-cover-rule"></span></div>`;
  } else {
    page.innerHTML = `<header class="fp-header"><img src="/brand/moe-color.png" alt="وزارة التعليم"><span>ملف الإنجاز المهني — ${e(s.teacher.name)}</span></header><div class="fp-body"><h2>${e(title)}</h2></div>`;
  }
  const footer = doc.createElement("footer");
  footer.className = "fp-footer";
  page.append(footer);
  host.append(page);
  return page;
}
function blockNode(doc: Document, block: DocumentBlock) {
  const node = doc.createElement("div");
  node.className = "fp-block";
  if (block.text !== undefined) {
    const p = doc.createElement("p");
    p.className = "fp-text";
    p.textContent = block.text;
    node.append(p);
  } else node.innerHTML = block.html;
  return node;
}
function fits(body: HTMLElement) {
  return body.scrollHeight <= body.clientHeight + 1;
}
export async function paginatePortfolio(
  doc: Document,
  host: HTMLElement,
  s: Settings,
  sections: DocumentSection[],
  onSection?: (done: number, total: number) => void,
) {
  const cover = makePage(doc, host, s, "ملف الإنجاز المهني والتعليمي", true, "fp-cover");
  cover.classList.remove("fp-section-cover");
  const current = s.periods.find((p) => p.id === s.current_period)?.name || s.current_period;
  cover
    .querySelector(".fp-cover-main")!
    .insertAdjacentHTML(
      "beforeend",
      `<h2>${e(s.teacher.name)}</h2><p>معلم ${e(s.teacher.subject)}</p><p>${e(s.teacher.school)}</p>`,
    );
  cover
    .querySelector(".fp-footer")!
    .insertAdjacentHTML(
      "beforebegin",
      `<div class="fp-cover-meta"><strong>${e(current)}</strong><span>ملف شخصي يوثق الممارسات والتطوير المهني</span></div>`,
    );
  const starts = new Map<string, HTMLElement>();
  const toc: DocumentSection = {
    id: "contents",
    title: "فهرس المحتويات",
    blocks: sections.map((section) => ({
      html: `<a class="fp-toc-row" href="#fp-${e(section.id)}" data-toc="${e(section.id)}"><span>${e(section.title)}${section.cover ? " — غلاف القسم" : ""}</span><strong>000</strong></a>`,
    })),
  };
  for (const [sectionIndex, section] of [toc, ...sections].entries()) {
    let page = makePage(doc, host, s, section.title, section.cover, `fp-${section.id}`);
    starts.set(section.id, page);
    if (section.cover) {
      page
        .querySelector(".fp-cover-main")!
        .insertAdjacentHTML("beforeend", `<p>${e(section.subtitle ?? "")}</p>`);
      page
        .querySelector(".fp-footer")!
        .insertAdjacentHTML(
          "beforebegin",
          `<div class="fp-cover-meta">${e(s.teacher.name)}<br>${e(s.teacher.school)}</div>`,
        );
      onSection?.(sectionIndex + 1, sections.length + 1);
      continue;
    }
    let body = page.querySelector<HTMLElement>(".fp-body")!;
    const next = () => {
      page = makePage(doc, host, s, section.title + " — تابع");
      body = page.querySelector<HTMLElement>(".fp-body")!;
    };
    for (const block of section.blocks) {
      let node = blockNode(doc, block);
      body.append(node);
      await Promise.all([...node.querySelectorAll("img")].map((img) => img.decode()));
      if (fits(body)) continue;
      const blockHeight = node.getBoundingClientRect().height;
      node.remove();
      // Move intact cards to a fresh page first; split only genuinely long prose.
      const bodyStyle = doc.defaultView!.getComputedStyle(body);
      const title = body.querySelector("h2")!;
      const capacity =
        body.clientHeight -
        parseFloat(bodyStyle.paddingTop) -
        parseFloat(bodyStyle.paddingBottom) -
        title.getBoundingClientRect().height -
        34;
      if (body.children.length > 1 && (block.text === undefined || blockHeight <= capacity)) {
        next();
        body.append(node);
        if (fits(body)) continue;
        node.remove();
      }
      if (block.text === undefined)
        throw Error(`تعذر احتواء بطاقة في صفحة «${section.title}». لم يُقتطع المحتوى.`);
      let words = block.text.split(/\s+/);
      while (words.length) {
        let lo = 0,
          hi = words.length;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          node = blockNode(doc, { html: "", text: words.slice(0, mid).join(" ") });
          body.append(node);
          const ok = fits(body);
          node.remove();
          if (ok) lo = mid;
          else hi = mid - 1;
        }
        if (!lo) throw Error(`تعذر تقسيم نص في صفحة «${section.title}».`);
        body.append(blockNode(doc, { html: "", text: words.slice(0, lo).join(" ") }));
        words = words.slice(lo);
        if (words.length) next();
      }
    }
    onSection?.(sectionIndex + 1, sections.length + 1);
  }
  const pages = [...host.querySelectorAll<HTMLElement>(".fp-page")];
  for (const anchor of host.querySelectorAll<HTMLElement>("[data-toc]")) {
    const target = starts.get(anchor.dataset["toc"]!);
    anchor.querySelector("strong")!.textContent = String(pages.indexOf(target!) + 1);
  }
  pages.forEach((page, index) => {
    page.dataset["page"] = String(index + 1);
    page.querySelector(".fp-footer")!.innerHTML =
      `<span>ملف الإنجاز الإلكتروني للمعلم ${e(s.teacher.name)}</span><span>صفحة ${index + 1} من ${pages.length}</span>`;
  });
  return pages;
}
async function embeddedAsset(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) throw Error("تعذر تحميل أحد موارد تصميم التقرير.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(Error("تعذر تجهيز مورد التقرير."));
    reader.readAsDataURL(blob);
  });
}

async function imagePreview(url: string, width: number) {
  const image = new Image();
  image.src = url;
  await image.decode();
  const scale = Math.min(1, width / image.naturalWidth, 1200 / image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}
async function certificatePreview(blob: Blob) {
  if (blob.type !== "application/pdf") {
    const url = URL.createObjectURL(blob);
    try {
      return await imagePreview(url, 600);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(1.5, 600 / base.width) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    await task.destroy();
  }
}
export async function downloadPortfolioPdf(
  win: Window,
  pages: HTMLElement[],
  progress: (n: number) => void,
) {
  const [{ default: html2canvas }, { PDFDocument, PDFName, PDFString }] = await Promise.all([
    import("html2canvas"),
    import("pdf-lib"),
  ]);
  const pdf = await PDFDocument.create();
  pdf.setTitle("ملف الإنجاز المهني والتعليمي");
  pdf.setProducer("Teacher portfolio");
  const pdfPages = pages.map(() => pdf.addPage([595.28, 841.89]));
  for (const [index, page] of pages.entries()) {
    if (win.closed) throw Error("أُغلقت نافذة التقرير.");
    progress(index + 1);
    const canvas = await html2canvas(page, {
      scale: 2,
      backgroundColor: "#ffffff",
      width: 794,
      height: 1123,
      windowWidth: 1000,
      windowHeight: 1300,
      scrollX: 0,
      scrollY: 0,
      logging: false,
      useCORS: true,
    });
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(Error("تعذر تجهيز الصفحة"))),
        "image/jpeg",
        0.92,
      ),
    );
    const image = await pdf.embedJpg(await blob.arrayBuffer());
    const target = pdfPages[index]!;
    target.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
    canvas.width = 0;
    canvas.height = 0;
    const rect = page.getBoundingClientRect();
    for (const anchor of page.querySelectorAll<HTMLAnchorElement>("a[href]")) {
      const local = anchor.getAttribute("href")?.startsWith("#");
      const destination = local
        ? pages.findIndex((p) => p.id === anchor.getAttribute("href")!.slice(1))
        : -1;
      for (const box of anchor.getClientRects()) {
        const x = ((box.left - rect.left) * 595.28) / rect.width,
          y = 841.89 - ((box.bottom - rect.top) * 841.89) / rect.height;
        const annotation = pdf.context.obj({
          Type: "Annot",
          Subtype: "Link",
          Rect: [
            x,
            y,
            x + (box.width * 595.28) / rect.width,
            y + (box.height * 841.89) / rect.height,
          ],
          Border: [0, 0, 0],
          ...(destination >= 0
            ? { Dest: [pdfPages[destination]!.ref, PDFName.of("Fit")] }
            : { A: { S: PDFName.of("URI"), URI: PDFString.of(anchor.href) } }),
        });
        target.node.addAnnot(pdf.context.register(annotation));
      }
    }
  }
  const bytes = await pdf.save();
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  const a = win.document.createElement("a");
  a.href = url;
  a.download = "ملف الإنجاز المهني والتعليمي.pdf";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
