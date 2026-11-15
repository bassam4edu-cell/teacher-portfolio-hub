import type { Settings, Criterion } from "./model";
import { days } from "./model";
import type { Publication } from "./simple-report";
import { graphicAboutSections } from "./about-print";
import { publicCertificateLink } from "./print-qr";
import { aboutDefaults, aboutSources } from "./about-content";
import { courseDate, courseDuration, courseTotals, sortCourses, type Course } from "./courses";

export type DocumentBlock = { html: string; text?: string };
export type DocumentSection = {
  id: string;
  title: string;
  cover?: boolean;
  subtitle?: string;
  blocks: DocumentBlock[];
  layout?: "about";
  fallbackBlocks?: DocumentBlock[];
  criterion?: Criterion;
  publication?: Publication;
  summary?: string;
};
export type DocumentMedia = {
  reports: Record<string, string>;
  courses: Record<string, string>;
  reportCodes?: Record<string, string>;
  brand?: Record<string, string>;
};
export const escapePrint = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const e = escapePrint;
const text = (value: string): DocumentBlock => ({ html: "", text: value });
const heading = (label: string): DocumentBlock => ({
  html: `<h3 class="fp-subtitle">${e(label)}</h3>`,
});
const paragraphs = (value: string) =>
  value
    .split(/\n+/)
    .filter((p) => p.trim())
    .map(text);
const link = (url: string, label: string) =>
  `<a href="${e(url)}" target="_blank" rel="noreferrer">${e(label)}</a>`;
const fact = (label: string, value: string) =>
  `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`;

