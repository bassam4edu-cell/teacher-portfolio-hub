import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  GraduationCap,
  Lightbulb,
  NotebookPen,
} from "lucide-react";
import type { Settings } from "@/lib/portfolio/model";
const groups = [
  { type: "qualification", title: "المؤهلات العلمية", icon: GraduationCap },
  { type: "experience", title: "الخبرات المهنية", icon: BriefcaseBusiness },
  { type: "certification", title: "الرخص المهنية", icon: Award },
  { type: "research", title: "المشاركة البحثية", icon: NotebookPen },
  { type: "skill", title: "المهارات", icon: Lightbulb },
] as const;
export function CareerCV({ settings: s }: { settings: Settings }) {
  const known = new Set<string>(groups.map((g) => g.type));
  const other = s.career.filter((item) => !known.has(item.type));
  return (
    <div className="cv-layout">
      <header className="cv-profile">
        <div className="cv-profile-icon" aria-hidden="true">
          <BookOpen size={32} strokeWidth={1.3} />
        </div>
        <div>
          <span className="cv-kicker">المسيرة المهنية</span>
          <h3>{s.teacher.name}</h3>
          <p>معلم {s.teacher.subject}</p>
          <span className="cv-school">{s.teacher.school}</span>
        </div>
        {s.teacher.qualification && (
          <div className="cv-highest">
            <GraduationCap size={21} />
            <span>
              المؤهل الأعلى<strong>{s.teacher.qualification}</strong>
            </span>
          </div>
        )}
      </header>
      <div className="cv-sections">
        {groups.map((group) => {
          const entries = s.career.filter((item) => item.type === group.type);
          if (!entries.length) return null;
          return (
            <section className={`cv-section cv-section-${group.type}`} key={group.type}>
              <div className="cv-section-heading">
                <group.icon size={22} strokeWidth={1.5} />
                <h3>{group.title}</h3>
              </div>
              <ul className={group.type === "skill" ? "cv-skills" : "cv-timeline"}>
                {entries.map((item) => (
                  <li key={item.id}>
                    <h4>{item.title}</h4>
                    {item.institution && <p className="cv-institution">{item.institution}</p>}
                    {item.date && <span className="cv-date">{item.date}</span>}
                    {item.description && <p>{item.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {other.length > 0 && (
          <section className="cv-section cv-section-other">
            <div className="cv-section-heading">
              <Award size={22} />
              <h3>التطوير المهني والإنجازات</h3>
            </div>
            <ul className="cv-timeline">
              {other.map((item) => (
                <li key={item.id}>
                  <h4>{item.title}</h4>
                  {item.institution && <p>{item.institution}</p>}
                  {item.date && <span className="cv-date">{item.date}</span>}
                  {item.description && <p>{item.description}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
        {!s.career.some((item) => item.type === "certification") && s.teacher.license && (
          <section className="cv-section">
            <div className="cv-section-heading">
              <Award size={22} />
              <h3>الرخصة المهنية</h3>
            </div>
            <p>{s.teacher.license}</p>
          </section>
        )}
        {(s.teacher.rank || s.teacher.experience) && (
          <section className="cv-section">
            <div className="cv-section-heading">
              <BriefcaseBusiness size={22} />
              <h3>البيانات المهنية</h3>
            </div>
            {s.teacher.rank && <p>الرتبة: {s.teacher.rank}</p>}
            {s.teacher.experience && <p>{s.teacher.experience}</p>}
          </section>
        )}
      </div>
    </div>
  );
}
