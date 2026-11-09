import { toPng } from "html-to-image";
import { attachmentUrl } from "./api";
import { reportFields } from "./templates";
import {
  kinds,
  latestSchedule,
  statusNames,
  type Attachment,
  type Evidence,
  type EvidenceData,
  type Settings,
} from "./model";
const reportStyles = `
@font-face{font-family:Tajawal;src:url('__FONT__') format('truetype');font-weight:400;font-display:block}
*{box-sizing:border-box}body{margin:0;background:#edf2f1;color:#18343d;font-family:Tajawal,Arial,sans-serif;direction:rtl;line-height:1.7}.export-page{background:white;width:794px;height:1123px;padding:38px 46px;position:relative;margin:16px auto;break-after:page;overflow:hidden}.export-header{height:100px;border-bottom:3px solid #176754;display:flex;justify-content:space-between;align-items:center;font-size:14px;gap:20px}.export-header strong{font-size:17px}.export-header small{display:block;color:#53716c}.export-body{height:894px;padding-top:20px;overflow:hidden}.export-footer{height:50px;border-top:1px solid #cfddda;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#59736f}.export-block{margin:0 0 13px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal}.export-block h1{font-size:32px;line-height:1.4;color:#125747;margin:0 0 10px}.export-block h2{font-size:24px;color:#125747;margin:0 0 8px}.export-block h3{font-size:16px;margin:0 0 4px;color:#176754}.export-block p{font-size:16px;margin:0}.export-photo{width:100%;max-height:790px;object-fit:contain;display:block}.export-image-label{font-size:12px!important;color:#53716c;text-align:center}.export-attachment{color:#176754;overflow-wrap:anywhere}.export-note{font-size:13px!important;color:#53716c}.export-cover{padding-top:120px}.export-cover h1{font-size:43px;margin-bottom:24px}.export-cover p{font-size:22px;margin:14px 0}.export-page a{color:#176754;text-decoration:underline}.export-toolbar{position:sticky;top:0;z-index:10;background:#123f36;color:white;padding:14px;text-align:center}.export-toolbar button{font:inherit;background:white;border:0;border-radius:8px;padding:10px 24px;cursor:pointer}.export-toolbar span{margin:0 16px}@page{size:A4;margin:0}@media print{body{background:white}.export-page{margin:0;width:210mm;height:297mm;box-shadow:none}.export-toolbar{display:none}}
`;
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
type Block = {
  title?: string | undefined;
  text?: string;
  image?: string;
  link?: string;
  note?: boolean;
  level?: "h1" | "h2";
  cover?: boolean;
};
function makeBlock(b: Block) {
  const el = node("div", undefined, `export-block${b.cover ? " export-cover" : ""}`);
  if (b.title) el.append(node(b.level ?? "h3", b.title));
  if (b.text) el.append(node("p", b.text, b.note ? "export-note" : undefined));
  if (b.image) {
    const img = node("img", undefined, "export-photo");
    img.src = b.image;
    img.alt = b.title ?? "الصورة الأصلية";
    el.append(img);
  }
  if (b.link) {
    const a = node("a", "فتح المرفق الأصلي", "export-attachment");
    a.href = b.link;
    a.target = "_blank";
    a.rel = "noreferrer";
    el.append(a);
  }
  return el;
}
function page(s: Settings) {
  const page = node("article", undefined, "export-page");
  const header = node("header", undefined, "export-header");
  const left = node("div");
  left.append(node("strong", s.teacher.administration), node("div", s.teacher.school));
  const right = node("div", "ملف الإنجاز المهني");
  right.append(node("small", "ملف شخصي • ليس منصة رسمية"));
  header.append(left, right);
  page.append(
    header,
    node("div", undefined, "export-body"),
    node("footer", undefined, "export-footer"),
  );
  return page;
}
async function paginate(host: HTMLElement, blocks: Block[], s: Settings) {
  let p = page(s);
  host.append(p);
  let body = p.querySelector(".export-body") as HTMLElement;
  const next = () => {
    p = page(s);
    host.append(p);
    body = p.querySelector(".export-body") as HTMLElement;
  };
  for (const b of blocks) {
    if ((b.cover || b.level === "h1" || b.level === "h2") && body.childElementCount) next();
    let remaining = b.text ?? "";
    let title = b.title;
    do {
      const block = makeBlock({ ...b, title, text: remaining });
      body.append(block);
      if (b.image)
        await Promise.all(Array.from(block.querySelectorAll("img")).map((img) => img.decode()));
      if (body.scrollHeight <= body.clientHeight + 1) {
        remaining = "";
        break;
      }
      block.remove();
      if (b.image || b.cover) {
        if (body.childElementCount) {
          next();
          continue;
        }
        throw new Error("تعذر احتواء صورة التقرير في الصفحة.");
      }
      const words = remaining.split(/\s+/);
      let low = 0,
        high = words.length;
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        const candidate = makeBlock({ ...b, title, text: words.slice(0, mid).join(" ") });
        body.append(candidate);
        const fits = body.scrollHeight <= body.clientHeight + 1;
        candidate.remove();
        if (fits) low = mid;
        else high = mid - 1;
      }
      if (low === 0) {
        if (!body.childElementCount) throw new Error("جزء التقرير أكبر من مساحة الصفحة.");
        next();
        continue;
      }
      body.append(makeBlock({ ...b, title, text: words.slice(0, low).join(" ") }));
      remaining = words.slice(low).join(" ");
      title = title ? title + " — تابع" : undefined;
      if (remaining) next();
    } while (remaining || b.image);
  }
  const pages = Array.from(host.querySelectorAll<HTMLElement>(".export-page"));
  pages.forEach((p, i) => {
    const counter = node("span", `${i + 1} / ${pages.length}`);
    counter.dir = "ltr";
    p.querySelector(".export-footer")!.append(
      node("span", `إعداد المعلم: ${s.teacher.name}`),
      counter,
    );
  });
  return pages;
}
async function reportBlocks(
  e: Evidence,
  s: Settings,
  attachments: Attachment[],
  urls?: Record<string, string>,
) {
  const blocks: Block[] = [
    {
      title: e.title,
      text: `${kinds[e.kind]} • العنصر ${e.criterion}: ${s.criteria.find((c) => c.id === e.criterion)?.name}\nحالة البيانات: ${statusNames[e.status]} • النسخة ${e.version}`,
      level: "h2",
    },
  ];
  for (const [key, label] of reportFields(e.kind)) {
    const value = e.data[key as keyof EvidenceData];
    if (value !== undefined && value !== "") blocks.push({ title: label, text: String(value) });
  }
  if (!e.data.execution_on)
    blocks.push({
      text: "تاريخ التنفيذ غير محدد. تاريخ الرفع لا يثبت تاريخ تنفيذ الممارسة.",
      note: true,
    });
  for (const c of e.data.additional_criteria ?? [])
    blocks.push({ title: `ارتباط إضافي بالعنصر ${c.criterion}`, text: c.reason });
  blocks.push({
    text: `إعداد المعلم: ${s.teacher.name}\nمدير المدرسة: ${s.teacher.director}\nظهور اسم المدير لا يعني اعتماد الشاهد. لا يوجد توقيع أو ختم مضاف.`,
    note: true,
  });
  for (const a of attachments) {
    const url = urls?.[a.id] ?? (await attachmentUrl(a));
    if (a.mime.startsWith("image/"))
      blocks.push({ title: a.name, image: url, text: "صورة أصلية دون قص أو تعديل", note: true });
    else
      blocks.push({
        title: `مرفق: ${a.name}`,
        text: "مستند أصلي مستقل. المرفق ليس مدمجًا في صفحات PDF؛ افتح رابط الشاهد وسجل دخولك لتنزيله من الموقع.",
        link: `${window.location.origin}/?sharedEvidence=${e.id}#library/${e.id}`,
        note: true,
      });
  }
  return blocks;
}
let fontPromise: Promise<string> | undefined;
async function embeddedFontUrl() {
  fontPromise ??= (async () => {
    const response = await fetch("/fonts/Tajawal-Regular.ttf");
    if (!response.ok) throw new Error("تعذر تحميل الخط العربي المحلي.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return "data:font/ttf;base64," + btoa(binary);
  })();
  return fontPromise;
}
async function renderExport(blocks: Block[], s: Settings) {
  const host = node("div");
  host.style.cssText = "position:absolute;left:-10000px;top:0;width:794px;direction:rtl";
  const font = await embeddedFontUrl();
  const style = node("style", reportStyles.replace("__FONT__", font));
  host.append(style);
  document.body.append(host);
  try {
    await document.fonts.load("16px Tajawal");

    const pages = await paginate(host, blocks, s);
    return { host, pages, css: style.textContent! };
  } catch (err) {
    host.remove();
    throw err;
  }
}
function createPrintWindow() {
  const win = window.open("", "_blank");
  if (!win) throw new Error("اسمح بفتح نافذة التقرير للطباعة أو حفظ PDF.");
  win.document.open();
  win.document.write(
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head><body></body></html>',
  );
  win.document.close();
  win.document.title = "جارٍ إعداد التقرير";
  win.document.body.textContent = "جارٍ تجهيز الصفحات والصور الأصلية…";
  return win;
}
async function printBlocks(win: Window, blocks: Block[], settings: Settings) {
  let rendered: Awaited<ReturnType<typeof renderExport>> | undefined;
  try {
    rendered = await renderExport(blocks, settings);
    const doc = win.document;
    doc.title = `ملف الإنجاز المهني — ${settings.teacher.name}`;
    doc.documentElement.lang = "ar";
    doc.documentElement.dir = "rtl";
    doc.head.append(node("meta"), node("style", rendered.css));
    doc.body.replaceChildren();
    const toolbar = node("div", undefined, "export-toolbar");
    const button = node("button", "طباعة / حفظ PDF");
    button.onclick = () => win.print();
    toolbar.append(
      button,
      node("span", "اختر حفظ بصيغة PDF — مقاس A4 — أوقف رؤوس وتذييلات المتصفح."),
    );
    doc.body.append(toolbar, ...rendered.pages.map((p) => p.cloneNode(true)));
    await doc.fonts.load("16px Tajawal");
    await Promise.all(Array.from(doc.images).map((i) => i.decode()));
  } catch (err) {
    win.document.body.textContent = "تعذر إنشاء التقرير: " + String(err);
    throw err;
  } finally {
    rendered?.host.remove();
  }
}
export async function exportEvidence(e: Evidence, s: Settings, attachments: Attachment[]) {
  const win = createPrintWindow();
  try {
    await printBlocks(win, await reportBlocks(e, s, attachments), s);
  } catch (err) {
    win.document.body.textContent = String(err);
    throw err;
  }
}
export async function exportReportPng(
  e: Evidence,
  s: Settings,
  attachments: Attachment[],
  urls: Record<string, string>,
) {
  const rendered = await renderExport(await reportBlocks(e, s, attachments, urls), s);
  try {
    const fontEmbedCSS = `@font-face{font-family:Tajawal;src:url(${await embeddedFontUrl()}) format('truetype')}`;
    for (let i = 0; i < rendered.pages.length; i++) {
      const data = await toPng(rendered.pages[i]!, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        fontEmbedCSS,
      });
      const link = node("a");
      link.href = data;
      link.download = `report-${e.id}-page-${i + 1}.png`;
      link.click();
    }
  } finally {
    rendered.host.remove();
  }
}
export async function exportPortfolio(
  s: Settings,
  evidence: Evidence[],
  attachments: Attachment[],
  period: string,
  criterion?: number,
) {
  const win = createPrintWindow();
  const scoped = evidence.filter(
    (e) =>
      e.period_id === period &&
      e.status !== "archived" &&
      (!criterion || e.criterion === criterion),
  );
  const blocks: Block[] = [
    {
      title: "ملف الإنجاز المهني",
      text: `${s.teacher.name}\nمعلم ${s.teacher.subject}\n${s.teacher.school}\n${s.periods.find((p) => p.id === period)?.name ?? "لم تُحدد فترة الملف"}\nملف شخصي لتوثيق الممارسة المهنية`,
      cover: true,
      level: "h1",
    },
    {
      title: "الفهرس",
      text: [
        "نبذة وسيرة مهنية",
        s.vision ? "الرؤية والرسالة والقيم" : "",
        s.goals.length ? "الأهداف المهنية" : "",
        s.schedules.length ? "الجدول المدرسي" : "",
        ...s.criteria
          .filter((c) => scoped.some((e) => e.criterion === c.id))
          .map((c) => `${c.id}. ${c.name}`),
        s.reflection ? "التأمل وخطة التحسين" : "",
      ]
        .filter(Boolean)
        .join("\n"),
      level: "h1",
    },
    { title: "نبذة عن المعلم", text: s.teacher.bio, level: "h2" },
  ];
  if (!criterion) {
    for (const [key, label] of Object.entries({
      qualification: "المؤهل",
      rank: "الرتبة",
      experience: "الخبرات",
      license: "الرخصة المهنية",
    })) {
      const value = s.teacher[key as keyof Settings["teacher"]];
      if (value) blocks.push({ title: label, text: value });
    }
    if (s.vision) blocks.push({ title: "الرؤية", text: s.vision });
    if (s.mission) blocks.push({ title: "الرسالة", text: s.mission });
    if (s.values.length) blocks.push({ title: "القيم", text: s.values.join(" • ") });
    for (const g of s.goals)
      blocks.push({
        title: `هدف مهني: ${g.title}`,
        text: [
          g.description,
          g.indicator ? `مؤشر المتابعة: ${g.indicator}` : "",
          g.indicator && g.progress !== undefined ? `التقدم المسجل: ${g.progress}%` : "",
          g.notes,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    for (const schedule of s.schedules
      .filter((sc) => sc.id === latestSchedule(s)?.id)
      .sort((a, b) => b.effective_on!.localeCompare(a.effective_on!))
      .slice(0, 1))
      blocks.push({
        title: `الجدول المدرسي — ${schedule.effective_on}`,
        text: schedule.lessons
          .slice()
          .sort((a, b) => a.day - b.day || a.period - b.period)
          .map(
            (l) =>
              `${["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"][l.day]} • الحصة ${l.period} • ${l.subject} • ${l.grade ?? "الصف غير محدد"} • ${l.duty}${l.start ? ` • ${l.start} — ${l.end ?? ""}` : ""}`,
          )
          .join("\n"),
      });
  }
  try {
    for (const c of s.criteria.filter((c) => scoped.some((e) => e.criterion === c.id))) {
      blocks.push({
        title: `العنصر ${c.id}: ${c.name}`,
        text: `الوزن في نموذج المعلم ${c.weight}%\n${c.description}\nالاكتمال توثيقي ولا يمثل تقييمًا رسميًا.`,
        level: "h1",
      });
      for (const e of scoped.filter((e) => e.criterion === c.id))
        blocks.push(
          ...(await reportBlocks(
            e,
            s,
            attachments.filter((a) => a.evidence_id === e.id),
          )),
        );
    }
    if (!criterion) {
      for (const career of s.career)
        blocks.push({
          title: career.title,
          text: [career.institution, career.date, career.description].filter(Boolean).join("\n"),
        });
      if (s.reflection) blocks.push({ title: "التأمل المهني", text: s.reflection });
      if (s.improvement) blocks.push({ title: "خطة التحسين", text: s.improvement });
    }
    await printBlocks(win, blocks, s);
  } catch (err) {
    win.document.body.textContent = String(err);
    throw err;
  }
}