export function portfolioSections(
  settings: Settings,
  publications: Publication[],
  courses: Course[],
  media: DocumentMedia,
  origin: string,
): DocumentSection[] {
  const s = settings,
    about = { ...aboutDefaults, ...s.about };
  const sections: DocumentSection[] = [
    {
      id: "about-cover",
      title: "القسم الأول: عن المعلم",
      cover: true,
      subtitle: "المقدمة والأهداف · السيرة الذاتية والخبرات · الرؤية والرسالة",
      blocks: [],
    },
    ...graphicAboutSections(s),
  ];
  if (s.reflection || s.improvement)
    sections.push({
      id: "reflection",
      title: "التأمل المهني وخطة التحسين",
      blocks: [
        ...(s.reflection ? [heading("التأمل المهني"), ...paragraphs(s.reflection)] : []),
        ...(s.improvement ? [heading("خطة التحسين"), ...paragraphs(s.improvement)] : []),
      ],
    });
  sections.push({
    id: "schedule-cover",
    title: "الجدول المدرسي",
    cover: true,
    subtitle: "تنظيم الحصص والممارسات الأسبوعية",
    blocks: [],
  });
  if (!s.schedules.length)
    sections.push({
      id: "schedule",
      title: "الجدول المدرسي",
      blocks: [text("لم يُضف جدول مدرسي بعد.")],
    });
  s.schedules.forEach((schedule, index) => {
    const periods = [...new Set(schedule.lessons.map((l) => l.period))].sort((a, b) => a - b);
    const blocks: DocumentBlock[] = [
      text(
        `${s.teacher.school}${schedule.effective_on ? ` · سريان الجدول: ${schedule.effective_on}` : ""}`,
      ),
    ];
    // Separate groups keep even unusually long schedules within an A4 width.
    for (let i = 0; i < periods.length; i += 7) {
      const group = periods.slice(i, i + 7);
      blocks.push({
        html: `<table class="fp-schedule"><thead><tr><th>اليوم / الحصة</th>${group.map((p) => `<th>${p}</th>`).join("")}</tr></thead><tbody>${days
          .map(
            (day, d) =>
              `<tr><th>${day}</th>${group
                .map((p) => {
                  const lessons = schedule.lessons.filter((l) => l.day === d && l.period === p);
                  return `<td>${lessons.map((l) => `<strong>${e(l.grade || l.subject || l.duty)}</strong><small>${e(l.grade ? l.subject : l.duty)}${l.room ? " · " + e(l.room) : ""}</small>${l.start ? `<small dir="ltr">${e(l.start)}${l.end ? " – " + e(l.end) : ""}</small>` : ""}`).join("<hr>") || "—"}</td>`;
                })
                .join("")}</tr>`,
          )
          .join("")}</tbody></table>`,
      });
    }
    if (!periods.length) blocks.push(text("لا توجد حصص مسجلة في هذا الجدول."));
    sections.push({
      id: `schedule-${index}`,
      title: s.schedules.length > 1 ? `الجدول المدرسي — ${index + 1}` : "الجدول المدرسي",
      blocks,
    });
  });
  sections.push({
    id: "criteria-cover",
    title: "عناصر الأداء والشواهد التعليمية",
    cover: true,
    subtitle: `${s.criteria.length} عنصر أداء · ${publications.length} تقرير منشور`,
    blocks: [],
  });
  const known = new Set(s.criteria.map((c) => c.id));
  const criteria = [...s.criteria].sort((a, b) => a.id - b.id);
  for (const c of criteria) {
    const rows = publications
      .filter((r) => r.criterion === c.id)
      .sort(
        (a, b) =>
          (a.report.execution_on ?? "").localeCompare(b.report.execution_on ?? "") ||
          a.id.localeCompare(b.id),
      );
    sections.push({
      id: `criterion-${c.id}`,
      title: `${String(c.id).padStart(2, "0")} — ${c.name}`,
      criterion: c,
      cover: true,
      subtitle: c.description,
      summary: rows.length
        ? `${rows.length} تقارير منشورة · ${rows.reduce((n, r) => n + r.assets.length, 0)} مرفقات`
        : "لا توجد تقارير منشورة حتى الآن",
      blocks: [],
    });
    for (const report of rows)
      sections.push({
        id: `report-${report.id}`,
        title: report.title,
        criterion: c,
        publication: report,
        blocks: [],
      });
  }
  for (const report of publications.filter((p) => !known.has(p.criterion)))
    sections.push({
      id: `report-${report.id}`,
      title: report.title,
      publication: report,
      blocks: [],
    });

  const totals = courseTotals(courses);
  sections.push({
    id: "courses-cover",
    title: "الدورات التدريبية والشهادات",
    cover: true,
    subtitle: `${totals.count} دورة · ${totals.hours} ساعة تدريبية مسجلة${totals.days ? ` · ${totals.days} يوم تدريبي` : ""}`,
    blocks: [],
  });
  sections.push({
    id: "courses",
    title: "سجل الدورات والتطوير المهني",
    blocks: [
      text(
        "ترتيب الدورات من الأقدم إلى الأحدث. تُجمع الساعات المسجلة بالساعات فقط، ولا تُحوّل الأيام إلى ساعات.",
      ),
      ...(courses.length
        ? sortCourses(courses, "oldest").map((c, i) => ({
            html: `<article class="fp-course">${c.document && media.courses[c.id] ? `<a class="fp-course-qr" href="${e(publicCertificateLink(origin, c.document.id))}" target="_blank" rel="noreferrer"><img src="${e(media.courses[c.id])}" alt="رمز معاينة شهادة ${e(c.title)}"><span>معاينة الشهادة</span></a>` : `<div class="fp-certificate-empty">${c.document ? "تعذر تجهيز رمز الشهادة" : "لا توجد شهادة مرفقة"}</div>`}<div><h3>${i + 1}. ${e(c.title)}</h3><p>${e(c.provider || "الجهة غير محددة")}</p><p><bdi>${e(courseDate(c))}</bdi> · ${e(courseDuration(c))}</p></div></article>`,
          }))
        : [text("لم تُضف دورات منشورة بعد.")]),
    ],
  });
  return sections;
}
