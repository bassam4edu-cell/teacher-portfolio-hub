import type { Settings } from "./model";
import { aboutDefaults, aboutSources } from "./about-content";
import { escapePrint as e, type DocumentSection, type DocumentBlock } from "./portfolio-document";
const icon = (kind: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${kind === "career" ? '<path d="M3 7h18v14H3zM8 7V3h8v4M3 12h18M10 12v3h4v-3"/>' : kind === "qualification" ? '<path d="m2 9 10-6 10 6-10 6L2 9Zm4 3v6c4 3 8 3 12 0v-6M22 9v8"/>' : '<path d="M12 3v18M3 12h18M5 5l14 14M5 19 19 5"/>'}</svg>`;
const prose = (text: string) =>
  text
    .split(/\n+/)
    .filter(Boolean)
    .map((p) => `<p>${e(p)}</p>`)
    .join("");
const paragraphBlocks = (text: string): DocumentBlock[] =>
  text
    .split(/\n+/)
    .filter(Boolean)
    .map((text) => ({ html: "", text }));
const groupNames: Record<string, string> = {
  qualification: "المؤهلات العلمية",
  experience: "الخبرات المهنية",
  certification: "الرخص المهنية",
  research: "المشاركة البحثية",
  skill: "المهارات",
};
export function graphicAboutSections(s: Settings): DocumentSection[] {
  const about = { ...aboutDefaults, ...s.about };
  const objectives = about.objectives.split(/\n+/).filter(Boolean);
  const intro = `<div class="fp-about-intro"><div class="fp-intro-lead">${icon("book")}<h3>أثرٌ تعليمي ومسيرة مهنية</h3>${prose(about.introduction)}</div><h3 class="fp-about-subhead">أهداف الملف</h3><div class="fp-objective-grid">${objectives.map((o, i) => `<div><b>${String(i + 1).padStart(2, "0")}</b><p>${e(o)}</p></div>`).join("")}</div>${s.goals.length ? `<div class="fp-saved-goals">${s.goals.map((g) => `<h4>${e(g.title)}</h4>${prose(g.description ?? "")}${g.indicator ? `<p>${e(g.indicator)}</p>` : ""}`).join("")}</div>` : ""}</div>`;
  const entries = (type: string) =>
    s.career
      .filter((c) => c.type === type)
      .map(
        (c) =>
          `<article class="fp-resume-entry"><h4>${e(c.title)}</h4>${c.institution ? `<p>${e(c.institution)}</p>` : ""}${c.date ? `<time>${e(c.date)}</time>` : ""}${c.description ? `<p class="fp-resume-detail">${e(c.description)}</p>` : ""}</article>`,
      )
      .join("");
  const allTypes = [...new Set(s.career.map((c) => c.type))];
  const primaryTypes = allTypes.filter((t) => t !== "skill" && t !== "certification");
  const resume = `<div class="fp-resume-profile"><div class="fp-resume-emblem">${icon("qualification")}</div><div><h3>${e(s.teacher.name)}</h3><p>معلم ${e(s.teacher.subject)}</p><span>${e(s.teacher.school)}</span></div></div><div class="fp-resume-columns"><aside><h3>البيانات المهنية</h3><dl>${[
    ["التخصص", s.teacher.subject],
    ["المدرسة", s.teacher.school],
    ["الرتبة", s.teacher.rank],
    ["المؤهل الأعلى", s.teacher.qualification],
    ["الخبرة", s.teacher.experience],
  ]
    .filter(([, v]) => v)
    .map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`)
    .join(
      "",
    )}</dl>${s.teacher.license ? `<h3>الرخصة المهنية</h3><p>${e(s.teacher.license)}</p>` : ""}${entries("certification") ? `<h3>الرخص والاعتمادات</h3>${entries("certification")}` : ""}${entries("skill") ? `<h3>المهارات</h3>${entries("skill")}` : ""}</aside><div class="fp-resume-main">${primaryTypes.map((type) => `<section><h3>${icon(type === "experience" ? "career" : type)}${e(groupNames[type] || "إنجازات مهنية أخرى")}</h3><div class="fp-resume-timeline">${entries(type)}</div></section>`).join("") || "<p>لا توجد مؤهلات أو خبرات إضافية مسجلة.</p>"}</div></div>`;
  const values = s.values.map((v) => {
    const split = v.indexOf(":");
    return { label: split > 0 ? v.slice(0, split) : v, body: split > 0 ? v.slice(split + 1) : "" };
  });
  const vision = `<div class="fp-purpose-grid"><section>${icon("vision")}<h3>رؤيتي في التعليم</h3>${prose(s.vision)}</section><section>${icon("mission")}<h3>رسالتي التعليمية</h3>${prose(s.mission)}</section></div><h3 class="fp-about-subhead">القيم التي توجّه ممارستي</h3><div class="fp-values-grid">${values.map((v, i) => `<section><span>${String(i + 1).padStart(2, "0")}</span><div><h4>${e(v.label)}</h4>${v.body ? `<p>${e(v.body)}</p>` : ""}</div></section>`).join("")}</div>`;
  const sections: DocumentSection[] = [
    {
      id: "introduction",
      title: "المقدمة والأهداف التعليمية",
      layout: "about",
      blocks: [{ html: intro }],
      fallbackBlocks: [
        ...paragraphBlocks(about.introduction),
        ...objectives.map((text) => ({ html: "", text })),
        ...s.goals.flatMap((g) =>
          paragraphBlocks([g.title, g.description, g.indicator].filter(Boolean).join("\n")),
        ),
      ],
    },
    {
      id: "career",
      title: "السيرة الذاتية والخبرات",
      layout: "about",
      blocks: [{ html: resume }],
      fallbackBlocks: [
        ...paragraphBlocks(
          [
            s.teacher.name,
            s.teacher.subject,
            s.teacher.school,
            s.teacher.qualification,
            s.teacher.rank,
            s.teacher.experience,
            s.teacher.license,
          ]
            .filter(Boolean)
            .join("\n"),
        ),
        ...s.career.flatMap((c) =>
          paragraphBlocks(
            [c.title, c.institution, c.date, c.description].filter(Boolean).join("\n"),
          ),
        ),
      ],
    },
    {
      id: "vision",
      title: "الرؤية والرسالة والقيم",
      layout: "about",
      blocks: [{ html: vision }],
      fallbackBlocks: paragraphBlocks([s.vision, s.mission, ...s.values].join("\n")),
    },
    ...(["ethics", "policy"] as const).map((kind) => {
      const [lead, ...points] = about[kind].split(/\n+/).filter(Boolean);
      return {
        id: kind,
        title:
          kind === "ethics"
            ? "ميثاق أخلاقيات مهنة التعليم"
            : "سياسة التعليم في المملكة العربية السعودية",
        layout: "about" as const,
        blocks: [
          {
            html: `<div class="fp-principle-lead">${icon(kind)}<p>${e(lead)}</p></div><div class="fp-principle-grid">${points.map((p, i) => `<section><b>${String(i + 1).padStart(2, "0")}</b><p>${e(p)}</p></section>`).join("")}</div><p class="fp-source"><a href="${e(aboutSources[kind].url)}">${e(aboutSources[kind].label)}</a></p>`,
          },
        ],
        fallbackBlocks: paragraphBlocks(about[kind]),
      };
    }),
  ];
  return sections;
}
