import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowUpLeft,
  BookOpen,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ClipboardList,
  Download,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  Target,
  UserRound,
  X,
} from "lucide-react";
import {
  db,
  errorText,
  initializePortfolio,
  loadPortfolio,
  loadShared,
  missingBackendMessage,
  rpc,
} from "@/lib/portfolio/api";
import {
  completion,
  currentDayRiyadh,
  days,
  defaultSettings,
  kinds,
  latestSchedule,
  statusNames,
  type Attachment,
  type Evidence,
  type Review,
  type Settings,
} from "@/lib/portfolio/model";
import {
  EvidenceDetail,
  EvidenceEditor,
  OriginalPreview,
  ImportPanel,
  SettingsPanel,
  SharingPanel,
} from "./management";
import { exportPortfolio } from "@/lib/portfolio/report-export";

type View =
  | "home"
  | "profile"
  | "career"
  | "vision"
  | "goals"
  | "schedule"
  | "criteria"
  | "library"
  | "development"
  | "reflection"
  | "sharing"
  | "settings"
  | "import";
const nav: { id: View; label: string; icon: typeof BookOpen }[] = [
  { id: "home", label: "الرئيسية", icon: LayoutDashboard },
  { id: "profile", label: "عن المعلم", icon: UserRound },
  { id: "career", label: "السيرة المهنية", icon: GraduationCap },
  { id: "vision", label: "الرؤية والرسالة", icon: BookOpen },
  { id: "goals", label: "الأهداف المهنية", icon: Target },
  { id: "schedule", label: "الجدول المدرسي", icon: CalendarDays },
  { id: "criteria", label: "عناصر الأداء", icon: ClipboardList },
  { id: "library", label: "مكتبة الشواهد", icon: FolderOpen },
  { id: "development", label: "التطوير والتكريمات", icon: GraduationCap },
  { id: "reflection", label: "التأمل والتحسين", icon: FileText },
  { id: "sharing", label: "المشاركة والمراجعة", icon: ShieldCheck },
];
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`portfolio-panel ${className}`}>{children}</section>;
}
export function Empty({
  title = "لم تُضف بيانات بعد",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <FolderOpen size={30} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return <p className="notice">{children}</p>;
}
export function PageTitle({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <p className="muted">{children}</p>}
      </div>
      {action}
    </div>
  );
}
export function Login({ reviewer = false }: { reviewer?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent, signup = false) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = signup
        ? await db.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin + "/admin" },
          })
        : await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (signup) setMessage("تحقق من بريدك لتأكيد الحساب. إنشاء حساب لا يمنح صلاحية إدارة الملف.");
    } catch (err) {
      setMessage(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel>
      <h2>{reviewer ? "دخول المراجع المدعو" : "الدخول إلى ملفك"}</h2>
      <p className="muted">استخدم البريد المصرح له. محتوى الشواهد والمرفقات خاص.</p>
      <form className="form-stack" onSubmit={submit}>
        <label>
          البريد الإلكتروني
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
          />
        </label>
        <label>
          كلمة المرور
          <input
            required
            type="password"
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
          />
        </label>
        <div className="actions">
          <button className="primary-button" disabled={busy}>
            تسجيل الدخول
          </button>
          <button
            type="button"
            disabled={busy || !email || password.length < 8}
            onClick={(e) => submit(e, true)}
          >
            إنشاء الحساب وتأكيد البريد
          </button>
        </div>
        {message && <p role="status">{message}</p>}
      </form>
    </Panel>
  );
}
export function Portfolio({ initialView = "home" }: { initialView?: View }) {
  const [view, setView] = useState<View>(initialView);
  const [criterion, setCriterion] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [owner, setOwner] = useState(false);
  const [reviewer, setReviewer] = useState(false);
  const [shared, setShared] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [settingsVersion, setSettingsVersion] = useState(0);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [period, setPeriod] = useState("");
  const [backend, setBackend] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [edit, setEdit] = useState<Evidence | "new" | null>(null);
  const [login, setLogin] = useState(false);
  const [shareToken, setShareToken] = useState("");
  const [grantedEvidence, setGrantedEvidence] = useState("");
  useEffect(() => {
    let active = true;
    db.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = db.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setAuthReady(true);
    });
    setShareToken(new URLSearchParams(window.location.search).get("share") ?? "");
    setGrantedEvidence(new URLSearchParams(window.location.search).get("sharedEvidence") ?? "");
    function hash() {
      const [page, id] = window.location.hash.slice(1).split("/");
      if (nav.some((n) => n.id === page) || page === "settings" || page === "import")
        setView(page as View);
      setCriterion(page === "criteria" && id ? Number(id) : null);
      setSelected(page === "library" && id ? id : null);
    }
    hash();
    window.addEventListener("hashchange", hash);
    return () => {
      active = false;
      data.subscription.unsubscribe();
      window.removeEventListener("hashchange", hash);
    };
  }, []);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    setOwner(false);
    setReviewer(false);
    setShared(false);
    setEvidence([]);
    setAttachments([]);
    setReviews([]);
    setSettings(defaultSettings);
    setSettingsVersion(0);
    setBackend(false);
    if (!session) {
      setLoading(false);
      return;
    }
    try {
      if ((shareToken || grantedEvidence) && !(await rpc<boolean>("portfolio_is_owner"))) {
        const d = await loadShared(shareToken, grantedEvidence || undefined);
        setSettings(d.settings);
        setEvidence(d.evidence);
        setAttachments(d.attachments);
        setReviews(d.reviews);
        setReviewer(d.role === "reviewer");
        setShared(true);
        setBackend(true);
        setPeriod(d.settings.current_period);
      } else {
        const d = await loadPortfolio();
        setOwner(d.owner);
        setBackend(true);
        if (d.settings) {
          setSettings(d.settings);
          setPeriod((p) => p || d.settings!.current_period);
        }
        setSettingsVersion(d.settingsVersion);
        setEvidence(d.evidence);
        setAttachments(d.attachments);
        setReviews(d.reviews);
        if (!d.owner)
          setError("هذا الحساب غير مصرح له بإدارة الملف. افتح رابط الدعوة للاطلاع على ملف مشارك.");
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [session, shareToken, grantedEvidence]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  function navigate(page: View, id?: number | string) {
    setView(page);
    setCriterion(page === "criteria" && id ? Number(id) : null);
    setSelected(page === "library" && id ? String(id) : null);
    setMenu(false);
    setLogin(false);
    window.location.hash = `${page}${id ? "/" + id : ""}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const visible = evidence.filter((e) => e.period_id === period);
  const metrics = completion(settings, visible, period);
  const chosen = evidence.find((e) => e.id === selected);
  const canView = owner || shared;
  const currentPeriod = settings.periods.find((p) => p.id === period);
  const links = nav.filter(
    (n) =>
      !shared ||
      ["home", "profile", "criteria", "library", "sharing"].includes(n.id) ||
      (
        {
          career: settings.career.length,
          vision: settings.vision || settings.mission,
          goals: settings.goals.length,
          schedule: settings.schedules.length,
          development: settings.career.length,
          reflection: settings.reflection || settings.improvement,
        } as Record<string, unknown>
      )[n.id],
  );
  let content: ReactNode;
  if (
    (login && !session) ||
    ((view === "settings" || view === "import") && !session) ||
    ((shareToken || grantedEvidence) && !session)
  )
    content = (
      <>
        <PageTitle title={shareToken ? "ملف مشترك معك" : "مساحة المالك"}>
          المحتوى الخاص متاح بعد تسجيل الدخول.
        </PageTitle>
        <Login reviewer={!!shareToken} />
      </>
    );
  else if (chosen && view === "library")
    content = (
      <EvidenceDetail
        evidence={chosen}
        settings={settings}
        attachments={attachments.filter((a) => a.evidence_id === chosen.id)}
        reviews={reviews.filter((r) => r.evidence_id === chosen.id)}
        owner={owner}
        reviewer={reviewer}
        onBack={() => navigate("library")}
        onEdit={() => setEdit(chosen)}
        onRefresh={refresh}
      />
    );
  else
    switch (view) {
      case "home":
        content = (
          <>
            <section className="cover">
              <div className="cover-art" aria-hidden="true">
                <div />
                <div />
                <BookOpen />
              </div>
              <div className="cover-content">
                <span className="cover-label">رحلة تعلم • ممارسة • أثر</span>
                <p className="cover-subtitle">ملف الإنجاز المهني</p>
                <h1>{settings.teacher.name}</h1>
                <p className="cover-role">معلم {settings.teacher.subject}</p>
                <p>{settings.teacher.school}</p>
                <div className="cover-divider" />
                <div className="cover-meta">
                  <span>{currentPeriod?.name || "لم يُحدد العام الدراسي بعد"}</span>
                  <span>ملف شخصي مهني</span>
                </div>
                <div className="actions">
                  <button className="white-button" onClick={() => navigate("library")}>
                    استعراض الشواهد <ArrowUpLeft size={17} />
                  </button>
                  <button className="cover-button" onClick={() => navigate("career")}>
                    السيرة المهنية
                  </button>
                  {canView && (
                    <button
                      className="cover-button"
                      onClick={() =>
                        exportPortfolio(settings, visible, attachments, period).catch((e) =>
                          setError(errorText(e)),
                        )
                      }
                    >
                      <Download size={16} /> تحميل الملف
                    </button>
                  )}
                </div>
              </div>
            </section>
            <div className="section-heading">
              <div>
                <p className="eyebrow">التعليم ممارسة تتجدد</p>
                <h2>تعلم واضح، وممارسة موثّقة</h2>
              </div>
              <span className="pill">{settings.teacher.subject}</span>
            </div>
            <Panel>
              <p className="bio-text">{settings.teacher.bio}</p>
              <button className="text-button" onClick={() => navigate("profile")}>
                المزيد عن المعلم <ChevronLeft size={16} />
              </button>
            </Panel>
            {canView && (
              <>
                <div className="stats-grid">
                  <Stat
                    value={metrics.percent === null ? "—" : `${metrics.percent}%`}
                    label="اكتمال التوثيق"
                    detail={`${metrics.included} من 11 عنصرًا لها مستهدف`}
                  />
                  <Stat
                    value={visible.filter((e) => e.status === "complete").length}
                    label="شاهد مكتمل"
                    detail="حسب اكتمال البيانات"
                  />
                  <Stat
                    value={
                      new Set(
                        visible.filter((e) => e.status === "complete").map((e) => e.criterion),
                      ).size
                    }
                    label="عناصر لديها شواهد"
                    detail="من أصل 11 عنصرًا"
                  />
                  <Stat
                    value={visible.filter((e) => e.status === "incomplete").length}
                    label="شواهد تحتاج استكمالًا"
                    detail={
                      visible.length
                        ? `آخر تحديث: ${new Date(visible.reduce((a, e) => (e.updated_at > a ? e.updated_at : a), "")).toLocaleDateString("ar-SA", { timeZone: "Asia/Riyadh" })}`
                        : "لم تُضف شواهد بعد"
                    }
                  />
                </div>
                <Notice>
                  نسب الاكتمال تقيس التوثيق داخل الملف، ولا تمثل درجة تقييم الأداء الوظيفي.
                </Notice>
              </>
            )}
            {(settings.vision || settings.mission) && (
              <div className="two-columns">
                {settings.vision && (
                  <Panel>
                    <p className="eyebrow">إلى أين نتجه</p>
                    <h2>الرؤية</h2>
                    <p>{settings.vision}</p>
                  </Panel>
                )}
                {settings.mission && (
                  <Panel>
                    <p className="eyebrow">كيف نعمل</p>
                    <h2>الرسالة</h2>
                    <p>{settings.mission}</p>
                  </Panel>
                )}
              </div>
            )}
            {settings.goals.length > 0 && (
              <>
                <SectionHeading title="أهدافي المهنية" action={() => navigate("goals")} />
                <Goals settings={settings} />
              </>
            )}
            {visible.some((e) => e.data.featured && e.status !== "archived") && (
              <>
                <SectionHeading title="ممارسات مختارة" />
                <EvidenceCards
                  evidence={visible.filter((e) => e.data.featured && e.status !== "archived")}
                  attachments={attachments}
                  open={(id) => navigate("library", id)}
                />
              </>
            )}
            <SectionHeading title="عناصر الأداء الوظيفي" action={() => navigate("criteria")} />
            <CriteriaGrid
              settings={settings}
              evidence={visible}
              period={period}
              open={(id) => navigate("criteria", id)}
              compact={!canView}
            />
            {canView && (
              <>
                <SectionHeading title="أحدث الشواهد" action={() => navigate("library")} />
                <EvidenceCards
                  evidence={visible.filter((e) => e.status !== "archived").slice(0, 3)}
                  attachments={attachments}
                  open={(id) => navigate("library", id)}
                />
              </>
            )}
            {latestSchedule(settings) && (
              <Panel>
                <h2>حصص اليوم</h2>
                <Today settings={settings} />
                <button className="text-button" onClick={() => navigate("schedule")}>
                  الجدول الأسبوعي <ChevronLeft size={16} />
                </button>
              </Panel>
            )}
          </>
        );
        break;
      case "criteria": {
        const row = metrics.rows.find((r) => r.criterion.id === criterion);
        content = row ? (
          <>
            <button className="text-button" onClick={() => navigate("criteria")}>
              جميع عناصر الأداء
            </button>
            <PageTitle
              eyebrow={`العنصر ${row.criterion.id} • الوزن ${row.criterion.weight}%`}
              title={row.criterion.name}
            >
              {row.criterion.description}
            </PageTitle>
            <Panel>
              <Progress percent={row.percent} />
              <Notice>اكتمال توثيق داخلي؛ لا يمثل تقييمًا رسميًا.</Notice>
              <h3>الشواهد المستهدفة</h3>
              {row.targets.length ? (
                <ul className="target-list">
                  {row.targets.map((t) => (
                    <li key={t.id}>
                      <CheckCheck size={18} />
                      <span>{t.title}</span>
                      <span className="pill">
                        {row.completed.includes(t) ? "مكتمل" : "ينقصه شاهد مكتمل"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">لم يُحدد المستهدف. يحدده المالك وفق خطة توثيقه.</p>
              )}
            </Panel>
            <SectionHeading
              title="الشواهد المرتبطة"
              actionLabel="تصدير شواهد العنصر PDF"
              action={
                canView
                  ? () =>
                      exportPortfolio(
                        settings,
                        visible,
                        attachments,
                        period,
                        row.criterion.id,
                      ).catch((e) => setError(errorText(e)))
                  : undefined
              }
            />
            <EvidenceCards
              evidence={visible.filter(
                (e) =>
                  e.criterion === criterion ||
                  e.data.additional_criteria?.some((c) => c.criterion === criterion),
              )}
              attachments={attachments}
              open={(id) => navigate("library", id)}
            />
            <Panel>
              <h3>أمثلة مقترحة للتوثيق</h3>
              <p className="muted">اقتراحات فقط؛ لا تثبت تنفيذ أي ممارسة.</p>
              <div className="actions">
                {row.criterion.suggestions.map((s) => (
                  <span className="pill" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </Panel>
          </>
        ) : (
          <>
            <PageTitle title="عناصر الأداء الوظيفي">إطار واضح لتنظيم الممارسة والشواهد.</PageTitle>
            <Notice>{settings.standard.note}</Notice>
            <CriteriaGrid
              settings={settings}
              evidence={visible}
              period={period}
              open={(id) => navigate("criteria", id)}
              compact={!canView}
            />
            <Panel>
              <h3>مرجع المعايير</h3>
              <p>{settings.standard.name}</p>
              <p className="muted">
                {settings.standard.authority} · {settings.standard.edition} · تاريخ التحقق:{" "}
                {settings.standard.verified_on}
              </p>
              <a href={settings.standard.document_url} target="_blank" rel="noreferrer">
                فتح دليل الوزارة
              </a>
            </Panel>
          </>
        );
        break;
      }
      case "library":
        content = (
          <Library
            evidence={visible}
            attachments={attachments}
            open={(id) => navigate("library", id)}
            owner={owner}
            add={() => setEdit("new")}
            importAction={() => navigate("import")}
            canView={canView}
          />
        );
        break;
      case "profile":
        content = (
          <>
            <PageTitle title="نبذة عن المعلم">التعلم المستمر، وتوثيق الممارسة المهنية.</PageTitle>
            <Panel>
              <div className="profile-heading">
                <span className="avatar-mark">ب ع</span>
                <div>
                  <h2>{settings.teacher.name}</h2>
                  <p>
                    {settings.teacher.subject} • {settings.teacher.school}
                  </p>
                </div>
              </div>
              <p className="bio-text">{settings.teacher.bio}</p>
              <dl className="info-grid">
                <Info label="الإدارة" value={settings.teacher.administration} />
                <Info label="المدرسة" value={settings.teacher.school} />
                <Info label="مدير المدرسة" value={settings.teacher.director} />
                <Info label="التخصص" value={settings.teacher.subject} />
              </dl>
            </Panel>
          </>
        );
        break;
      case "career":
      case "development": {
        const entries =
          view === "development"
            ? settings.career.filter((x) => ["course", "award"].includes(x.type))
            : settings.career;
        content = (
          <>
            <PageTitle title={view === "career" ? "السيرة المهنية" : "التطوير المهني والتكريمات"} />
            {view === "career" && (
              <Panel>
                <dl className="info-grid">
                  {(["qualification", "rank", "experience", "license", "contact"] as const).map(
                    (key, i) =>
                      settings.teacher[key] && (
                        <Info
                          key={key}
                          label={["المؤهل", "الرتبة", "الخبرات", "الرخصة المهنية", "التواصل"][i]!}
                          value={settings.teacher[key]!}
                        />
                      ),
                  )}
                </dl>
                <p className="muted">تُضاف المؤهلات والخبرات عندما تتوفر معلوماتها أو مستنداتها.</p>
              </Panel>
            )}
            {entries.length ? (
              entries.map((x) => (
                <Panel key={x.id}>
                  <span className="pill">{x.date || "دون تاريخ محدد"}</span>
                  <h2>{x.title}</h2>
                  <p>{x.institution}</p>
                  <p>{x.description}</p>
                </Panel>
              ))
            ) : (
              <Empty title="بانتظار إضافة البيانات المهنية الموثقة" />
            )}
          </>
        );
        break;
      }
      case "vision":
        content = (
          <>
            <PageTitle title="الرؤية والرسالة والقيم" />
            {settings.vision || settings.mission ? (
              <>
                <Panel>
                  <h2>الرؤية</h2>
                  <p>{settings.vision || "لم تُضف بعد"}</p>
                  <h2>الرسالة</h2>
                  <p>{settings.mission || "لم تُضف بعد"}</p>
                  <div className="actions">
                    {settings.values.map((v) => (
                      <span className="pill" key={v}>
                        {v}
                      </span>
                    ))}
                  </div>
                </Panel>
              </>
            ) : (
              <Empty title="بانتظار صياغتك المعتمدة للرؤية والرسالة" />
            )}
          </>
        );
        break;
      case "goals":
        content = (
          <>
            <PageTitle title="الأهداف المهنية">
              التقدم يعتمد على متابعة فعلية، ولا يُستنتج من عدد الصور.
            </PageTitle>
            <Goals settings={settings} />
          </>
        );
        break;
      case "schedule":
        content = (
          <>
            <PageTitle
              title="الجدول المدرسي"
              action={
                settings.schedules.length ? (
                  <button onClick={() => window.print()}>
                    <Download size={16} /> طباعة / PDF
                  </button>
                ) : undefined
              }
            >
              الأحد إلى الخميس • بتوقيت الرياض
            </PageTitle>
            <Timetable settings={settings} attachments={attachments} />
          </>
        );
        break;
      case "reflection":
        content = (
          <>
            <PageTitle title="التأمل المهني وخطة التحسين" />
            {settings.reflection || settings.improvement ? (
              <>
                <Panel>
                  <h2>التأمل المهني</h2>
                  <p className="preserve-text">{settings.reflection}</p>
                  <h2>خطة التحسين</h2>
                  <p className="preserve-text">{settings.improvement}</p>
                </Panel>
              </>
            ) : (
              <Empty title="لم تُضف تأملات أو خطة تحسين بعد" />
            )}
          </>
        );
        break;
      case "sharing":
        content = owner ? (
          <SharingPanel evidence={visible} refresh={refresh} />
        ) : (
          <>
            <PageTitle title="المشاركة ومراجعة المدير" />
            <Notice>
              المراجعة داخل الملف ليست تقييمًا رسميًا في فارس. ظهور اسم المدير في التقرير لا يعني
              اعتماده.
            </Notice>
            {shared ? (
              <Panel>
                <h2>{reviewer ? "وصول المراجع" : "وصول الزائر المدعو"}</h2>
                <p>
                  يمكنك فتح الشواهد التي شملتها الدعوة
                  {reviewer ? " وإضافة الملاحظات على نسخة الشاهد الحالية." : "."}
                </p>
                <button onClick={() => navigate("library")}>فتح الشواهد</button>
              </Panel>
            ) : (
              <Empty title="الاطلاع يتطلب دعوة خاصة من المالك" />
            )}
          </>
        );
        break;
      case "import":
        content = owner ? (
          <ImportPanel settings={settings} refresh={refresh} />
        ) : (
          <Notice>{backend ? "الحساب غير مصرح له بإدارة الملف." : missingBackendMessage}</Notice>
        );
        break;
      case "settings":
        content = owner ? (
          settingsVersion ? (
            <SettingsPanel settings={settings} version={settingsVersion} refresh={refresh} />
          ) : (
            <Panel>
              <h2>تهيئة الملف للمرة الأولى</h2>
              <p>حفظ بيانات المعلم الأساسية دون إنشاء شواهد أو سنوات دراسية افتراضية.</p>
              <button
                className="primary-button"
                onClick={() =>
                  initializePortfolio()
                    .then(refresh)
                    .catch((e) => setError(errorText(e)))
                }
              >
                تهيئة الملف
              </button>
            </Panel>
          )
        ) : (
          <Notice>{backend ? "هذا الحساب غير مصرح له بالإدارة." : missingBackendMessage}</Notice>
        );
        break;
    }
  return (
    <div className="portfolio-app">
      <aside className={`sidebar ${menu ? "sidebar-open" : ""}`}>
        <a href="#home" className="brand" onClick={() => navigate("home")}>
          <span className="brand-symbol">
            <BookOpen />
          </span>
          <span>
            ملف الإنجاز <small>المهني • بسام العنزي</small>
          </span>
        </a>
        <button className="mobile-close" aria-label="إغلاق القائمة" onClick={() => setMenu(false)}>
          <X />
        </button>
        <div className="sidebar-caption">مساحة الممارسة المهنية</div>
        <nav aria-label="التنقل الرئيسي">
          {links.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={view === n.id ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                navigate(n.id);
              }}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {view === n.id && <span className="active-dot" />}
            </a>
          ))}
          {owner && (
            <>
              <div className="sidebar-caption">إدارة الملف</div>
              <a
                href="#import"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("import");
                }}
                className={view === "import" ? "active" : ""}
              >
                <Download size={19} /> استقبال الشواهد
              </a>
              <a
                href="#settings"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("settings");
                }}
                className={view === "settings" ? "active" : ""}
              >
                <Settings2 size={19} /> الإعدادات
              </a>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck size={19} />
          <div>
            ملف شخصي للمعلم<small>ليس منصة رسمية تابعة للوزارة</small>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-overlay"
          aria-label="إغلاق القائمة"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-layout">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="mobile-menu icon-button"
              aria-label="فتح القائمة"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <span>
              ملف الإنجاز المهني <ChevronLeft size={14} />{" "}
              <strong>{nav.find((n) => n.id === view)?.label || "إدارة الملف"}</strong>
            </span>
          </div>
          <div className="topbar-actions">
            {settings.periods.length > 0 && (
              <select
                aria-label="فترة الملف"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {settings.periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.archived ? " (أرشيف)" : ""}
                  </option>
                ))}
              </select>
            )}
            {session ? (
              <button title="تسجيل الخروج" onClick={() => db.auth.signOut()}>
                <LogOut size={17} />
                <span className="desktop-only">خروج</span>
              </button>
            ) : (
              <button onClick={() => setLogin(true)}>
                <LogIn size={17} /> الدخول
              </button>
            )}
          </div>
        </header>
        <main id="main-content" className="main-content">
          {error && (
            <div role="alert" className="error-banner">
              {!backend && session ? missingBackendMessage : error}
              <button onClick={refresh}>إعادة المحاولة</button>
            </div>
          )}
          {loading ? (
            <Panel>
              <p role="status">جارٍ تحميل بيانات الملف…</p>
            </Panel>
          ) : authReady ? (
            content
          ) : (
            <Panel>
              <p>جارٍ التحقق من الجلسة…</p>
            </Panel>
          )}
          {owner && !settingsVersion && view !== "settings" && (
            <Notice>قاعدة البيانات جاهزة. افتح الإعدادات لتهيئة الملف لأول مرة.</Notice>
          )}
        </main>
        <footer className="site-footer">
          <span>ملف الإنجاز المهني — {settings.teacher.name}</span>
          <span>الممارسة أولًا، والتوثيق شاهد عليها.</span>
        </footer>
      </div>
      {edit && (
        <EvidenceEditor
          evidence={edit === "new" ? undefined : edit}
          settings={settings}
          period={period}
          onClose={() => setEdit(null)}
          onSaved={async () => {
            setEdit(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
function Stat({ value, label, detail }: { value: string | number; label: string; detail: string }) {
  return (
    <Panel className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{detail}</small>
    </Panel>
  );
}
function SectionHeading({
  title,
  action,
  actionLabel = "عرض الكل",
}: {
  title: string;
  action?: (() => void) | undefined;
  actionLabel?: string;
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {action && (
        <button className="text-button" onClick={action}>
          {actionLabel} <ChevronLeft size={16} />
        </button>
      )}
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
export function Progress({ percent }: { percent: number | null }) {
  return (
    <div className="completion">
      <div>
        <span>اكتمال التوثيق</span>
        <strong>{percent === null ? "لم يُحدد المستهدف" : `${percent}%`}</strong>
      </div>
      {percent !== null && <progress value={percent} max={100} aria-label="اكتمال التوثيق" />}
    </div>
  );
}
function CriteriaGrid({
  settings,
  evidence,
  period,
  open,
  compact,
}: {
  settings: Settings;
  evidence: Evidence[];
  period: string;
  open: (id: number) => void;
  compact?: boolean;
}) {
  return (
    <div className="criteria-grid">
      {completion(settings, evidence, period).rows.map((r) => (
        <button
          className="criterion-card"
          key={r.criterion.id}
          onClick={() => open(r.criterion.id)}
        >
          <div className="criterion-top">
            <span className="criterion-number">{String(r.criterion.id).padStart(2, "0")}</span>
            <span className="muted">{r.criterion.weight}% وزن العنصر</span>
          </div>
          <h3>{r.criterion.name}</h3>
          {compact ? (
            <span className="muted">
              عرض العنصر <ChevronLeft size={14} />
            </span>
          ) : (
            <Progress percent={r.percent} />
          )}
        </button>
      ))}
    </div>
  );
}
function EvidenceCards({
  evidence,
  attachments,
  open,
}: {
  evidence: Evidence[];
  attachments: Attachment[];
  open: (id: string) => void;
}) {
  return evidence.length ? (
    <div className="evidence-grid">
      {evidence.map((e) => (
        <button className="evidence-card" key={e.id} onClick={() => open(e.id)}>
          <div className="evidence-preview">
            {attachments.find((a) => a.evidence_id === e.id && a.mime.startsWith("image/")) ? (
              <OriginalPreview
                attachment={attachments.find(
                  (a) => a.evidence_id === e.id && a.mime.startsWith("image/"),
                )!}
                thumbnail
              />
            ) : (
              <FileText size={35} />
            )}
            <span>{kinds[e.kind]}</span>
          </div>
          <div className="evidence-card-body">
            <div className="criterion-top">
              <span className={`status status-${e.status}`}>{statusNames[e.status]}</span>
              <span className="muted">العنصر {e.criterion}</span>
            </div>
            <h3>{e.title}</h3>
            <p className="muted">{e.data.execution_on || "تاريخ التنفيذ غير محدد"}</p>
            <div className="card-footer">
              <span>{attachments.filter((a) => a.evidence_id === e.id).length} مرفقات أصلية</span>
              <ChevronLeft size={18} />
            </div>
          </div>
        </button>
      ))}
    </div>
  ) : (
    <Empty title="لا توجد شواهد في هذه الفترة">ستظهر الشواهد الفعلية بعد استلامها وحفظها.</Empty>
  );
}
function Library({
  evidence,
  attachments,
  open,
  owner,
  add,
  importAction,
  canView,
}: {
  evidence: Evidence[];
  attachments: Attachment[];
  open: (id: string) => void;
  owner: boolean;
  add: () => void;
  importAction: () => void;
  canView: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [criterion, setCriterion] = useState("");
  const filtered = evidence.filter(
    (e) =>
      (status === "active" ? e.status !== "archived" : e.status === status) &&
      (!criterion || e.criterion === Number(criterion)) &&
      e.title.includes(search),
  );
  return (
    <>
      <PageTitle
        title="مكتبة الشواهد"
        action={
          owner ? (
            <div className="actions">
              <button onClick={importAction}>استيراد حزمة المساعد</button>
              <button className="primary-button" onClick={add}>
                إضافة شاهد
              </button>
            </div>
          ) : undefined
        }
      >
        كل ممارسة في مكانها، مع صورها الأصلية وتاريخها ونسخها.
      </PageTitle>
      {canView ? (
        <>
          <div className="filter-bar">
            <input
              aria-label="البحث في الشواهد"
              placeholder="ابحث بعنوان الشاهد…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="حالة الشاهد"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">الشواهد الحالية</option>
              {Object.entries(statusNames).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              aria-label="عنصر الأداء"
              value={criterion}
              onChange={(e) => setCriterion(e.target.value)}
            >
              <option value="">جميع العناصر</option>
              {defaultSettings.criteria.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}. {c.name}
                </option>
              ))}
            </select>
          </div>
          <EvidenceCards evidence={filtered} attachments={attachments} open={open} />
        </>
      ) : (
        <Empty title="مكتبة خاصة">يلزم تسجيل دخول المالك أو دعوة مشاركة لعرض الشواهد.</Empty>
      )}
    </>
  );
}
function Goals({ settings }: { settings: Settings }) {
  return settings.goals.length ? (
    <div className="two-columns">
      {settings.goals.map((g) => (
        <Panel key={g.id}>
          <span className="pill">{g.status}</span>
          <h3>{g.title}</h3>
          <p>{g.description}</p>
          {g.start && (
            <p className="muted">
              {g.start} — {g.end || "دون نهاية محددة"}
            </p>
          )}
          {g.indicator && <p>مؤشر المتابعة: {g.indicator}</p>}
          {g.progress !== undefined && g.indicator && <Progress percent={g.progress} />}
          <p>{g.notes}</p>
        </Panel>
      ))}
    </div>
  ) : (
    <Empty title="لم تُحدد أهداف مهنية بعد" />
  );
}
function Today({ settings }: { settings: Settings }) {
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu"].indexOf(currentDayRiyadh());
  const schedule = latestSchedule(settings);
  const lessons =
    schedule?.lessons.filter((l) => l.day === day).sort((a, b) => a.period - b.period) ?? [];
  return (
    <div>
      {day < 0 ? (
        <p className="muted">اليوم خارج أيام الجدول الأسبوعي.</p>
      ) : lessons.length ? (
        lessons.map((l) => (
          <p key={l.id}>
            الحصة {l.period} · {l.subject} · {l.grade || "الصف غير محدد"} · {l.duty}
          </p>
        ))
      ) : (
        <p className="muted">لا توجد حصص مسجلة لهذا اليوم.</p>
      )}
    </div>
  );
}
function Timetable({ settings, attachments }: { settings: Settings; attachments: Attachment[] }) {
  const [scheduleId, setScheduleId] = useState("");
  const [day, setDay] = useState(
    Math.max(0, ["Sun", "Mon", "Tue", "Wed", "Thu"].indexOf(currentDayRiyadh())),
  );
  const schedule =
    settings.schedules.find((s) => s.id === scheduleId) ||
    latestSchedule(settings) ||
    settings.schedules[0];
  if (!schedule)
    return (
      <Empty title="بانتظار صورة الجدول وبياناته المنظمة">
        لن تُفترض أيام أو أوقات حصص غير متوفرة.
      </Empty>
    );
  const periods = [...new Set(schedule.lessons.map((l) => l.period))].sort((a, b) => a - b);
  const load = schedule.lessons.filter((l) => l.duty === "تدريس").length;
  return (
    <>
      <Panel>
        <div className="actions">
          <select
            aria-label="نسخة الجدول"
            value={schedule.id}
            onChange={(e) => setScheduleId(e.target.value)}
          >
            {settings.schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.effective_on ? `ساري من ${s.effective_on}` : "نسخة دون تاريخ سريان"}
              </option>
            ))}
          </select>
          <span className="pill">النصاب المسجل: {load} حصة تدريس أسبوعيًا</span>
        </div>
        {schedule.original_path && attachments.find((a) => a.path === schedule.original_path) && (
          <OriginalPreview
            attachment={attachments.find((a) => a.path === schedule.original_path)!}
          />
        )}
        <Notice>تعرض الأوقات والصفوف كما حُفظت فقط. النسخ السابقة محفوظة.</Notice>
      </Panel>
      <div className="day-tabs">
        {days.map((d, i) => (
          <button className={day === i ? "primary-button" : ""} onClick={() => setDay(i)} key={d}>
            {d}
          </button>
        ))}
      </div>
      <div className="schedule-mobile">
        {schedule.lessons
          .filter((l) => l.day === day)
          .sort((a, b) => a.period - b.period)
          .map((l) => (
            <Panel key={l.id}>
              <h3>
                الحصة {l.period} — {l.subject}
              </h3>
              <p>
                {l.grade} · {l.duty}
              </p>
              {l.start && (
                <p>
                  {l.start} — {l.end}
                </p>
              )}
              {l.room && <p>القاعة: {l.room}</p>}
            </Panel>
          ))}
      </div>
      <Panel className="schedule-desktop">
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
                    <td
                      key={d}
                      className={
                        i === ["Sun", "Mon", "Tue", "Wed", "Thu"].indexOf(currentDayRiyadh())
                          ? "today-cell"
                          : ""
                      }
                    >
                      {l ? (
                        <>
                          <strong>{l.subject}</strong>
                          <p>{l.grade}</p>
                          <small>
                            {l.duty}
                            {l.room ? ` · ${l.room}` : ""}
                          </small>
                          {l.start && (
                            <p dir="ltr">
                              {l.start} — {l.end}
                            </p>
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
      </Panel>
    </>
  );
}
