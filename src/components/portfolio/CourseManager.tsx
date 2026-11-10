import { useEffect, useRef, useState } from "react";
import {
  courseInputSchema,
  courseDocument,
  loadCourses,
  saveCoursePackage,
  type Course,
} from "@/lib/portfolio/courses";
import { errorText, filePackage } from "@/lib/portfolio/api";
import "./courses.css";
type Draft = {
  title: string;
  provider: string;
  date_label: string;
  duration: string;
  unit: "hours" | "days";
  is_public: boolean;
};
const blank: Draft = {
  title: "",
  provider: "",
  date_label: "",
  duration: "",
  unit: "hours",
  is_public: true,
};
export function CourseManager() {
  const [rows, setRows] = useState<Course[]>([]);
  const [editing, setEditing] = useState<Course | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [publishOriginal, setPublishOriginal] = useState(false);
  const [withdraw, setWithdraw] = useState(false);
  const original = useRef<HTMLInputElement>(null);
  const publicCopy = useRef<HTMLInputElement>(null);
  async function refresh() {
    setRows(await loadCourses(true));
  }
  useEffect(() => {
    refresh().catch((e) => setMessage(errorText(e)));
  }, []);
  function edit(course: Course | null) {
    setEditing(course);
    setDraft(
      course
        ? {
            title: course.title,
            provider: course.provider ?? "",
            date_label: course.date_label ?? course.execution_on ?? "",
            duration: course.duration_value === null ? "" : String(course.duration_value),
            unit: course.duration_unit ?? "hours",
            is_public: course.is_public,
          }
        : { ...blank },
    );
    setReviewed(false);
    setPublishOriginal(false);
    setWithdraw(false);
    if (original.current) original.current.value = "";
    if (publicCopy.current) publicCopy.current.value = "";
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const data = courseInputSchema.parse({
        ...(editing ? { id: editing.id, version: editing.version } : {}),
        title: draft.title,
        provider: draft.provider || null,
        date_label: draft.date_label || null,
        ...(/^\d{4}-\d{2}-\d{2}$/.test(draft.date_label)
          ? { execution_on: draft.date_label }
          : draft.date_label === (editing?.date_label ?? editing?.execution_on ?? "")
            ? {}
            : { execution_on: null }),
        duration_value: draft.duration ? Number(draft.duration) : null,
        duration_unit: draft.duration ? draft.unit : null,
        is_public: draft.is_public,
      });
      const source = original.current?.files?.[0];
      const copy = publicCopy.current?.files?.[0];
      if (publishOriginal && copy)
        throw Error("اختر نسخة النشر المنقحة أو الأصل المناسب للنشر، وليس كليهما.");
      if ((publishOriginal || copy) && !reviewed)
        throw Error("راجع خصوصية نسخة النشر وأكد خلوها من البيانات الحساسة.");
      await saveCoursePackage({
        operation: "upsert",
        course: data,
        ...(source ? { original: await filePackage(source) } : {}),
        ...(copy ? { public_copy: await filePackage(copy) } : {}),
        privacy_reviewed: reviewed,
        publish_original: publishOriginal,
        withdraw_document: withdraw,
      });
      await refresh();
      edit(null);
      setMessage("حُفظت الدورة ووثائقها، مع الاحتفاظ بالنسخة السابقة.");
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  async function archive(course: Course) {
    setBusy(true);
    setMessage("");
    try {
      await saveCoursePackage({
        operation: course.archived ? "restore" : "archive",
        course: { id: course.id, version: course.version },
      });
      await refresh();
      if (editing?.id === course.id) edit(null);
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function download(id: string) {
    setBusy(true);
    try {
      const blob = await courseDocument(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `أصل شهادة الدورة.${({ "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[blob.type]}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="course-editor">
      <h2>إدارة الدورات</h2>
      <p className="course-editor-notice">
        يمكنك إرسال الشهادة في محادثتك لإضافتها. هذه المساحة لتعديل البيانات أو إرفاق الوثائق عند
        الحاجة. الملفات المدعومة: PDF وJPG وPNG وWebP، بحد أقصى 20 ميجابايت للملف.
      </p>
      {message && <p role="status">{message}</p>}
      <form onSubmit={save}>
        <h3>{editing ? "تعديل الدورة" : "إضافة دورة"}</h3>
        <label>
          عنوان الدورة
          <input
            required
            maxLength={300}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <label>
          الجهة المقدمة
          <input
            maxLength={300}
            value={draft.provider}
            onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
          />
        </label>
        <label>
          تاريخ الدورة كما ورد في الشهادة
          <input
            maxLength={100}
            value={draft.date_label}
            onChange={(e) => setDraft({ ...draft, date_label: e.target.value })}
          />
        </label>
        <div className="two-columns">
          <label>
            المدة
            <input
              type="number"
              min="0.01"
              step="any"
              max="100000"
              value={draft.duration}
              onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
            />
          </label>
          <label>
            الوحدة
            <select
              value={draft.unit}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value as "hours" | "days" })}
            >
              <option value="hours">ساعات</option>
              <option value="days">أيام</option>
            </select>
          </label>
        </div>
        <label>
          الشهادة الأصلية — تحفظ خاصة
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            ref={original}
          />
        </label>
        <label>
          نسخة مناسبة للنشر بعد إخفاء البيانات الحساسة
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            ref={publicCopy}
          />
        </label>
        <p className="course-editor-notice">
          رفع الملف لا يخفي بياناته تلقائيًا. أرفق نسخة منقحة، أو انشر الأصل فقط إذا كان مناسبًا
          للمشاهدة العامة.
        </p>
        <label className="course-editor-check">
          <input
            type="checkbox"
            checked={publishOriginal}
            onChange={(e) => setPublishOriginal(e.target.checked)}
          />{" "}
          استخدام الشهادة الأصلية كنسخة للعرض العام
        </label>
        <label className="course-editor-check">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
          />{" "}
          راجعت وثيقة النشر وأزلت الهوية ورقم الموظف والتواصل ورموز التحقق الحساسة إن وجدت
        </label>
        <label className="course-editor-check">
          <input
            type="checkbox"
            checked={draft.is_public}
            onChange={(e) => setDraft({ ...draft, is_public: e.target.checked })}
          />{" "}
          إتاحة بيانات الدورة للزوار
        </label>
        {editing?.document && (
          <label className="course-editor-check">
            <input
              type="checkbox"
              checked={withdraw}
              onChange={(e) => setWithdraw(e.target.checked)}
            />{" "}
            سحب وثيقة العرض الحالية مع حفظ أصلها
          </label>
        )}
        <button className="folio-primary" disabled={busy}>
          {busy ? "جارٍ الحفظ…" : "حفظ الدورة"}
        </button>
        {editing && (
          <button type="button" onClick={() => edit(null)}>
            إلغاء التعديل
          </button>
        )}
      </form>
      {rows.map((course) => (
        <div className="course-admin-row" key={course.id}>
          <strong>{course.title}</strong>
          <small>
            {course.archived ? "مؤرشفة" : course.is_public ? "متاحة للزوار" : "خاصة"} · النسخة{" "}
            {course.version}
          </small>
          <button disabled={busy} onClick={() => edit(course)}>
            تعديل
          </button>
          <button disabled={busy} onClick={() => archive(course)}>
            {course.archived ? "استرجاع" : "أرشفة"}
          </button>
          {course.original_document && (
            <button disabled={busy} onClick={() => download(course.original_document!)}>
              تنزيل الأصل
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
