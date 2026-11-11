import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  BookOpen,
  Compass,
  FileText,
  GraduationCap,
  Scale,
  ShieldCheck,
  ArrowUpLeft,
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
    <section className="about-content-card">
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
export function About({ settings: s }: { settings: Settings }) {
  const [active, setActive] = useState<Tab>(currentTab);
  const track = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [marker, setMarker] = useState({ left: 0, width: 0 });
  const [height, setHeight] = useState<number>();
  const data = { ...aboutDefaults, ...s.about };
  useEffect(() => {
    const route = () => setActive(currentTab());
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, []);
  useLayoutEffect(() => {
    const update = () => {
      const selected = track.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (selected) setMarker({ left: selected.offsetLeft, width: selected.offsetWidth });
      if (content.current) setHeight(content.current.getBoundingClientRect().height);
    };
    update();
    const observer = new ResizeObserver(update);
    if (track.current) observer.observe(track.current);
    if (content.current) observer.observe(content.current);
    track.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    return () => observer.disconnect();
  }, [active]);
  function select(id: Tab) {
    setActive(id);
    location.hash = `about/${id}`;
  }
  function keyboard(e: KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowLeft") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowRight") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    select(tabs[next]!.id);
    track.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus({ preventScroll: true });
  }
  return (
    <>
      <div className="folio-page-title">
        <div>
          <span className="folio-eyebrow">المعلم وراء الممارسة</span>
          <h1>عن المعلم</h1>
        </div>
      </div>
      <section className="folio-about-cover">
        <span className="about-monogram" aria-hidden="true">
          ب ع
        </span>
        <div>
          <span className="folio-eyebrow">معلم {s.teacher.subject}</span>
          <h2>{s.teacher.name}</h2>
          <p>{s.teacher.school}</p>
        </div>
        <span className="about-cover-detail" aria-hidden="true">
          <BookOpen size={76} strokeWidth={0.8} />
        </span>
      </section>
      <div className="about-tabs-scroll">
        <div className="about-tabs" role="tablist" aria-label="عن المعلم" ref={track}>
          <span
            className="about-tab-marker"
            aria-hidden="true"
            style={{ width: marker.width, transform: `translateX(${marker.left}px)` }}
          />
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              id={`about-tab-${tab.id}`}
              role="tab"
              aria-selected={active === tab.id}
              aria-controls={`about-panel-${tab.id}`}
              tabIndex={active === tab.id ? 0 : -1}
              onClick={() => select(tab.id)}
              onKeyDown={(e) => keyboard(e, i)}
            >
              <tab.icon size={19} strokeWidth={1.6} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="about-panel-shell" style={{ height }}>
        <div ref={content}>
          <section
            className="about-panel"
            key={active}
            id={`about-panel-${active}`}
            role="tabpanel"
            aria-labelledby={`about-tab-${active}`}
            tabIndex={0}
          >
            <div className="about-panel-heading">
              <span>{String(tabs.findIndex((t) => t.id === active) + 1).padStart(2, "0")}</span>
              <h2>{tabs.find((t) => t.id === active)!.label}</h2>
            </div>
            {active === "introduction" && (
              <>
                <Paragraphs text={data.introduction} />
                <blockquote className="about-intro-quote">{s.teacher.bio}</blockquote>
                <div className="about-intro-sign">
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
                <Paragraphs text={data[active]} />
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
    </>
  );
}
