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
  School,
  ShieldCheck,
  Target,
  UserRound,
  X,
  Download,
  ArrowRight,
} from "lucide-react";
import { db, errorText, loadSimplePortfolio, publicReportAsset, rpc } from "@/lib/portfolio/api";
import { defaultSettings, days, currentDayRiyadh, type Settings } from "@/lib/portfolio/model";
import { reportDate, type Publication } from "@/lib/portfolio/simple-report";
import { printSimpleReport } from "@/lib/portfolio/simple-export";
import { SimpleReport } from "./SimpleReport";
import "./folio.css";
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
type View = "home" | "about" | "schedule" | "criteria";
const navigation = [
  { id: "home", label: "الرئيسية", icon: BookOpen },
  { id: "about", label: "عن المعلم", icon: UserRound },
  { id: "schedule", label: "الجدول المدرسي", icon: CalendarDays },
  { id: "criteria", label: "عناصر الأداء", icon: LayoutGrid },
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
    setView(next);
    setCriterion(c ?? null);
    setReportId(id ?? "");
    setMenu(false);
    location.hash = next + (c ? "/" + c : "") + (id ? "/report/" + id : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          <div className="hero-lines" aria-hidden="true" />
          <div className="folio-hero-copy">
            <span className="hero-kicker">
              <i /> ملف الإنجاز المهني · {current?.name ?? "معلم اللغة الإنجليزية"}
            </span>
            <h1>
              تعليمٌ يُلهم،
              <br />
              <span>وممارسةٌ تُوثَّق.</span>
            </h1>
            <p>{settings.teacher.name}</p>
            <div className="hero-subline">
              معلم {settings.teacher.subject} <span>•</span> {settings.teacher.school}
            </div>
            <button className="folio-primary hero-cta" onClick={() => go("criteria")}>
              استعرض عناصر الأداء <ArrowUpLeft size={19} />
            </button>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-emblem">
              <BookOpen strokeWidth={1} />
              <span>تعلم · ممارسة · أثر</span>
            </div>
            <div className="hero-float float-one">
              <GraduationCap />
              <span>اللغة الإنجليزية</span>
            </div>
            <div className="hero-float float-two">
              <FileText />
              <span>شواهد من الممارسة</span>
            </div>
          </div>
          <div className="hero-foot">
            <span>
              <School size={16} />
              {settings.teacher.administration}
            </span>
            <span>ملف شخصي مهني</span>
          </div>
        </section>
        <div className="folio-intro">
          <span className="folio-eyebrow">عن المعلم</span>
          <h2>
            رحلة مهنية،
            <br />
            محورها تعلّم الطالب.
          </h2>
          <div>
            <p>{settings.teacher.bio}</p>
            <button className="folio-link" onClick={() => go("about")}>
              تعرّف على المعلم <ChevronLeft size={16} />
            </button>
          </div>
        </div>
        <Section
          title="عناصر الأداء الوظيفي"
          subtitle="الممارسة التعليمية، موثقة في مكانها."
          action={() => go("criteria")}
        />
        <Criteria
          settings={settings}
          reports={reports}
          onOpen={(id) => go("criteria", id)}
          compact
        />
        {reports.length > 0 && (
          <>
            <Section title="أحدث التقارير" subtitle="من داخل الصف إلى ملف الإنجاز." />
            <div className="folio-report-grid">
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
        <div className="folio-schedule-teaser">
          <div className="teaser-icon">
            <CalendarDays size={32} />
          </div>
          <div>
            <span className="folio-eyebrow">تنظيم اليوم الدراسي</span>
            <h2>الجدول المدرسي</h2>
            <p>الحصص والتكليفات الأسبوعية في عرض واضح.</p>
          </div>
          <button onClick={() => go("schedule")}>
            استعراض الجدول <ArrowUpLeft size={18} />
          </button>
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
        <Criteria settings={settings} reports={reports} onOpen={(id) => go("criteria", id)} />
        <p className="folio-reference">
          العناصر والأوزان وفق نموذج تقييم المعلم في دليل وزارة التعليم.{" "}
          <a href={settings.standard.document_url} target="_blank" rel="noreferrer">
            الاطلاع على المرجع
          </a>
        </p>
      </>
    );
  else if (view === "about") content = <About settings={settings} />;
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
    <div className="folio" data-revision={revision.current}>
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
            بسام العنزي<small>ملف الإنجاز المهني</small>
          </span>
        </a>
        <nav className={menu ? "is-open" : ""} aria-label="التنقل الرئيسي">
          {navigation.map((n) => (
            <a
              href={"#" + n.id}
              key={n.id}
              className={view === n.id ? "active" : ""}
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
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main className="folio-main">
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
      <footer className="folio-footer">
        <div className="footer-identity">
          <BookOpen size={24} />
          <div>
            <strong>{settings.teacher.name}</strong>
            <span>
              معلم {settings.teacher.subject} · {settings.teacher.school}
            </span>
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
        <div className="footer-bottom">
          <span>ملف إنجاز مهني شخصي</span>
          <span>تعلمٌ مستمر، وأثرٌ يستحق التوثيق.</span>
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
        <span className="folio-eyebrow">ملف الإنجاز</span>
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
function Criteria({
  settings,
  reports,
  onOpen,
  compact = false,
}: {
  settings: Settings;
  reports: Publication[];
  onOpen: (id: number) => void;
  compact?: boolean;
}) {
  return (
    <div className="folio-criteria">
      {settings.criteria.slice(0, compact ? 6 : 11).map((c) => (
        <button className="folio-criterion" key={c.id} onClick={() => onOpen(c.id)}>
          <div className="fc-top">
            <span>{String(c.id).padStart(2, "0")}</span>
            <small>{c.weight}%</small>
          </div>
          <h3>{c.name}</h3>
          <div className="fc-bottom">
            <span>{reports.filter((p) => p.criterion === c.id).length} تقارير</span>
            <ArrowUpLeft size={20} />
          </div>
        </button>
      ))}
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
        <span>العنصر {p.criterion}</span>
      </button>
      <div className="frc-body">
        <small>{criterionName}</small>
        <h3>{p.title}</h3>
        <p className="frc-date">
          تاريخ التنفيذ: <bdi>{reportDate(p.report)}</bdi>
        </p>
        {p.report.description && <p className="frc-summary">{p.report.description}</p>}
        <span className="frc-count">{p.assets.length} صور مرفقة</span>
        <div className="frc-actions">
          <button onClick={onOpen}>
            عرض التقرير كاملًا <ChevronLeft size={16} />
          </button>
          <button onClick={downloadPdf} disabled={exportUrls !== null}>
            <Download size={16} /> {exportUrls !== null ? "جارٍ التجهيز…" : "تحميل PDF"}
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
function About({ settings: s }: { settings: Settings }) {
  return (
    <>
      <PageTitle eyebrow="مسيرة مهنية في التعليم" title="عن المعلم" />
      <section className="folio-about-cover">
        <span className="about-monogram">ب ع</span>
        <div>
          <span className="folio-eyebrow">معلم اللغة الإنجليزية</span>
          <h2>{s.teacher.name}</h2>
          <p>{s.teacher.school}</p>
        </div>
      </section>
      <Panel>
        <h2>نبذة عني</h2>
        <p className="about-bio">{s.teacher.bio}</p>
        <div className="about-facts">
          {[
            ["التخصص", s.teacher.subject],
            ["الإدارة", s.teacher.administration],
            ["المؤهل", s.teacher.qualification],
            ["الرتبة", s.teacher.rank],
            ["الخبرة", s.teacher.experience],
            ["الرخصة المهنية", s.teacher.license],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <small>{k}</small>
                <strong>{v}</strong>
              </div>
            ))}
        </div>
      </Panel>
      {(s.vision || s.mission) && (
        <div className="about-two">
          {s.vision && (
            <Panel>
              <Target />
              <h2>الرؤية</h2>
              <p>{s.vision}</p>
            </Panel>
          )}
          {s.mission && (
            <Panel>
              <BookOpen />
              <h2>الرسالة</h2>
              <p>{s.mission}</p>
            </Panel>
          )}
        </div>
      )}
      {s.values.length > 0 && (
        <Panel>
          <h2>القيم</h2>
          <div className="about-values">
            {s.values.map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
        </Panel>
      )}
      {s.goals.length > 0 && (
        <>
          <Section title="الأهداف المهنية" />
          {s.goals.map((g) => (
            <Panel key={g.id}>
              <h3>{g.title}</h3>
              <p>{g.description}</p>
              {g.indicator && <p>{g.indicator}</p>}
            </Panel>
          ))}
        </>
      )}
      {s.career.length > 0 && (
        <>
          <Section title="السيرة والتطوير المهني" />
          {s.career.map((x) => (
            <Panel key={x.id}>
              <small>{x.date}</small>
              <h3>{x.title}</h3>
              <p>{x.institution}</p>
              <p>{x.description}</p>
            </Panel>
          ))}
        </>
      )}
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
          <button className={day === i ? "active" : ""} key={d} onClick={() => setDay(i)}>
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
              {days.map((d) => (
                <th key={d}>{d}</th>
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
