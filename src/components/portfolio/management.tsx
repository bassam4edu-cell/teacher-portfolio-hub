import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Download,
  FileImage,
  FileText,
  Plus,
  RotateCcw,
  Save,
  Upload,
  X,
} from "lucide-react";
import {
  attachmentUrl,
  changeStatus,
  db,
  downloadJson,
  errorText,
  examplePackage,
  importPackage,
  rpc,
  saveEvidence,
  saveSettings,
} from "@/lib/portfolio/api";
import {
  completion,
  evidenceDataSchema,
  fieldNames,
  kinds,
  missingFields,
  settingsSchema,
  statusNames,
  todayRiyadh,
  type Attachment,
  type Evidence,
  type EvidenceData,
  type Kind,
  type Review,
  type Settings,
} from "@/lib/portfolio/model";
import { Empty, Notice, PageTitle, Panel } from "./Portfolio";
import { exportEvidence, exportReportPng } from "@/lib/portfolio/report-export";
import { Report } from "./Report";

export function OriginalPreview({
  attachment,
  thumbnail = false,
}: {
  attachment: Attachment;
  thumbnail?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    attachmentUrl(attachment)
      .then((u) => {
        objectUrl = u;
        if (active) setUrl(u);
        else if (u.startsWith("blob:")) URL.revokeObjectURL(u);
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      });
    return () => {
      active = false;
      if (objectUrl.startsWith("blob:")) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment]);
  if (error) return <p className="error-text">{error}</p>;
  if (!url) return <div className="attachment-loading">جارٍ تحميل الأصل…</div>;
  if (thumbnail)
    return (
      <span className="thumbnail-link">
        <img src={url} alt={attachment.name} loading="lazy" />
      </span>
    );
  return (
    <a
      className={thumbnail ? "thumbnail-link" : "attachment-link"}
      href={url}
      target="_blank"
      rel="noreferrer"
    >
      {attachment.mime.startsWith("image/") ? (
        <img src={url} alt={attachment.name} loading="lazy" />
      ) : (
        <FileText size={30} />
      )}
      <span>
        {attachment.name} {!thumbnail && "— فتح الأصل بالحجم الكامل"}
      </span>
    </a>
  );
}
export function EvidenceEditor({
  evidence,
  settings,
  period,
  onClose,
  onSaved,
}: {
  evidence?: Evidence | undefined;
  settings: Settings;
  period: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(evidence?.title ?? "");
  const [kind, setKind] = useState<Kind>(evidence?.kind ?? "strategy");
  const [criterion, setCriterion] = useState(evidence?.criterion ?? 4);
  const [periodId, setPeriod] = useState(evidence?.period_id ?? period);
  const [target, setTarget] = useState(evidence?.target_id ?? "");
  const [status, setStatus] = useState(evidence?.status ?? "draft");
  const [data, setData] = useState<EvidenceData>(
    evidence?.data ?? evidenceDataSchema.parse({ report_on: todayRiyadh() }),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [extra, setExtra] = useState(JSON.stringify(data.additional_criteria ?? [], null, 2));
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveEvidence(
        {
          id: evidence?.id,
          version: evidence?.version,
          title,
          kind,
          criterion,
          period_id: periodId,
          target_id: target || null,
          status,
          data: { ...data, additional_criteria: JSON.parse(extra) },
        },
        files,
      );
      await onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  const targets = settings.targets.filter(
    (t) => t.period_id === periodId && t.criterion === criterion,
  );
  return (
    <dialog
      ref={dialog}
      className="editor-dialog"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <div className="dialog-heading">
        <h2>{evidence ? "تعديل الشاهد" : "إضافة شاهد"}</h2>
        <button type="button" aria-label="إغلاق" disabled={busy} onClick={onClose}>
          <X />
        </button>
      </div>
      <Notice>
        الاستيراد من المساعد هو المسار اليومي. هذه الشاشة للتعديل والإضافة عند الحاجة. لا يُفترض
        تاريخ تنفيذ أو أثر غير موثق.
      </Notice>
      <form onSubmit={submit} className="form-stack">
        <div className="two-columns">
          <label>
            العنوان
            <input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            نوع الشاهد
            <select
              aria-label="نوع الشاهد"
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
            >
              {Object.entries(kinds).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            فترة الملف
            <select
              aria-label="فترة الملف"
              required
              value={periodId}
              onChange={(e) => {
                setPeriod(e.target.value);
                setTarget("");
              }}
            >
              <option value="">اختر فترة</option>
              {settings.periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            عنصر الأداء الأساسي
            <select
              aria-label="عنصر الأداء الأساسي"
              value={criterion}
              onChange={(e) => {
                setCriterion(Number(e.target.value));
                setTarget("");
              }}
            >
              {settings.criteria.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}. {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            الشاهد المستهدف
            <select
              aria-label="الشاهد المستهدف"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">شاهد إضافي — لا يزيد نسبة الاكتمال</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            حالة اكتمال البيانات
            <select
              aria-label="حالة اكتمال البيانات"
              value={status}
              onChange={(e) => setStatus(e.target.value as Evidence["status"])}
            >
              {Object.entries(statusNames).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="two-columns">
          {(
            [
              "subject",
              "grade",
              "classroom",
              "audience",
              "place",
              "execution_on",
              "report_on",
            ] as const
          ).map((k) => (
            <label key={k}>
              {fieldNames[k]}
              <input
                type={k.endsWith("_on") ? "date" : "text"}
                value={data[k] ?? ""}
                onChange={(e) => setData({ ...data, [k]: e.target.value })}
              />
            </label>
          ))}
          <label>
            عدد المستفيدين (اختياري)
            <input
              type="number"
              min={0}
              value={data.beneficiaries ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  beneficiaries: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </label>
        </div>
        {(
          [
            "classification_reason",
            "objective",
            "practice",
            "procedures",
            "assessment",
            "impact",
            "reflection",
            "source",
            "report_text",
          ] as const
        ).map((k) => (
          <label key={k}>
            {fieldNames[k]}
            <textarea
              rows={3}
              value={data[k] ?? ""}
              onChange={(e) => setData({ ...data, [k]: e.target.value })}
            />
          </label>
        ))}
        <details>
          <summary>ارتباط بعناصر إضافية مع التبرير</summary>
          <p className="muted">
            JSON: رقم العنصر criterion وسبب الارتباط reason. لا تُحسب مرتين في الاكتمال.
          </p>
          <textarea dir="ltr" rows={5} value={extra} onChange={(e) => setExtra(e.target.value)} />
        </details>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.featured}
            onChange={(e) => setData({ ...data, featured: e.target.checked })}
          />{" "}
          إبراز الممارسة في الرئيسية
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.submitted_for_review}
            onChange={(e) => setData({ ...data, submitted_for_review: e.target.checked })}
          />{" "}
          جاهز للإرسال إلى المراجعة
        </label>
        <label>
          إضافة أصول الصور والمرفقات
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        <p className="muted">
          20 ميجابايت لكل ملف. تُحفظ الملفات دون قص أو تعديل. المرفقات السابقة تبقى محفوظة.
        </p>
        {missingFields({ kind, data }).length > 0 && (
          <Notice>
            لاعتبار الشاهد مكتملًا يلزم:{" "}
            {missingFields({ kind, data })
              .map((k) => fieldNames[k])
              .join("، ")}
            .
          </Notice>
        )}
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button className="primary-button" disabled={busy || !settings.periods.length}>
            <Save size={17} />
            {busy ? "جارٍ حفظ الحزمة…" : "حفظ الشاهد والنسخة"}
          </button>
          <button type="button" disabled={busy} onClick={onClose}>
            إلغاء
          </button>
        </div>
      </form>
    </dialog>
  );
}
export function EvidenceDetail({
  evidence: e,
  settings,
  attachments,
  reviews,
  owner,
  reviewer,
  onBack,
  onEdit,
  onRefresh,
}: {
  evidence: Evidence;
  settings: Settings;
  attachments: Attachment[];
  reviews: Review[];
  owner: boolean;
  reviewer: boolean;
  onBack: () => void;
  onEdit: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [reviewStatus, setReviewStatus] = useState("reviewed");
  const [versions, setVersions] = useState<
    { version: number; snapshot: Evidence & { attachments?: Attachment[] }; changed_at: string }[]
  >([]);
  const [historical, setHistorical] = useState<(Evidence & { attachments?: Attachment[] }) | null>(
    null,
  );
  const [urls, setUrls] = useState<Record<string, string>>({});
  const latest = reviews[0];
  useEffect(() => {
    let active = true;
    const created: string[] = [];
    Promise.all(
      attachments.map(async (a) => {
        const url = await attachmentUrl(a);
        created.push(url);
        return [a.id, url] as const;
      }),
    )
      .then((v) => {
        if (active) setUrls(Object.fromEntries(v));
      })
      .catch((err) => {
        if (active) setError(errorText(err));
      });
    return () => {
      active = false;
      created.forEach((u) => {
        if (u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
    };
  }, [attachments]);
  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await onRefresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  async function history() {
    try {
      const { data, error } = await db
        .from("portfolio_versions")
        .select("version,snapshot,changed_at")
        .eq("evidence_id", e.id)
        .order("version", { ascending: false });
      if (error) throw error;
      setVersions(data ?? []);
    } catch (err) {
      setError(errorText(err));
    }
  }
  return (
    <>
      <button className="text-button" onClick={onBack}>
        العودة إلى المكتبة
      </button>
      <PageTitle
        eyebrow={`العنصر ${e.criterion} • نسخة ${e.version}`}
        title={e.title}
        action={owner ? <button onClick={onEdit}>تعديل الشاهد</button> : undefined}
      />
      <div className="actions">
        <span className={`status status-${e.status}`}>{statusNames[e.status]}</span>
        <span className="pill">{kinds[e.kind]}</span>
        <span className="pill">
          {latest
            ? latest.version !== e.version
              ? "تغير بعد المراجعة"
              : latest.status === "reviewed"
                ? "تمت المراجعة"
                : latest.status === "changes_requested"
                  ? "يحتاج تعديلًا"
                  : "بانتظار المراجعة"
            : e.data.submitted_for_review
              ? "بانتظار المراجعة"
              : "لم يُرسل للمراجعة"}
        </span>
      </div>
      <Notice>
        اكتمال بيانات الشاهد ومراجعة المدير حالتان مستقلتان. الصورة وحدها لا تثبت تحسن نتائج الطلاب.
      </Notice>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <div className="actions">
        <button
          disabled={busy}
          onClick={() =>
            exportEvidence(e, settings, attachments).catch((err) => setError(errorText(err)))
          }
        >
          <Download size={17} /> التقرير PDF / طباعة
        </button>
        <button
          disabled={busy || Object.keys(urls).length !== attachments.length}
          onClick={() =>
            exportReportPng(e, settings, attachments, urls).catch((err) => setError(errorText(err)))
          }
        >
          <FileImage size={17} /> صور التقرير PNG
        </button>
        {owner && (
          <>
            <button onClick={history}>سجل النسخ ({e.version})</button>
            <button
              disabled={busy}
              onClick={() =>
                act(() => changeStatus(e, e.status === "archived" ? "restore" : "archive"))
              }
            >
              {e.status === "archived" ? <RotateCcw size={17} /> : <Archive size={17} />}{" "}
              {e.status === "archived" ? "استرجاع كمسودة" : "أرشفة"}
            </button>
          </>
        )}
      </div>
      {versions.length > 0 && (
        <Panel>
          <h2>النسخ السابقة</h2>
          <div className="actions">
            {versions.map((v) => (
              <button key={v.version} onClick={() => setHistorical(v.snapshot)}>
                نسخة {v.version} —{" "}
                {new Date(v.changed_at).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}
              </button>
            ))}
            <button onClick={() => setHistorical(null)}>عرض الحالية</button>
          </div>
        </Panel>
      )}
      {historical && (
        <Panel>
          <h2>نسخة سابقة للقراءة — {historical.version}</h2>
          <p>{historical.title}</p>
          <dl className="report-fields">
            {Object.entries(fieldNames).map(
              ([k, label]) =>
                historical.data[k as keyof EvidenceData] && (
                  <div key={k}>
                    <dt>{label}</dt>
                    <dd>{String(historical.data[k as keyof EvidenceData])}</dd>
                  </div>
                ),
            )}
          </dl>
          <p>{historical.attachments?.length ?? 0} مرفقات عند حفظ النسخة.</p>
        </Panel>
      )}
      <Report evidence={e} settings={settings} attachments={attachments} urls={urls} />
      <Panel>
        <h2>الأصول والمرفقات</h2>
        {attachments.length ? (
          <div className="attachment-grid">
            {attachments.map((a) => (
              <OriginalPreview key={a.id} attachment={a} />
            ))}
          </div>
        ) : (
          <p className="muted">لا توجد مرفقات محفوظة لهذا الشاهد.</p>
        )}
      </Panel>
      {reviewer && (
        <Panel>
          <h2>مراجعة الشاهد — النسخة {e.version}</h2>
          <form
            className="form-stack"
            onSubmit={(ev) => {
              ev.preventDefault();
              void act(() =>
                rpc("portfolio_review", {
                  p_evidence: e.id,
                  p_version: e.version,
                  p_status: reviewStatus,
                  p_note: note,
                }),
              );
            }}
          >
            <label>
              نتيجة المراجعة
              <select
                aria-label="نتيجة المراجعة"
                value={reviewStatus}
                onChange={(ev) => setReviewStatus(ev.target.value)}
              >
                <option value="reviewed">تمت المراجعة</option>
                <option value="changes_requested">يحتاج تعديلًا</option>
              </select>
            </label>
            <label>
              الملاحظة
              <textarea
                required={reviewStatus === "changes_requested"}
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
              />
            </label>
            <button className="primary-button" disabled={busy}>
              تسجيل المراجعة على هذه النسخة
            </button>
          </form>
        </Panel>
      )}
      <Panel>
        <h2>سجل المراجعة</h2>
        {reviews.length ? (
          reviews.map((r) => (
            <div className="review-row" key={r.id}>
              <strong>
                {r.status === "reviewed"
                  ? "تمت المراجعة"
                  : r.status === "changes_requested"
                    ? "طلب تعديل"
                    : "بانتظار المراجعة"}
              </strong>
              <p>{r.note}</p>
              <small>
                {r.reviewer_email} · نسخة {r.version} ·{" "}
                {new Date(r.created_at).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}
              </small>
            </div>
          ))
        ) : (
          <p className="muted">لا توجد مراجعة مسجلة.</p>
        )}
      </Panel>
    </>
  );
}
export function ImportPanel({
  settings,
  refresh,
}: {
  settings: Settings;
  refresh: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  async function receive(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await importPackage(JSON.parse(text));
      setMessage(
        result.duplicate
          ? "الطلب محفوظ سابقًا؛ لم يتكرر الشاهد أو المرفقات."
          : "تم حفظ الحزمة في قاعدة البيانات بنجاح.",
      );
      await refresh();
    } catch (err) {
      setMessage(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="استقبال حزم المساعد الخارجي">
        يجهز ChatGPT المحتوى؛ يحفظ الموقع البيانات والصور الأصلية دون تشغيل ذكاء اصطناعي داخله.
      </PageTitle>
      <Notice>
        استيراد الحزمة وسيلة احتياطية. الإرسال التلقائي من محادثة ChatGPT يحتاج موصل HTTP يَحفظ
        مفتاح التكامل بأمان، ولم يُربط بعد. لا تُرسل المفتاح في المحادثة. مسار إدارة عبر موصل
        Lovable مُجهّز أيضًا، لكنه يتطلب تطبيق حزمة القاعدة واختبار الإضافة قبل اعتباره متصلًا.
      </Notice>
      <Panel>
        <h2>استيراد حزمة جاهزة</h2>
        <p>
          اختر JSON من المساعد. تُراجع الحزمة وتتحقق بصمات الملفات قبل الحفظ. أعد إرسال الحزمة نفسها
          بأمان عند انقطاع الاتصال.
        </p>
        <label className="file-drop">
          <Upload />
          <span>اختيار حزمة JSON</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 100 * 1024 * 1024) {
                setMessage("حجم الحزمة أكبر من 100 ميجابايت؛ قسّمها إلى طلبات إرفاق.");
                return;
              }
              setText(await file.text());
              setPreview(null);
              setMessage("");
            }}
          />
        </label>
        <form className="form-stack" onSubmit={receive}>
          <label>
            محتوى الحزمة
            <textarea
              dir="ltr"
              rows={10}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setPreview(null);
              }}
              placeholder="JSON"
            />
          </label>
          <div className="actions">
            <button
              type="button"
              onClick={() => {
                try {
                  const p = JSON.parse(text);
                  setPreview({
                    operation: p.operation,
                    request_id: p.request_id,
                    evidence: p.evidence,
                    attachments: p.attachments?.map(
                      (a: { name: string; mime: string; sha256: string }) => ({
                        name: a.name,
                        mime: a.mime,
                        sha256: a.sha256,
                      }),
                    ),
                  });
                  setMessage("");
                } catch {
                  setMessage("صيغة JSON غير صحيحة.");
                }
              }}
            >
              معاينة البيانات
            </button>
            <button className="primary-button" disabled={!text || busy || !preview}>
              {busy ? "جارٍ التحقق والحفظ…" : "حفظ الحزمة"}
            </button>
            <button
              type="button"
              onClick={() => downloadJson(examplePackage, "evidence-package-template.json")}
            >
              تنزيل بنية الحزمة
            </button>
          </div>
          {preview && (
            <pre className="json-preview" dir="ltr">
              {JSON.stringify(preview, null, 2)}
            </pre>
          )}
          {message && <p role="status">{message}</p>}
        </form>
      </Panel>
      <Panel>
        <h2>معرفات الفترات والمستهدفات</h2>
        <p className="muted">أرسل هذه البيانات للمساعد ليستخدم التصنيف الصحيح.</p>
        <button
          onClick={() =>
            downloadJson(
              {
                periods: settings.periods,
                current_period: settings.current_period,
                criteria: settings.criteria,
                targets: settings.targets,
              },
              "portfolio-context.json",
            )
          }
        >
          تنزيل سياق الملف
        </button>
        <h3>النواقص الحالية</h3>
        {completion(settings, [], settings.current_period)
          .rows.filter((r) => r.targets.length)
          .map((r) => (
            <p key={r.criterion.id}>
              {r.criterion.name}: {r.targets.length} شواهد مستهدفة — راجع المكتبة لمعرفة المنجز.
            </p>
          ))}
      </Panel>
    </>
  );
}
export function SettingsPanel({
  settings,
  version,
  refresh,
}: {
  settings: Settings;
  version: number;
  refresh: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Settings>(() => structuredClone(settings));
  const [tab, setTab] = useState("teacher");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [json, setJson] = useState("");
  const update = (key: keyof Settings, value: unknown) => setDraft({ ...draft, [key]: value });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      settingsSchema.parse(draft);
      await saveSettings(draft, version);
      setMessage("حُفظت الإعدادات مع نسختها السابقة.");
      await refresh();
    } catch (err) {
      setMessage(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  function structuredTab(key: "goals" | "career" | "schedules" | "criteria" | "standard") {
    setTab(key);
    setJson(JSON.stringify(draft[key], null, 2));
  }
  return (
    <>
      <PageTitle title="إعدادات الملف">
        مصدر مركزي للبيانات، مع حفظ النسخ السابقة عند التحديث.
      </PageTitle>
      <div className="settings-tabs">
        {[
          ["teacher", "بيانات المعلم"],
          ["vision", "الرؤية والتأمل"],
          ["periods", "الأعوام والفترات"],
          ["targets", "مستهدفات التوثيق"],
        ].map(([id, label]) => (
          <button
            className={tab === id ? "primary-button" : ""}
            key={id}
            onClick={() => setTab(id!)}
          >
            {label}
          </button>
        ))}
        {[
          ["goals", "الأهداف"],
          ["career", "السيرة والدورات"],
          ["schedules", "الجدول"],
          ["criteria", "عناصر الأداء"],
          ["standard", "مرجع المعايير"],
        ].map(([id, label]) => (
          <button
            className={tab === id ? "primary-button" : ""}
            key={id}
            onClick={() => structuredTab(id as "goals")}
          >
            {label}
          </button>
        ))}
      </div>
      <form className="form-stack" onSubmit={save}>
        <Panel>
          {tab === "teacher" && (
            <>
              <h2>البيانات الأساسية</h2>
              <div className="two-columns">
                {Object.entries({
                  name: "اسم المعلم",
                  subject: "المادة",
                  school: "المدرسة",
                  administration: "الإدارة",
                  director: "مدير المدرسة",
                  audience: "الفئة المعتادة",
                  qualification: "المؤهل — عند توفره",
                  rank: "الرتبة — عند توفرها",
                  experience: "الخبرات — عند توفرها",
                  license: "الرخصة المهنية — عند توفرها",
                  contact: "وسيلة تواصل مختارة — اختيارية",
                }).map(([k, label]) => (
                  <label key={k}>
                    {label}
                    <input
                      value={draft.teacher[k as keyof Settings["teacher"]] ?? ""}
                      onChange={(e) => update("teacher", { ...draft.teacher, [k]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
              <label>
                النبذة
                <textarea
                  rows={5}
                  value={draft.teacher.bio}
                  onChange={(e) => update("teacher", { ...draft.teacher, bio: e.target.value })}
                />
              </label>
              <p className="muted">
                المنطقة الزمنية: Asia/Riyadh. لا يلزم رقم هوية أو تاريخ ميلاد أو هاتف شخصي.
              </p>
            </>
          )}
          {tab === "vision" && (
            <>
              <h2>الرؤية والرسالة والتأمل المهني</h2>
              {(["vision", "mission", "reflection", "improvement"] as const).map((k, i) => (
                <label key={k}>
                  {["الرؤية", "الرسالة", "التأمل المهني", "خطة التحسين"][i]}
                  <textarea rows={4} value={draft[k]} onChange={(e) => update(k, e.target.value)} />
                </label>
              ))}
              <label>
                القيم — قيمة في كل سطر
                <textarea
                  value={draft.values.join("\n")}
                  onChange={(e) => update("values", e.target.value.split("\n"))}
                />
              </label>
            </>
          )}
          {tab === "periods" && (
            <>
              <h2>الأعوام وفترات الملف</h2>
              <p className="muted">أرشف العام السابق بدل حذفه للحفاظ على الشواهد.</p>
              {draft.periods.map((p, i) => (
                <div className="setting-row" key={p.id}>
                  <label>
                    الاسم
                    <input
                      required
                      value={p.name}
                      onChange={(e) =>
                        update(
                          "periods",
                          draft.periods.map((x, j) =>
                            j === i ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    البداية
                    <input
                      type="date"
                      value={p.start ?? ""}
                      onChange={(e) =>
                        update(
                          "periods",
                          draft.periods.map((x, j) =>
                            j === i ? { ...x, start: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    النهاية
                    <input
                      type="date"
                      value={p.end ?? ""}
                      onChange={(e) =>
                        update(
                          "periods",
                          draft.periods.map((x, j) =>
                            j === i ? { ...x, end: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={p.archived}
                      onChange={(e) =>
                        update(
                          "periods",
                          draft.periods.map((x, j) =>
                            j === i ? { ...x, archived: e.target.checked } : x,
                          ),
                        )
                      }
                    />{" "}
                    أرشيف
                  </label>
                  <small dir="ltr">{p.id}</small>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update("periods", [
                    ...draft.periods,
                    { id: crypto.randomUUID(), name: "", archived: false },
                  ])
                }
              >
                <Plus size={16} /> إضافة فترة
              </button>
              <label>
                الفترة الحالية
                <select
                  aria-label="الفترة الحالية"
                  value={draft.current_period}
                  onChange={(e) => update("current_period", e.target.value)}
                >
                  <option value="">لم تُحدد</option>
                  {draft.periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {tab === "targets" && (
            <>
              <h2>الشواهد المستهدفة</h2>
              <Notice>
                هذه خطة توثيقك الشخصية. لا يفرض النظام عددًا باسم الوزارة. الشاهد المستهدف يحسب مرة
                واحدة مهما زادت الصور.
              </Notice>
              {draft.targets.map((t, i) => (
                <div className="setting-row" key={t.id}>
                  <label>
                    الفترة
                    <select
                      aria-label="الفترة"
                      value={t.period_id}
                      onChange={(e) =>
                        update(
                          "targets",
                          draft.targets.map((x, j) =>
                            i === j ? { ...x, period_id: e.target.value } : x,
                          ),
                        )
                      }
                    >
                      <option value="">اختر</option>
                      {draft.periods.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    العنصر
                    <select
                      aria-label="العنصر"
                      value={t.criterion}
                      onChange={(e) =>
                        update(
                          "targets",
                          draft.targets.map((x, j) =>
                            i === j ? { ...x, criterion: Number(e.target.value) } : x,
                          ),
                        )
                      }
                    >
                      {draft.criteria.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.id}. {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    المستهدف
                    <input
                      required
                      value={t.title}
                      onChange={(e) =>
                        update(
                          "targets",
                          draft.targets.map((x, j) =>
                            i === j ? { ...x, title: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                  <small dir="ltr">{t.id}</small>
                </div>
              ))}
              <button
                type="button"
                disabled={!draft.current_period}
                onClick={() =>
                  update("targets", [
                    ...draft.targets,
                    {
                      id: crypto.randomUUID(),
                      period_id: draft.current_period,
                      criterion: 4,
                      title: "",
                    },
                  ])
                }
              >
                <Plus size={16} /> إضافة مستهدف
              </button>
            </>
          )}
          {["goals", "career", "schedules", "criteria", "standard"].includes(tab) && (
            <>
              <h2>استقبال بيانات منظمة</h2>
              <p>
                يمكن للمساعد تجهيز هذا الجزء بصيغة JSON. تُتحقق البنية قبل اعتماد التعديل، والحفظ
                النهائي يحتفظ بالنسخة السابقة.
              </p>
              {tab === "schedules" && (
                <Notice>
                  أضف نسخة جدول جديدة إلى القائمة مع إبقاء السابقة. الأيام: 0 الأحد إلى 4 الخميس.
                  duty: تدريس، انتظار، مناوبة، أو غيره. الصورة الأصلية تُرفق ضمن حزمة إعدادات
                  المساعد ويشار إلى مسارها بـ original_path.
                </Notice>
              )}
              {tab === "goals" && (
                <Notice>
                  لا تضف progress إلا إذا وُجد indicator فعلي يمكن متابعته. عدد التقارير ليس نسبة
                  تحقق الهدف.
                </Notice>
              )}
              {tab === "career" && (
                <Notice>
                  type: qualification للمؤهل، experience للخبرة، course للدورة، award للتكريم. تُضاف
                  المعلومات الفعلية فقط.
                </Notice>
              )}
              <label>
                JSON
                <textarea
                  dir="ltr"
                  rows={17}
                  value={json}
                  onChange={(e) => setJson(e.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  try {
                    const candidate = { ...draft, [tab]: JSON.parse(json) };
                    settingsSchema.parse(candidate);
                    setDraft(candidate);
                    setMessage("تم التحقق من البنية. اضغط حفظ الإعدادات لتطبيقها.");
                  } catch (err) {
                    setMessage(errorText(err));
                  }
                }}
              >
                التحقق واعتماد التعديل في المسودة
              </button>
            </>
          )}
        </Panel>
        {message && <p role="status">{message}</p>}
        <div className="actions">
          <button className="primary-button" disabled={busy}>
            <Save size={17} />
            {busy ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
          </button>
          <button
            type="button"
            onClick={() => downloadJson(draft, "portfolio-settings-backup.json")}
          >
            تنزيل نسخة إعدادات
          </button>
        </div>
      </form>
      <Panel>
        <h2>الميزانية والخدمات</h2>
        <p>
          القاعدة الحالية: Lovable Cloud / Supabase. لم تُضف اشتراكات أو خدمات ذكاء اصطناعي أو
          مفاتيح OpenAI. حدود التخزين والبناء والنقل تتبع خطة حسابك الفعلية؛ أرقام الحصة المتاحة لا
          تظهر عبر الاتصال الحالي.
        </p>
        <a
          target="_blank"
          rel="noreferrer"
          href="https://lovable.dev/projects/379cc9dd-1e37-48b1-9421-9ee990363a78"
        >
          فتح المشروع ومراجعة الاستهلاك في Lovable
        </a>
      </Panel>
    </>
  );
}
type ShareRow = {
  id: string;
  email: string;
  role: string;
  evidence_ids: string[];
  sections: string[];
  expires_at: string;
  revoked_at: string | null;
};
type KeyRow = { id: string; label: string; expires_at: string; revoked_at: string | null };
export function SharingPanel({
  evidence,
  refresh,
}: {
  evidence: Evidence[];
  refresh: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("reviewer");
  const [selected, setSelected] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [days, setDays] = useState(14);
  const [url, setUrl] = useState("");
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [key, setKey] = useState("");
  const [keyLabel, setKeyLabel] = useState("المساعد الخارجي");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const [s, k] = await Promise.all([
      db
        .from("portfolio_shares")
        .select("id,email,role,evidence_ids,sections,expires_at,revoked_at")
        .order("created_at", { ascending: false }),
      db
        .from("portfolio_keys")
        .select("id,label,expires_at,revoked_at")
        .order("created_at", { ascending: false }),
    ]);
    if (s.error || k.error) {
      setMessage(errorText(s.error || k.error));
      return;
    }
    setShares(s.data ?? []);
    setKeys(k.data ?? []);
  }
  useEffect(() => {
    void load();
  }, []);
  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await load();
    } catch (err) {
      setMessage(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    await perform(async () => {
      const token = await rpc<string>("portfolio_create_share", {
        p_email: email,
        p_role: role,
        p_evidence: selected,
        p_sections: sections,
        p_days: days,
      });
      setUrl(`${window.location.origin}/?share=${token}`);
    });
  }
  async function revoke(table: string, id: string) {
    await perform(async () => {
      const { error } = await db
        .from(table)
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await refresh();
    });
  }
  return (
    <>
      <PageTitle title="المشاركة ومراجعة المدير">
        دعوة محددة بالبريد، وبنطاق الشواهد، وصلاحية زمنية قابلة للإلغاء.
      </PageTitle>
      <Notice>
        لا يستطيع المراجع تعديل المحتوى. تسجيل المراجعة ليس توقيعًا إلكترونيًا قانونيًا ولا تقييمًا
        رسميًا في فارس.
      </Notice>
      <Panel>
        <h2>إنشاء دعوة</h2>
        <form className="form-stack" onSubmit={create}>
          <div className="two-columns">
            <label>
              بريد المدعو
              <input
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              الصلاحية
              <select aria-label="الصلاحية" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="reviewer">مراجع — اطلاع وملاحظات</option>
                <option value="visitor">زائر مدعو — اطلاع فقط</option>
              </select>
            </label>
            <label>
              مدة الرابط بالأيام
              <input
                type="number"
                min={1}
                max={90}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </label>
          </div>
          <fieldset>
            <legend>الشواهد المسموح بها فقط</legend>
            {evidence.length ? (
              evidence.map((e) => (
                <label className="checkbox-label" key={e.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(e.id)}
                    onChange={(ev) =>
                      setSelected(
                        ev.target.checked
                          ? [...selected, e.id]
                          : selected.filter((x) => x !== e.id),
                      )
                    }
                  />
                  {e.title}
                </label>
              ))
            ) : (
              <p className="muted">أضف الشواهد أولًا لتضمينها في الدعوة.</p>
            )}
          </fieldset>
          <fieldset>
            <legend>أقسام إضافية — غير محددة افتراضيًا</legend>
            {[
              ["career", "السيرة والتطوير"],
              ["vision", "الرؤية"],
              ["mission", "الرسالة"],
              ["values", "القيم"],
              ["goals", "الأهداف"],
              ["schedules", "الجدول"],
              ["reflection", "التأمل"],
              ["improvement", "خطة التحسين"],
            ].map(([id, label]) => (
              <label className="checkbox-label" key={id}>
                <input
                  type="checkbox"
                  checked={sections.includes(id!)}
                  onChange={(e) =>
                    setSections(
                      e.target.checked ? [...sections, id!] : sections.filter((s) => s !== id),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <button
            className="primary-button"
            disabled={busy || (!selected.length && !sections.length)}
          >
            إنشاء رابط الدعوة
          </button>
        </form>
        {url && (
          <div className="secret-result">
            <p>انسخ الرابط وأرسله للمدعو. سيسجل الدخول بالبريد المحدد. يُعرض الرابط الآن فقط.</p>
            <input
              aria-label="رابط الدعوة"
              readOnly
              value={url}
              dir="ltr"
              onFocus={(e) => e.target.select()}
            />
          </div>
        )}
      </Panel>
      <Panel>
        <h2>الدعوات</h2>
        {shares.length ? (
          shares.map((s) => (
            <div className="review-row" key={s.id}>
              <strong>{s.email}</strong>
              <p>
                {s.evidence_ids.length} شواهد · حتى {s.expires_at.slice(0, 10)} ·{" "}
                {s.revoked_at ? "ملغاة" : "نشطة حتى انتهاء المدة"}
              </p>
              {!s.revoked_at && (
                <button disabled={busy} onClick={() => revoke("portfolio_shares", s.id)}>
                  إلغاء الوصول
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="muted">لا توجد دعوات.</p>
        )}
      </Panel>
      <Panel>
        <h2>مفتاح التكامل الخارجي</h2>
        <Notice>
          إنشاء المفتاح لا يربط ChatGPT تلقائيًا. احفظه في أسرار موصل HTTP الموثوق فقط، ولا تضعه في
          الكود أو GitHub أو المحادثة. يمكنه إدارة محتوى الملف ضمن مدة صلاحيته.
        </Notice>
        <label>
          اسم الاتصال
          <input value={keyLabel} onChange={(e) => setKeyLabel(e.target.value)} />
        </label>
        <button
          disabled={busy || !keyLabel.trim()}
          onClick={() =>
            perform(async () =>
              setKey(await rpc<string>("portfolio_create_key", { p_label: keyLabel, p_days: 30 })),
            )
          }
        >
          إنشاء مفتاح لمدة 30 يومًا
        </button>
        {key && (
          <div className="secret-result">
            <p>يُعرض مرة واحدة. انسخه إلى مخزن الأسرار ثم أخفه.</p>
            <input
              aria-label="مفتاح التكامل"
              dir="ltr"
              value={key}
              readOnly
              onFocus={(e) => e.target.select()}
            />
            <button onClick={() => setKey("")}>إخفاء المفتاح</button>
          </div>
        )}
        {keys.map((k) => (
          <div className="review-row" key={k.id}>
            <strong>{k.label}</strong>
            <p>
              ينتهي: {k.expires_at.slice(0, 10)} · {k.revoked_at ? "ملغى" : "غير ملغى"}
            </p>
            {!k.revoked_at && (
              <button disabled={busy} onClick={() => revoke("portfolio_keys", k.id)}>
                إلغاء المفتاح
              </button>
            )}
          </div>
        ))}
      </Panel>
      {message && <p role="status">{message}</p>}
    </>
  );
}
