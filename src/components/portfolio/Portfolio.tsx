import { flushSync } from "react-dom";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpLeft,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  FileText,
  GraduationCap,
  LayoutGrid,
  Menu,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
  Download,
  Images,
  ArrowRight,
} from "lucide-react";
import { db, errorText, loadSimplePortfolio, publicReportAsset, rpc } from "@/lib/portfolio/api";
import { defaultSettings, days, currentDayRiyadh, type Settings } from "@/lib/portfolio/model";
import { reportDate, type Publication } from "@/lib/portfolio/simple-report";
import { printSimpleReport } from "@/lib/portfolio/simple-export";
import { SimpleReport } from "./SimpleReport";
import { About } from "./About";
import { Courses } from "./Courses";
import { CourseManager } from "./CourseManager";
import "./folio.css";
import "./experience.css";
import "./reading-design.css";
import "./interactive-experience.css";
import "./design-tokens.css";
import "./reference-identity.css";
import { ReferenceCriteria, VerificationZone } from "./ReferenceIdentity";
import { ReadingControls, ReportSearch, ReportGallery } from "./InteractiveExperience";
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`folio-card ${className}`}>{children}</section>;
}
export function Notice({ children }: { children: ReactNode }) {
  return <p className="folio-note">{children}</p>;
}
export function Empty({
  title = "لم يُضف محتوى بعد",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="folio-empty">
      <BookOpen size={30} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function PageTitle({
  title,
  eyebrow,
  children,
  action,
}: {
  title: string;
  eyebrow?: string | undefined;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="folio-page-title">
      <div>
        {eyebrow && <span className="folio-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}
type View = "home" | "about" | "schedule" | "criteria" | "courses";
const navigation = [
  { id: "home", label: "الرئيسية", icon: BookOpen },
  { id: "about", label: "عن المعلم", icon: UserRound },
  { id: "schedule", label: "الجدول المدرسي", icon: CalendarDays },
  { id: "criteria", label: "عناصر الأداء", icon: LayoutGrid },
  { id: "courses", label: "الدورات", icon: GraduationCap },
] as const;
export function Portfolio({ initialView = "home" }: { initialView?: string }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [view, setView] = useState<View>("home");
  const [criterion, setCriterion] = useState<number | null>(null);
  const [reportId, setReportId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [ownerPage, setOwnerPage] = useState(initialView === "settings");
  const revision = useRef(-1);
  const refreshing = useRef(false);
  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const data = await loadSimplePortfolio();
      setSettings(data.settings);
      setPublications(data.publications);
      revision.current = data.revision;
      setError("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
      refreshing.current = false;
    }
  }, []);
  useEffect(() => {
    void refresh();
    function route() {
      const segments = location.hash.slice(1).split("/");
      const raw = segments[0];
      setView(
        navigation.some((n) => n.id === raw)
          ? (raw as View)
          : ["profile", "career", "vision", "goals"].includes(raw ?? "")
            ? "about"
            : raw === "library"
              ? "criteria"
              : "home",
      );
      setCriterion(raw === "criteria" && segments[1] ? Number(segments[1]) : null);
      setReportId(
        raw === "library"
          ? (segments[1] ?? "")
          : segments[2] === "report"
            ? (segments[3] ?? "")
            : "",
      );
      setMenu(false);
    }
    route();
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, [refresh]);
  useEffect(() => {
    const channel = db
      .channel("folio-public-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "portfolio_public_updates" },
        () => void refresh(),
      )
      .subscribe();
    const check = async () => {
      if (document.visibilityState === "hidden") return;
      const { data, error } = await db
        .from("portfolio_public_updates")
        .select("revision")
        .eq("id", true)
        .single();
      if (!error && data && Number(data.revision) !== revision.current) void refresh();
    };
    const timer = window.setInterval(check, 15000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      void db.removeChannel(channel);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", check);
    };
  }, [refresh]);
  function go(next: View, c?: number, id?: string) {
    const update = () =>
      flushSync(() => {
        setView(next);
        setCriterion(c ?? null);
        setReportId(id ?? "");
        setMenu(false);
      });
    update();
    location.hash = next + (c ? "/" + c : "") + (id ? "/report/" + id : "");
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(".folio-main")?.focus({ preventScroll: true }),
    );
  }
  const current = settings.periods.find((p) => p.id === settings.current_period);
  const reports = publications.filter((p) => p.period_id === settings.current_period);
  const selected = publications.find((p) => p.id === reportId);
  const chosen = settings.criteria.find((c) => c.id === criterion);
  if (ownerPage)
    return (
      <OwnerAccess
        onBack={() => {
          setOwnerPage(false);
          go("home");
        }}
      />
    );
  let content: ReactNode;
  if (selected)
    content = (
      <ReportPage
        publication={selected}
        settings={settings}
        onBack={() => go("criteria", selected.criterion)}
      />
    );
  else if (reportId && !loading)
    content = (
      <>
        <PageTitle title="التقرير غير متاح" />
        <Empty title="لا توجد نسخة منشورة بهذا الرابط" />
        <button onClick={() => go("criteria")}>عناصر الأداء</button>
      </>
    );
  else if (view === "home")
    content = (
      <>
        <section className="folio-hero">
          <div className="hero-grid-art" aria-hidden="true" />
          <div className="folio-hero-copy">
            <p className="reference-institution">
              المملكة العربية السعودية · وزارة التعليم
              <br />
              {settings.teacher.administration}
            </p>
            <p className="reference-calligraphy">
              مَلَفُّ الإِنْجَازِ المِهْنِيِّ وَالتَّعْلِيمِيِّ
            </p>
            <div className="reference-ribbon">
              <i />
              <span>ضمن أعمال وممارسات</span>
              <i />
            </div>
            <h1>{settings.teacher.name}</h1>
            <p className="reference-specialty">معلم اللغــــة الإنجليزيــــة — المرحلة الثانوية</p>
            <p className="hero-document-title">ملف الإنجاز المهني</p>
            <p className="hero-summary">{settings.teacher.bio}</p>
            <div className="hero-actions">
              <button
                className="folio-primary hero-cta"
                onClick={() => {
                  const section = document.getElementById("home-performance");
                  section?.scrollIntoView({
                    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                      ? "instant"
                      : "smooth",
                    block: "start",
                  });
                  section?.focus({ preventScroll: true });
                }}
              >
                استعراض ملف الإنجاز <ArrowUpLeft size={19} />
              </button>
              <button className="hero-secondary" onClick={() => go("about")}>
                عن المعلم <ChevronLeft size={17} />
              </button>
            </div>
          </div>
          <aside className="hero-record" aria-label="بيانات الملف">
            <BookOpen size={44} strokeWidth={1.2} aria-hidden="true" />
            <dl>
              <div>
                <dt>التخصص</dt>
                <dd>{settings.teacher.subject}</dd>
              </div>
              <div>
                <dt>المدرسة</dt>
                <dd>{settings.teacher.school}</dd>
              </div>
              <div>
                <dt>الفترة الدراسية</dt>
                <dd>{current?.name}</dd>
              </div>
            </dl>
          </aside>
        </section>
        <section id="home-performance" tabIndex={-1} aria-label="عناصر الأداء الوظيفي">
          <Section
            title="عناصر الأداء الوظيفي"
            subtitle="اختر عنصرًا لاستعراض تقاريره وشواهده."
            action={() => go("criteria")}
          />
          <ReferenceCriteria
            settings={settings}
            reports={reports}
            onOpen={(id) => go("criteria", id)}
            compact
          />
        </section>
        {reports.length > 0 && (
          <>
            <Section title="من داخل الصف" subtitle="أحدث التقارير والصور الصفية." />
            <div className="folio-report-grid home-practices">
              {reports.slice(0, 3).map((p) => (
                <ReportCard
                  key={p.id}
                  publication={p}
                  settings={settings}
                  criterionName={settings.criteria.find((c) => c.id === p.criterion)?.name ?? ""}
                  onOpen={() => go("criteria", p.criterion, p.id)}
                />
              ))}
            </div>
          </>
        )}
        <div className="home-utilities">
          <section className="folio-schedule-teaser">
            <div className="teaser-icon">
              <CalendarDays size={30} />
            </div>
            <div>
              <h2>الجدول المدرسي</h2>
              <p>الجدول الأسبوعي للحصص والتكليفات.</p>
            </div>
            <button onClick={() => go("schedule")}>
              استعراض الجدول <ArrowUpLeft size={18} />
            </button>
          </section>
          <section className="folio-courses-teaser">
            <div className="teaser-icon">
              <GraduationCap size={30} />
            </div>
            <div>
              <h2>الدورات والتطوير المهني</h2>
              <p>الدورات التدريبية ووثائقها في سجل واحد.</p>
            </div>
            <button onClick={() => go("courses")}>
              استعراض الدورات <ArrowUpLeft size={18} />
            </button>
          </section>
        </div>
      </>
    );
  else if (view === "criteria")
    content = chosen ? (
      <>
        <button className="folio-back" onClick={() => go("criteria")}>
          <ArrowRight size={17} /> جميع عناصر الأداء
        </button>
        <PageTitle
          eyebrow={`العنصر ${chosen.id.toString().padStart(2, "0")} · الوزن ${chosen.weight}%`}
          title={chosen.name}
        >
          {chosen.description}
        </PageTitle>
        <div className="folio-element-summary">
          <span>{reports.filter((r) => r.criterion === chosen.id).length} تقارير منشورة</span>
          <span>اضغط التقرير لعرضه وصوره</span>
        </div>
        {reports.some((r) => r.criterion === chosen.id) ? (
          <div className="folio-report-grid">
            {reports
              .filter((r) => r.criterion === chosen.id)
              .map((p) => (
                <ReportCard
                  publication={p}
                  settings={settings}
                  key={p.id}
                  criterionName={chosen.name}
                  onOpen={() => go("criteria", chosen.id, p.id)}
                />
              ))}
          </div>
        ) : (
          <Empty title="لم يُضف تقرير لهذا العنصر بعد">
            ستظهر التقارير هنا مباشرة عند إضافتها.
          </Empty>
        )}
      </>
    ) : (
      <>
        <PageTitle eyebrow="شواهد الممارسة المهنية" title="عناصر الأداء الوظيفي">
          كل تقرير تحت العنصر الذي يوثّقه، مع صوره ونسخة للطباعة.
        </PageTitle>
        <ReportSearch reports={reports} onOpen={(p) => go("criteria", p.criterion, p.id)} />
        <ReferenceCriteria
          settings={settings}
          reports={reports}
          onOpen={(id) => go("criteria", id)}
        />
        <p className="folio-reference">
          العناصر والأوزان وفق نموذج تقييم المعلم في دليل وزارة التعليم.{" "}
          <a href={settings.standard.document_url} target="_blank" rel="noreferrer">
            الاطلاع على المرجع
          </a>
        </p>
      </>
    );
  else if (view === "about") content = <About settings={settings} />;
  else if (view === "courses")
    content = <Courses settings={settings} revision={revision.current} />;
  else
    content = (
      <>
        <PageTitle eyebrow={current?.name} title="الجدول المدرسي">
          تنظيم الحصص والتكليفات من الأحد إلى الخميس.
        </PageTitle>
        <Schedule settings={settings} />
      </>
    );
  return (
    <div className="folio" data-view={reportId ? "report" : view} data-revision={revision.current}>
      <a
        className="folio-skip"
        href="#portfolio-content"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById("portfolio-content");
          main?.focus({ preventScroll: true });
          main?.scrollIntoView({ block: "start", behavior: "instant" });
        }}
      >
        تجاوز إلى المحتوى
      </a>
      <header className="folio-header">
        <a
          className="folio-brand"
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
        >
          <span className="folio-brand-icon">
            <BookOpen size={25} strokeWidth={1.5} />
          </span>
          <span>
            {settings.teacher.name}
            <small>ملف الإنجاز المهني</small>
          </span>
        </a>
        <nav className={menu ? "is-open" : ""} aria-label="التنقل الرئيسي">
          {navigation.map((n) => (
            <a
              href={"#" + n.id}
              key={n.id}
              className={view === n.id ? "active" : ""}
              aria-current={view === n.id ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                go(n.id);
              }}
            >
              <n.icon size={17} />
              {n.label}
            </a>
          ))}
        </nav>
        <div className="folio-header-end">
          <span className="folio-live">
            <i />
            {loading ? "جارٍ التحميل" : "ملف متجدد"}
          </span>
          <button
            className="folio-menu"
            aria-label={menu ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main className="folio-main" id="portfolio-content" tabIndex={-1}>
        {view !== "home" && (
          <nav className="reading-breadcrumb" aria-label="مسار التصفح">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                go("home");
              }}
            >
              الرئيسية
            </a>
            <ChevronLeft size={14} />
            {criterion ? (
              <>
                <a
                  href="#criteria"
                  onClick={(e) => {
                    e.preventDefault();
                    go("criteria");
                  }}
                >
                  عناصر الأداء
                </a>
                <ChevronLeft size={14} />
                <span>{reportId ? "التقرير" : chosen?.name}</span>
              </>
            ) : (
              <span>{navigation.find((n) => n.id === view)?.label}</span>
            )}
          </nav>
        )}
        {error && (
          <div className="folio-error" role="alert">
            تعذر تحميل آخر تحديث.{" "}
            <button onClick={refresh}>
              إعادة المحاولة <RefreshCw size={15} />
            </button>
          </div>
        )}
        {loading ? (
          <div className="folio-loading" role="status">
            <span />
            جارٍ تحميل ملف الإنجاز…
          </div>
        ) : (
          content
        )}
      </main>
      <VerificationZone settings={settings} />
      <ReadingControls />
      <footer className="folio-footer">
        <div className="footer-identity">
          <BookOpen size={24} />
          <div>
            <strong>{settings.teacher.name}</strong>
          </div>
        </div>
        <div className="footer-links">
          {navigation.map((n) => (
            <a
              href={"#" + n.id}
              key={n.id}
              onClick={(e) => {
                e.preventDefault();
                go(n.id);
              }}
            >
              {n.label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
function Section({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: () => void;
}) {
  return (
    <div className="folio-section-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <button className="folio-link" onClick={action}>
          جميع العناصر <ChevronLeft size={16} />
        </button>
      )}
    </div>
  );
}
function ReportCard({
  publication: p,
  criterionName,
  settings,
  onOpen,
}: {
  publication: Publication;
  settings: Settings;
  criterionName: string;
  onOpen: () => void;
}) {
  const [src, setSrc] = useState("");
  const [exportUrls, setExportUrls] = useState<Record<string, string> | null>(null);
  const [exportError, setExportError] = useState("");
  const exportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    let url = "";
    if (p.assets[0])
      publicReportAsset(p.assets[0].id)
        .then((u) => {
          url = u;
          if (active) setSrc(u);
          else URL.revokeObjectURL(u);
        })
        .catch(() => {});
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [p.assets]);
  async function downloadPdf() {
    const win = window.open("", "_blank");
    if (!win) {
      setExportError("اسمح بفتح نافذة التقرير لحفظ PDF.");
      return;
    }
    win.document.body.textContent = "جارٍ تجهيز التقرير…";
    setExportError("");
    setExportUrls({});
    const allocated: string[] = [];
    try {
      const entries = await Promise.all(
        p.assets.map(async (asset) => {
          const url = await publicReportAsset(asset.id);
          allocated.push(url);
          return [asset.id, url];
        }),
      );
      flushSync(() => setExportUrls(Object.fromEntries(entries)));
      if (!exportRef.current) throw new Error("تعذر تجهيز التقرير");
      await printSimpleReport(exportRef.current, p.title, win);
    } catch (error) {
      setExportError(errorText(error));
      win.document.body.textContent = "تعذر تجهيز التقرير. أعد المحاولة من بطاقة التقرير.";
    } finally {
      allocated.forEach((url) => URL.revokeObjectURL(url));
      setExportUrls(null);
    }
  }
  return (
    <article className="folio-report-card" aria-label={p.title}>
      <button className="frc-photo" onClick={onOpen} aria-label={`عرض تقرير ${p.title}`}>
        {src ? <img src={src} alt={p.title} /> : <FileText size={40} strokeWidth={1} />}
      </button>
      <div className="frc-body">
        <div className="frc-category" title={criterionName}>
          <span className="frc-category-number">{String(p.criterion).padStart(2, "0")}</span>
          <span>{p.criterion === 4 ? "استراتيجيات التدريس" : criterionName}</span>
        </div>
        <h3>{p.title}</h3>
        <div className="frc-meta">
          <p className="frc-date" aria-label="تاريخ التنفيذ">
            <CalendarDays size={14} />
            <time dateTime={p.report.execution_on}>
              <bdi>{reportDate(p.report)}</bdi>
            </time>
          </p>
          <span className="frc-count">
            <Images size={14} /> {p.assets.length} صور
          </span>
        </div>
        {p.report.description && <p className="frc-summary">{p.report.description}</p>}
        <div className="frc-actions">
          <button onClick={onOpen}>
            عرض التقرير <ChevronLeft size={16} />
          </button>
          <button
            className="frc-pdf"
            aria-label="تحميل PDF"
            onClick={downloadPdf}
            disabled={exportUrls !== null}
          >
            <Download size={16} /> {exportUrls !== null ? "…" : "PDF"}
          </button>
        </div>
        {exportError && (
          <p className="folio-error" role="alert">
            {exportError}
          </p>
        )}
      </div>
      {exportUrls !== null && (
        <div hidden aria-hidden="true">
          <div ref={exportRef}>
            <SimpleReport publication={p} settings={settings} urls={exportUrls} />
          </div>
        </div>
      )}
    </article>
  );
}

function ReportPage({
  publication: p,
  settings,
  onBack,
}: {
  publication: Publication;
  settings: Settings;
  onBack: () => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    const all: string[] = [];
    setUrls({});
    Promise.all(
      p.assets.map(async (a) => {
        const url = await publicReportAsset(a.id);
        all.push(url);
        if (!active) URL.revokeObjectURL(url);
        return [a.id, url];
      }),
    )
      .then((entries) => {
        if (active) setUrls(Object.fromEntries(entries));
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
      all.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [p]);
  return (
    <>
      <div className="folio-report-toolbar">
        <button className="folio-back" onClick={onBack}>
          <ArrowRight size={17} /> العودة إلى عنصر الأداء
        </button>
        <button
          className="folio-primary"
          disabled={Object.keys(urls).length < p.assets.length}
          onClick={() =>
            ref.current &&
            printSimpleReport(ref.current, p.title).catch((e) => setError(errorText(e)))
          }
        >
          <Download size={17} /> تحميل PDF
        </button>
      </div>
      <ReportGallery publication={p} urls={urls} />
      {error && (
        <p role="alert" className="folio-error">
          {error}
        </p>
      )}
      <div ref={ref}>
        <SimpleReport publication={p} settings={settings} urls={urls} />
      </div>
    </>
  );
}
function Schedule({ settings: s }: { settings: Settings }) {
  const [selected, setSelected] = useState("");
  const [day, setDay] = useState(
    Math.max(0, ["Sun", "Mon", "Tue", "Wed", "Thu"].indexOf(currentDayRiyadh())),
  );
  const schedule = s.schedules.find((x) => x.id === selected) ?? s.schedules.at(-1);
  if (!schedule) return <Empty title="لم يُضف الجدول المدرسي بعد" />;
  const periods = [...new Set(schedule.lessons.map((l) => l.period))].sort((a, b) => a - b);
  return (
    <>
      <div className="folio-schedule-meta">
        <span>
          <CalendarDays size={18} />
          {schedule.lessons.filter((l) => l.duty === "تدريس").length} حصة تدريس أسبوعيًا
        </span>
        {s.schedules.length > 1 && (
          <select
            aria-label="نسخة الجدول"
            value={schedule.id}
            onChange={(e) => setSelected(e.target.value)}
          >
            {s.schedules.map((sc, i) => (
              <option value={sc.id} key={sc.id}>
                {sc.effective_on ?? `نسخة ${i + 1}`}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="folio-days">
        {days.map((d, i) => (
          <button
            className={day === i ? "active" : ""}
            aria-pressed={day === i}
            key={d}
            onClick={() => setDay(i)}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="folio-daily">
        {schedule.lessons
          .filter((l) => l.day === day)
          .sort((a, b) => a.period - b.period)
          .map((l) => (
            <div className="folio-lesson" key={l.id}>
              <span>
                {l.period}
                <small>الحصة</small>
              </span>
              <div>
                <h3>{l.subject}</h3>
                <p>{l.grade ?? l.duty}</p>
              </div>
              <small>
                {l.start ? `${l.start} — ${l.end ?? ""}` : l.duty === "انتظار" ? "انتظار" : "تدريس"}
              </small>
            </div>
          ))}
      </div>
      <div className="folio-week">
        <table>
          <thead>
            <tr>
              <th>الحصة</th>
              {days.map((d, i) => (
                <th
                  key={d}
                  className={
                    i === ["Sun", "Mon", "Tue", "Wed", "Thu"].indexOf(currentDayRiyadh())
                      ? "schedule-today"
                      : ""
                  }
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p}>
                <th>{p}</th>
                {days.map((d, i) => {
                  const l = schedule.lessons.find((l) => l.day === i && l.period === p);
                  return (
                    <td key={d}>
                      {l ? (
                        <>
                          <strong>{l.subject}</strong>
                          <span>{l.grade ?? l.duty}</span>
                          {l.start && (
                            <small>
                              {l.start} — {l.end}
                            </small>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function OwnerAccess({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [owner, setOwner] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    db.auth.getSession().then(async ({ data }) => {
      if (data.session) setOwner(await rpc<boolean>("portfolio_is_owner"));
    });
  }, []);
  return (
    <div className="folio owner-access">
      <div className="owner-box">
        <button className="folio-back" onClick={onBack}>
          <ArrowRight size={17} /> ملف الإنجاز
        </button>
        <ShieldCheck />
        <h1>مساحة المالك</h1>
        <p>التحديث اليومي يتم من محادثتك مع الإيجنت.</p>
        {owner ? (
          <>
            <p>تم التحقق من حساب المالك.</p>
            <CourseManager />
            <button onClick={() => db.auth.signOut().then(() => setOwner(false))}>
              تسجيل الخروج
            </button>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const { error } = await db.auth.signInWithPassword({ email, password });
                if (error) throw error;
                setOwner(await rpc<boolean>("portfolio_is_owner"));
                setMessage("");
              } catch (err) {
                setMessage(errorText(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              البريد الإلكتروني
              <input
                type="email"
                dir="ltr"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              كلمة المرور
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="folio-primary" disabled={busy}>
              الدخول
            </button>
          </form>
        )}
        {message && <p role="alert">{message}</p>}
      </div>
    </div>
  );
}
