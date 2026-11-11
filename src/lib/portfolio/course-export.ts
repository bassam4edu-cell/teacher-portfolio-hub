import type { Settings } from "./model";
import { courseDate, courseDuration, courseDocument, courseTotals, type Course } from "./courses";
import css from "@/components/portfolio/courses-print.css?raw";
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
async function dataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
async function certificatePages(blob: Blob): Promise<string[]> {
  if (blob.type !== "application/pdf") return [await dataUrl(blob)];
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await blob.arrayBuffer()),
  });
  const doc = await task.promise;
  const result: string[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvas, viewport }).promise;
      result.push(canvas.toDataURL("image/png"));
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }
    return result;
  } finally {
    await task.destroy();
  }
}
export async function printCourses(
  courses: Course[],
  settings: Settings,
  includeCertificates: boolean,
) {
  const win = window.open("", "_blank");
  if (!win) throw Error("اسمح بفتح نافذة التقرير للطباعة.");
  win.document.write(
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير الدورات والتطوير المهني</title></head><body><p role="status">جارٍ تجهيز تقرير الدورات…</p></body></html>',
  );
  win.document.close();
  try {
    const totals = courseTotals(courses);
    const now = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const attachments: string[] = [];
    if (includeCertificates) {
      for (const course of courses) {
        if (!course.document) continue;
        const pages = await certificatePages(await courseDocument(course.document.id));
        pages.forEach((url, i) =>
          attachments.push(
            `<section class="course-certificate"><h2>${esc(course.title)}</h2><p>${esc(course.provider || "")} · ${esc(courseDate(course))}</p><img src="${url}" alt="وثيقة الدورة"><footer>وثيقة الدورة · الصفحة ${i + 1} من ${pages.length}</footer></section>`,
          ),
        );
      }
    }
    const font = await fetch("/fonts/Tajawal-Regular.ttf");
    if (!font.ok) throw Error("تعذر تجهيز الخط العربي");
    const fontUrl = await dataUrl(await font.blob());
    win.document.head.insertAdjacentHTML(
      "beforeend",
      `<style>@font-face{font-family:Tajawal;src:url(${fontUrl})} ${css}</style>`,
    );
    win.document.body.innerHTML = `<div class="course-print-toolbar"><button id="course-print">حفظ PDF / طباعة</button></div><main class="course-print-report"><header><span>ملف الإنجاز المهني</span><h1>تقرير الدورات والتطوير المهني</h1><h2>${esc(settings.teacher.name)}</h2><p>معلم ${esc(settings.teacher.subject)} · ${esc(settings.teacher.school)}</p></header><div class="course-print-summary"><span>${totals.count} دورة</span><span>${totals.hours} ساعة تدريبية موثقة</span>${totals.days ? `<span>${totals.days} يوم تدريبي موثق</span>` : ""}<span>إعداد التقرير: ${esc(now)}</span></div><table><thead><tr><th>م</th><th>عنوان الدورة</th><th>الجهة المقدمة</th><th>التاريخ</th><th>المدة</th></tr></thead><tbody>${courses.map((c, i) => `<tr><td>${i + 1}</td><td>${esc(c.title)}</td><td>${esc(c.provider || "غير محددة")}</td><td dir="ltr">${esc(courseDate(c))}</td><td>${esc(courseDuration(c))}</td></tr>`).join("")}</tbody></table><p class="course-print-note">يشمل إجمالي الساعات الدورات ذات المدة المسجلة بالساعات فقط. لا تُحوّل الأيام إلى ساعات.</p>${includeCertificates && courses.some((c) => !c.document) ? '<p class="course-print-note">تظهر مرفقات الدورات التي تتوفر لها وثائق منشورة فقط.</p>' : ""}<footer>إعداد المعلم: ${esc(settings.teacher.name)}</footer></main>${attachments.join("")}`;
    win.document.getElementById("course-print")!.onclick = () => win.print();
    await win.document.fonts.load("16px Tajawal");
    await Promise.all([...win.document.images].map((i) => i.decode()));
    return win;
  } catch (error) {
    win.document.body.textContent =
      "تعذر تجهيز التقرير. أغلق هذه النافذة وأعد المحاولة من صفحة الدورات.";
    throw error;
  }
}
