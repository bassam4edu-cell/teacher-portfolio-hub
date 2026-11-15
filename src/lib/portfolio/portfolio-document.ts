import type { Settings } from "./model";
import { days } from "./model";
import type { Publication } from "./simple-report";
import { reportDate, reportDefaults } from "./simple-report";
import { aboutDefaults, aboutSources } from "./about-content";
import { courseDate, courseDuration, courseTotals, sortCourses, type Course } from "./courses";

export type DocumentBlock = { html: string; text?: string };
export type DocumentSection = {
  id: string;
  title: string;
  cover?: boolean;
  subtitle?: string;
  blocks: DocumentBlock[];
};
export type DocumentMedia = { reports: Record<string, string>; courses: Record<string, string> };
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
    {
      id: "introduction",
      title: "المقدمة والأهداف التعليمية",
      blocks: [
        heading("المقدمة"),
        ...paragraphs(about.introduction),
        heading("أهداف الملف"),
        ...about.objectives
          .split(/\n+/)
          .filter(Boolean)
          .map((t) => ({ html: `<p class="fp-bullet">${e(t)}</p>` })),
        ...s.goals.flatMap((g) => [
          { html: `<h3 class="fp-subtitle">${e(g.title)}</h3>` },
          ...paragraphs(g.description ?? ""),
          ...(g.indicator ? [text(`مؤشر المتابعة: ${g.indicator}`)] : []),
        ]),
      ],
    },
    {
      id: "career",
      title: "السيرة الذاتية والخبرات",
      blocks: [
        {
          html: `<dl class="fp-facts">${fact("الاسم", s.teacher.name)}${fact("التخصص", s.teacher.subject)}${fact("المدرسة", s.teacher.school)}${s.teacher.qualification ? fact("المؤهل", s.teacher.qualification) : ""}${s.teacher.rank ? fact("الرتبة", s.teacher.rank) : ""}${s.teacher.experience ? fact("الخبرة", s.teacher.experience) : ""}${s.teacher.license ? fact("الرخصة المهنية", s.teacher.license) : ""}</dl>`,
        },
        ...s.career.flatMap((c) => [
          {
            html: `<div class="fp-timeline"><h3>${e(c.title)}</h3><p>${e(c.institution ?? "")}${c.date ? ` · <bdi>${e(c.date)}</bdi>` : ""}</p></div>`,
          },
          ...paragraphs(c.description ?? ""),
        ]),
      ],
    },
    {
      id: "vision",
      title: "الرؤية والرسالة والقيم",
      blocks: [
        heading("رؤيتي في التعليم"),
        ...paragraphs(s.vision),
        heading("رسالتي التعليمية"),
        ...paragraphs(s.mission),
        heading("القيم"),
        ...s.values.map((v) => ({ html: `<p class="fp-bullet">${e(v)}</p>` })),
      ],
    },
    ...(["ethics", "policy"] as const).map((kind) => ({
      id: kind,
      title:
        kind === "ethics"
          ? "ميثاق أخلاقيات مهنة التعليم"
          : "سياسة التعليم في المملكة العربية السعودية",
      blocks: [
        ...paragraphs(about[kind]),
        {
          html: `<p class="fp-note">${link(aboutSources[kind].url, aboutSources[kind].label)}</p>`,
        },
      ],
    })),
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
    const blocks: DocumentBlock[] = [
      {
        html: `<div class="fp-summary"><span>الممارسة والتوثيق المهني</span><strong>${rows.length} تقارير</strong><span>${rows.reduce((n, r) => n + r.assets.length, 0)} مرفقات</span><span>الوزن ${c.weight}%</span></div>`,
      },
      text(c.description),
    ];
    if (!rows.length) blocks.push(text("لا توجد تقارير منشورة ضمن هذا العنصر حتى الآن."));
    for (const r of rows) blocks.push(...reportBlocks(r, media, origin, s));
    sections.push({
      id: `criterion-${c.id}`,
      title: `${String(c.id).padStart(2, "0")} — ${c.name}`,
      blocks,
    });
  }
  const others = publications.filter((p) => !known.has(p.criterion));
  if (others.length)
    sections.push({
      id: "other-reports",
      title: "تقارير منشورة أخرى",
      blocks: others.flatMap((r) => reportBlocks(r, media, origin, s)),
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
            html: `<article class="fp-course">${media.courses[c.id] ? `<img src="${e(media.courses[c.id])}" alt="معاينة شهادة ${e(c.title)}">` : `<div class="fp-certificate-empty">${c.document ? "تعذر تحميل معاينة الشهادة" : "لا توجد وثيقة منشورة"}</div>`}<div><h3>${i + 1}. ${e(c.title)}</h3><p>${e(c.provider || "الجهة غير محددة")}</p><p><bdi>${e(courseDate(c))}</bdi> · ${e(courseDuration(c))}</p><p class="fp-note">${link(`${origin}/#courses`, "فتح قسم الدورات والشهادات")}</p></div></article>`,
          }))
        : [text("لم تُضف دورات منشورة بعد.")]),
    ],
  });
  return sections;
}
function reportBlocks(
  r: Publication,
  media: DocumentMedia,
  origin: string,
  s: Settings,
): DocumentBlock[] {
  const url = `${origin}/#criteria/${r.criterion}/report/${encodeURIComponent(r.id)}`;
  const blocks: DocumentBlock[] = [
    {
      html: `<div class="fp-report-heading"><h3>${e(r.title)}</h3><p><bdi>${e(reportDate(r.report))}</bdi> · ${e(r.report.duration || reportDefaults.duration)} · ${e(r.report.audience || reportDefaults.audience)}</p><p>${e(r.report.place || s.teacher.school)} · ${link(url, "فتح التقرير ومرفقاته")}</p></div>`,
    },
    heading("خطوات التنفيذ / الوصف"),
    ...paragraphs(r.report.description),
    heading("الأهداف"),
    ...r.report.objectives.map((o) => ({ html: `<p class="fp-bullet">${e(o)}</p>` })),
  ];
  for (let i = 0; i < r.assets.length; i += 2)
    blocks.push({
      html: `<div class="fp-images">${r.assets
        .slice(i, i + 2)
        .map(
          (a) =>
            `<figure>${media.reports[a.id] ? `<img src="${e(media.reports[a.id])}" alt="${e(a.name)}">` : `<div class="fp-image-empty">${a.mime.startsWith("image/") ? "تعذر تحميل الصورة" : "مرفق مستند"}<br>${link(url, "فتح المرفق من التقرير")}</div>`}<figcaption>${e(a.name)}</figcaption></figure>`,
        )
        .join("")}</div>`,
    });
  return blocks;
}
