import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  BookOpen,
  Compass,
  FileText,
  GraduationCap,
  Scale,
  ShieldCheck,
  ArrowUpLeft,
  ArrowLeft,
  Printer,
} from "lucide-react";
import type { Settings } from "@/lib/portfolio/model";
import { aboutDefaults, aboutSources } from "@/lib/portfolio/about-content";
import { CareerCV } from "./CareerCV";
import "./about.css";
const tabs = [
  { id: "introduction", label: "المقدمة", icon: BookOpen },
  { id: "vision", label: "الرؤية والرسالة والقيم", icon: Compass },
  { id: "ethics", label: "ميثاق أخلاقيات مهنة التعليم", icon: ShieldCheck },
  { id: "policy", label: "سياسة التعليم في المملكة العربية السعودية", icon: Scale },
  { id: "cv", label: "السيرة الذاتية", icon: GraduationCap },
  { id: "objectives", label: "أهداف الملف", icon: FileText },
] as const;
type Tab = (typeof tabs)[number]["id"];
function currentTab(): Tab {
  if (typeof window === "undefined") return "introduction";
  const [page, section] = location.hash.slice(1).split("/");
  const id =
    page === "about"
      ? section
      : ({ career: "cv", vision: "vision", goals: "objectives" } as Record<string, string>)[
          page ?? ""
        ];
  return tabs.find((t) => t.id === id)?.id ?? "introduction";
}
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="educator-block about-content-card">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
function Paragraphs({ text }: { text: string }) {
  return (
    <div className="about-prose">
      {text
        .split(/\n+/)
        .filter(Boolean)
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </div>
  );
}
function DocumentText({ text, kind }: { text: string; kind: "ethics" | "policy" }) {
  const [lead, ...principles] = text.split(/\n+/).filter(Boolean);
  return (
    <div className={`educator-document educator-document-${kind}`}>
      <p className="educator-document-lead">{lead}</p>
      <ol>
        {principles.map((principle, index) => (
          <li key={index}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <p>{principle}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
export function About({ settings: s }: { settings: Settings }) {
  const [active, setActive] = useState<Tab>(currentTab);
  const track = useRef<HTMLDivElement>(null);
  const [vertical, setVertical] = useState(false);
  const data = { ...aboutDefaults, ...s.about };
  useEffect(() => {
    const route = () => setActive(currentTab());
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1000px)");
    const update = () => setVertical(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (vertical) return;
    const selected = track.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    const scroller = track.current?.parentElement;
    if (!selected || !scroller) return;
    const item = selected.getBoundingClientRect();
    const viewport = scroller.getBoundingClientRect();
    const delta =
      item.left < viewport.left
        ? item.left - viewport.left
        : item.right > viewport.right
          ? item.right - viewport.right
          : 0;
    if (delta) scroller.scrollBy({ left: delta, behavior: "instant" });
  }, [active, vertical]);
  function select(id: Tab) {
    setActive(id);
    location.hash = `about/${id}`;
  }
  function keyboard(e: KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp")
      next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    select(tabs[next]!.id);
    track.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus({ preventScroll: true });
  }
  const ActiveIcon = tabs.find((tab) => tab.id === active)!.icon;
  return (
    <div className="educator-about">
      <header className="educator-cover">
        <div className="educator-heading">
          <h1>عن المعلم</h1>
          <p>{s.teacher.name}</p>
        </div>
        <div className="educator-identity">
          <span className="educator-avatar" aria-hidden="true">
            <GraduationCap size={32} strokeWidth={1.5} />
          </span>
          <div>
            <strong>معلم {s.teacher.subject}</strong>
            <span>{s.teacher.school}</span>
          </div>
        </div>
      </header>
      <div className="educator-workspace">
        <aside className="educator-navigation">
          <div className="educator-nav-label">أقسام التعريف</div>
          <div className="educator-tabs-scroll">
            <div
              className="educator-tabs"
              role="tablist"
              aria-label="عن المعلم"
              aria-orientation={vertical ? "vertical" : "horizontal"}
              ref={track}
            >
              {tabs.map((tab, i) => (
                <button
                  key={tab.id}
                  id={`about-tab-${tab.id}`}
                  role="tab"
                  aria-selected={active === tab.id}
                  aria-controls={active === tab.id ? `about-panel-${tab.id}` : undefined}
                  tabIndex={active === tab.id ? 0 : -1}
                  onClick={() => select(tab.id)}
                  onKeyDown={(e) => keyboard(e, i)}
                >
                  <span className="educator-tab-icon">
                    <tab.icon size={19} strokeWidth={1.6} />
                  </span>
                  <span>{tab.label}</span>
                  <ArrowLeft className="educator-tab-arrow" size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </aside>
        <div className="educator-reading">
          <div className="educator-reading-tools">
            <span>{String(tabs.findIndex((t) => t.id === active) + 1).padStart(2, "0")} / 06</span>
            <button onClick={() => window.print()}>
              <Printer size={16} /> طباعة القسم
            </button>
          </div>
          <section
            className="about-panel"
            key={active}
            id={`about-panel-${active}`}
            role="tabpanel"
            aria-labelledby={`about-tab-${active}`}
            tabIndex={0}
          >
            <div className="educator-panel-heading">
              <span className="educator-panel-icon" aria-hidden="true">
                <ActiveIcon size={24} strokeWidth={1.5} />
              </span>
              <h2>{tabs.find((t) => t.id === active)!.label}</h2>
            </div>
            {active === "introduction" && (
              <>
                <Paragraphs text={data.introduction} />
                <blockquote className="about-intro-quote">{s.teacher.bio}</blockquote>
                <div className="educator-author">
                  {s.teacher.name}
                  <span>معلم {s.teacher.subject}</span>
                </div>
              </>
            )}
            {active === "vision" && (
              <>
                <div className="about-vision-grid">
                  <Card title="الرؤية">
                    <p>{s.vision || "تُضاف الرؤية المهنية عند إعدادها."}</p>
                  </Card>
                  <Card title="الرسالة">
                    <p>{s.mission || "تُضاف الرسالة المهنية عند إعدادها."}</p>
                  </Card>
                </div>
                <Card title="القيم">
                  <div className="about-value-grid">
                    {s.values.length ? (
                      s.values.map((value, index) => {
                        const colon = value.indexOf(":");
                        const title = colon < 0 ? value : value.slice(0, colon).trim();
                        const description = colon < 0 ? "" : value.slice(colon + 1).trim();
                        return (
                          <article className="about-value-card" key={value}>
                            <span className="about-value-number" aria-hidden="true">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <h4>{title}</h4>
                              {description && <p>{description}</p>}
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <p>تُضاف القيم المهنية عند إعدادها.</p>
                    )}
                  </div>
                </Card>
              </>
            )}
            {(active === "ethics" || active === "policy") && (
              <>
                <p className="about-summary-label">ملخص تعريفي بصياغة مبسطة</p>
                <DocumentText text={data[active]} kind={active} />
                <aside className="about-source">
                  <FileText size={22} />
                  <div>
                    <strong>{aboutSources[active].title}</strong>
                    <p>للاطلاع على المرجع الأصلي والتفاصيل.</p>
                    <a href={aboutSources[active].url} target="_blank" rel="noopener noreferrer">
                      {aboutSources[active].label}
                      <ArrowUpLeft size={16} />
                    </a>
                  </div>
                </aside>
              </>
            )}
            {active === "cv" && <CareerCV settings={s} />}
            {active === "objectives" && (
              <>
                <ol className="about-objectives">
                  {data.objectives
                    .split(/\n+/)
                    .filter(Boolean)
                    .map((text, i) => (
                      <li key={i}>
                        <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                        <p>{text}</p>
                      </li>
                    ))}
                </ol>
                {s.goals.length > 0 && (
                  <Card title="الأهداف المهنية">
                    {s.goals.map((g) => (
                      <div className="about-professional-goal" key={g.id}>
                        <h4>{g.title}</h4>
                        {g.description && <p>{g.description}</p>}
                        {g.indicator && <p>{g.indicator}</p>}
                      </div>
                    ))}
                  </Card>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
