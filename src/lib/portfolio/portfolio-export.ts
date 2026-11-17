import { loadSimplePortfolio, publicReportAsset, errorText } from "./api";
import { loadCourses } from "./courses";
import type { Settings } from "./model";
import {
  portfolioSections,
  escapePrint,
  type DocumentSection,
  type DocumentBlock,
  type DocumentMedia,
} from "./portfolio-document";
import { createPrintProgress } from "./print-progress";
import { cachedPublicPreview, mapPrintTasks } from "./print-cache";
import { printQr, publicCertificateLink, publicReportLink, publicDocumentLink } from "./print-qr";
import {
  approvedPrintCss,
  approvedReportNodes,
  approvedReportPieces,
} from "./approved-report-print";
import designCss from "@/components/portfolio/portfolio-print-design.css?raw";
import css from "@/components/portfolio/portfolio-print.css?raw";
const e = escapePrint;

/** Pre-opened by the click handler so mobile browsers preserve the user gesture. */
export async function generatePortfolioReport(win: Window, onBusyChange?: (busy: boolean) => void) {
  const started = performance.now();
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
    style.textContent += approvedPrintCss() + designCss;
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
      media: DocumentMedia = {
        reports: {},
        courses: {},
        reportCodes: {},
        documentCodes: {},
        brand: Object.fromEntries(embedded),
      };
    let failures = 0;
    // Read public display files only: private originals and database permissions stay untouched.
    const assets = [
      ...new Map(data.publications.flatMap((r) => r.assets).map((a) => [a.id, a])).values(),
    ].filter((a) => a.mime.startsWith("image/"));
    let processedImages = 0,
      cacheHits = 0;
    await mapPrintTasks(
      assets,
      async (a) => {
        try {
          const result = await cachedPublicPreview(
            `image-v2:1200:${a.id}:${a.sha256}`,
            async () => {
              const url = await publicReportAsset(a.id);
              try {
                return await imagePreview(url, 1200);
              } finally {
                URL.revokeObjectURL(url);
              }
            },
          );
          media.reports[a.id] = result.value;
          if (result.hit) cacheHits++;
        } catch {
          failures++;
        }
        progress.update(
          16 + (24 * ++processedImages) / assets.length,
          `تجهيز صور الشواهد ${processedImages} من ${assets.length}…`,
          1,
        );
      },
      2,
    );
    progress.update(40, "تجهيز رموز الشهادات والتقارير…", 2);
    const documented = courses.filter((c) => c.document);
    let preparedCodes = 0;
    const codeTasks = [
      ...data.documents
        .filter((d) => d.period_id === s.current_period)
        .map((d) => async () => {
          media.documentCodes![d.id] = await printQr(
            publicDocumentLink(window.location.origin, d.criterion, d.id),
          );
        }),
      ...documented.map((c) => async () => {
        media.courses[c.id] = await printQr(
          publicCertificateLink(window.location.origin, c.document!.id),
        );
      }),
      ...data.publications.map((r) => async () => {
        media.reportCodes![r.id] = await printQr(
          publicReportLink(window.location.origin, r.criterion, r.id),
        );
      }),
    ];
    await mapPrintTasks(
      codeTasks,
      async (task) => {
        await task();
        progress.update(
          40 + (40 * ++preparedCodes) / codeTasks.length,
          `تجهيز رمز ${preparedCodes} من ${codeTasks.length}…`,
          2,
        );
      },
      3,
    );
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
    const staging = doc.createElement("div");
    staging.className = "fp-staging";
    staging.setAttribute("aria-hidden", "true");
    staging.inert = true;
    staging.append(toolbar, host);
    doc.body.append(staging);
    progress.update(80, "تحميل الخط العربي…", 3);
    await doc.fonts.load("16px PortfolioPrint");
    progress.update(84, "ترقيم صفحات الملف…", 3);
    const sections = portfolioSections(
      s,
      data.publications,
      courses,
      media,
      window.location.origin,
      data.documents,
    );
    await paginatePortfolio(
      doc,
      host,
      s,
      sections,
      (done, total) => {
        progress.update(84 + (10 * done) / total, `تنسيق القسم ${done} من ${total}…`, 3);
      },
      media,
    );
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
    doc.documentElement.dataset["prepareMs"] = String(Math.round(performance.now() - started));
    doc.documentElement.dataset["imageCacheHits"] = String(cacheHits);
    await progress.finish(pages.length, warning);
    doc.body.append(toolbar, host);
    staging.remove();
    toolbar.style.visibility = "visible";
    toolbar.inert = false;
    host.style.visibility = "visible";
    host.inert = false;
    host.removeAttribute("aria-hidden");
    download.focus({ preventScroll: true });
    return { window: win, pages: pages.length, previewFailures: failures };
  } catch (err) {
    if (!win.closed) {
      doc.querySelector(".fp-staging")?.remove();
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
  section?: DocumentSection,
) {
  const page = doc.createElement("article");
  page.className = `fp-page${cover ? " fp-cover fp-section-cover" : ""}`;
  if (id) page.id = id;
  const criterion = section?.criterion;
  const header = `<header class="fp-header"><img src="/brand/moe-color.png" alt="وزارة التعليم">${criterion ? `<span class="fp-criterion-heading"><b>${String(criterion.id).padStart(2, "0")}</b><span>${e(criterion.name)}</span></span>` : `<span>ملف الإنجاز المهني — ${e(s.teacher.name)}</span>`}</header>`;
  if (cover && criterion) {
    page.className = "fp-page fp-criterion-cover";
    page.innerHTML =
      header +
      `<div class="fp-cover-main"><span class="fp-criterion-index">${String(criterion.id).padStart(2, "0")}</span><h1>${e(criterion.name)}</h1><span class="fp-cover-rule"></span><p>${e(section?.subtitle ?? "")}</p><div class="fp-criterion-counts">${e(section?.summary ?? "")}</div></div>`;
  } else if (cover) {
    page.innerHTML = `<img class="fp-cover-logo" src="/brand/moe-white.svg" alt="وزارة التعليم"><div class="fp-cover-identity">المملكة العربية السعودية — وزارة التعليم<br>${e(s.teacher.administration)}</div><div class="fp-cover-main"><h1>${e(title)}</h1><span class="fp-cover-rule"></span></div>`;
  } else {
    page.innerHTML = header + `<div class="fp-body"><h2>${e(title)}</h2></div>`;
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
  media?: DocumentMedia,
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
    let page = makePage(doc, host, s, section.title, section.cover, `fp-${section.id}`, section);
    starts.set(section.id, page);
    if (section.cover) {
      if (section.criterion) {
        onSection?.(sectionIndex + 1, sections.length + 1);
        continue;
      }
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
    if (section.publication && media) {
      await renderApprovedSection(doc, host, s, section, page, media);
      onSection?.(sectionIndex + 1, sections.length + 1);
      continue;
    }
    let body = page.querySelector<HTMLElement>(".fp-body")!;
    let blocks = section.blocks;
    if (section.layout === "about") {
      page.classList.add("fp-about-page");
      const graphic = blockNode(doc, section.blocks[0]!);
      body.append(graphic);
      if (!fits(body)) page.classList.add("fp-about-compact");
      if (fits(body)) {
        onSection?.(sectionIndex + 1, sections.length + 1);
        continue;
      }
      graphic.remove();
      page.classList.remove("fp-about-compact");
      blocks = section.fallbackBlocks ?? section.blocks;
    }
    const next = () => {
      page = makePage(doc, host, s, section.title + " — تابع", false, undefined, section);
      body = page.querySelector<HTMLElement>(".fp-body")!;
    };
    for (const block of blocks) {
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
async function renderApprovedSection(
  doc: Document,
  host: HTMLElement,
  s: Settings,
  section: DocumentSection,
  firstPage: HTMLElement,
  media: DocumentMedia,
) {
  const publication = section.publication!;
  const qr = media.reportCodes?.[publication.id];
  if (!qr) throw Error("تعذر تجهيز رمز التقرير.");
  const sheets = approvedReportNodes(
    doc,
    publication,
    s,
    media.reports,
    qr,
    publicReportLink(window.location.origin, publication.criterion, publication.id),
  );
  let page = firstPage,
    number = 0;
  const prepare = (target: HTMLElement) => {
    target.classList.add("fp-report-sheet");
    target.querySelector(".fp-body h2")?.remove();
    return target.querySelector<HTMLElement>(".fp-body")!;
  };
  let body = prepare(page);
  const next = () => {
    page = makePage(doc, host, s, section.title, false, undefined, section);
    body = prepare(page);
  };
  const add = (sheet: HTMLElement) => {
    const shell = doc.createElement("div");
    shell.className = "fp-approved-shell";
    shell.append(sheet);
    body.append(shell);
    for (const img of sheet.querySelectorAll("img")) {
      const branded = media.brand?.[img.getAttribute("src") ?? ""];
      if (branded) img.src = branded;
    }
    return shell;
  };
  const fit = (shell: HTMLElement) => {
    const sheet = shell.firstElementChild as HTMLElement;
    sheet.style.setProperty("--fp-report-scale", "1");
    sheet.style.width = "794px";
    const height = sheet.getBoundingClientRect().height;
    const style = doc.defaultView!.getComputedStyle(body),
      available =
        body.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const scale = Math.min(1, body.clientWidth / 794, (available - 4) / height);
    if (scale < 0.78) return false;
    sheet.style.setProperty("--fp-report-scale", String(scale));
    sheet.style.width = `${794 * scale}px`;
    shell.style.width = `${794 * scale}px`;
    shell.style.height = "auto";
    return true;
  };
  for (const source of sheets) {
    if (number++) next();
    let shell = add(source);
    await Promise.all([...source.querySelectorAll("img")].map((img) => img.decode()));
    if (fit(shell)) continue;
    // The normal approved report remains intact; only truly oversized content is continued.
    const pieces = approvedReportPieces(doc, source);
    shell.remove();
    const makeShell = () => {
      const clone = source.cloneNode(true) as HTMLElement;
      clone.querySelector(".sr-content")!.replaceChildren();
      if (page !== firstPage) clone.classList.add("fp-report-continuation");
      return add(clone);
    };
    shell = makeShell();
    for (const piece of pieces) {
      let content = shell.querySelector(".sr-content")!;
      content.append(piece);
      if (fit(shell)) continue;
      piece.remove();
      if (!content.children.length)
        throw Error("جزء من التقرير أكبر من صفحة A4. لم يُقتطع المحتوى.");
      fit(shell);
      next();
      shell = makeShell();
      content = shell.querySelector(".sr-content")!;
      content.append(piece);
      if (!fit(shell)) throw Error("تعذر احتواء جزء التقرير في صفحة A4.");
    }
  }
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
