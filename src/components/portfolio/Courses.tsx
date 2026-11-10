import { useEffect, useState } from "react";
import {
  Award,
  CalendarDays,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
} from "lucide-react";
import type { Settings } from "@/lib/portfolio/model";
import {
  courseDate,
  courseDuration,
  courseDocument,
  courseTotals,
  loadCourses,
  type Course,
} from "@/lib/portfolio/courses";
import { errorText } from "@/lib/portfolio/api";
import { printCourses } from "@/lib/portfolio/course-export";
import "./courses.css";
export function Courses({ settings, revision }: { settings: Settings; revision: number }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [include, setInclude] = useState(false);
  const [busy, setBusy] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    loadCourses()
      .then((rows) => {
        if (active) {
          setCourses(rows);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision, retry]);
  const totals = courseTotals(courses);
  async function document(course: Course) {
    if (!course.document) return;
    const win = window.open("", "_blank");
    if (!win) {
      setError("اسمح بفتح نافذة الشهادة.");
      return;
    }
    win.document.body.textContent = "جارٍ تحميل الشهادة…";
    setBusy(course.id);
    try {
      const blob = await courseDocument(course.document.id);
      const url = URL.createObjectURL(blob);
      const body = win.document.body;
      body.textContent = "";
      body.style.margin = "0";
      if (blob.type === "application/pdf") {
        const frame = win.document.createElement("iframe");
        frame.src = url;
        frame.title = course.title;
        frame.style.cssText = "border:0;width:100vw;height:100vh";
        body.append(frame);
      } else {
        const image = win.document.createElement("img");
        image.src = url;
        image.alt = course.title;
        image.style.cssText = "display:block;max-width:100%;height:auto;margin:auto";
        body.append(image);
      }
      win.document.title = course.title;
      const link = win.document.createElement("a");
      link.href = url;
      link.download = `شهادة الدورة.${({ "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[blob.type]}`;
      link.textContent = "تنزيل الشهادة";
      link.style.cssText = "display:block;padding:16px;text-align:center";
      body.append(link);
      win.addEventListener("pagehide", () => URL.revokeObjectURL(url), { once: true });
    } catch (e) {
      setError(errorText(e));
      win.document.body.textContent = "تعذر تحميل الشهادة، أعد المحاولة من صفحة الدورات.";
    } finally {
      setBusy("");
    }
  }
  async function print(rows: Course[], certificates: boolean, id: string) {
    setBusy(id);
    setError("");
    try {
      await printCourses(rows, settings, certificates);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="courses-page">
      <div className="folio-page-title">
        <div>
          <span className="folio-eyebrow">تعلّم مستمر وأثر مهني</span>
          <h1>الدورات والتطوير المهني</h1>
          <p>الدورات التدريبية ووثائقها، مرتبة في سجل واحد.</p>
        </div>
      </div>
      <section className="courses-cover">
        <div className="courses-cover-icon">
          <Award size={36} strokeWidth={1.3} />
        </div>
        <div>
          <span>التطوير المهني</span>
          <h2>كل تعلّم، خطوة للأمام.</h2>
          <p>سجل الدورات التدريبية للمعلم {settings.teacher.name}</p>
        </div>
      </section>
      {error && (
        <div className="courses-error" role="alert">
          <p>{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setRetry((x) => x + 1);
            }}
          >
            <RefreshCw size={16} /> إعادة المحاولة
          </button>
        </div>
      )}
      {loading ? (
        <p role="status" className="courses-loading">
          جارٍ تحميل الدورات…
        </p>
      ) : (
        <>
          <div className="courses-stats">
            <div>
              <strong>{totals.count}</strong>
              <span>دورة مسجلة</span>
            </div>
            <div>
              <strong>{totals.hours}</strong>
              <span>ساعة تدريبية موثقة</span>
            </div>
            {totals.days > 0 && (
              <div>
                <strong>{totals.days}</strong>
                <span>يوم تدريبي موثق</span>
              </div>
            )}
          </div>
          {courses.length > 0 ? (
            <>
              <div className="courses-toolbar">
                <label>
                  <input
                    type="checkbox"
                    checked={include}
                    onChange={(e) => setInclude(e.target.checked)}
                  />{" "}
                  إرفاق الشهادات في صفحات تالية
                </label>
                <button
                  className="folio-primary"
                  disabled={!!busy}
                  onClick={() => print(courses, include, "all")}
                >
                  <Download size={17} />
                  {busy === "all" ? "جارٍ تجهيز التقرير…" : "طباعة تقرير الدورات"}
                </button>
              </div>
              <p className="courses-total-note">
                تُجمع الساعات المسجلة بالساعات فقط، وتبقى مدد الأيام منفصلة.
                {totals.unknown > 0 ? ` ${totals.unknown} دورة لم تحدد مدتها.` : ""}
              </p>
              <div className="courses-grid">
                {courses.map((course) => (
                  <article className="course-card" key={course.id}>
                    <div className="course-card-heading">
                      <span className="course-card-icon">
                        <Award size={22} strokeWidth={1.5} />
                      </span>
                      <span className="course-card-duration">
                        <Clock3 size={14} />
                        {courseDuration(course)}
                      </span>
                    </div>
                    <h2>{course.title}</h2>
                    {course.provider && <p className="course-provider">{course.provider}</p>}
                    <p className="course-date">
                      <CalendarDays size={15} />
                      {courseDate(course)}
                    </p>
                    <div className="course-card-actions">
                      {course.document ? (
                        <button disabled={!!busy} onClick={() => document(course)}>
                          <ExternalLink size={16} />
                          عرض الشهادة
                        </button>
                      ) : (
                        <span className="course-document-missing">
                          لم تُضف نسخة شهادة للعرض بعد
                        </span>
                      )}
                      <button disabled={!!busy} onClick={() => print([course], true, course.id)}>
                        <FileText size={16} />
                        {busy === course.id ? "جارٍ التجهيز…" : "طباعة التقرير"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            !error && (
              <div className="courses-empty">
                <Award size={44} strokeWidth={1} />
                <h2>مساحة لتوثيق تعلّمك القادم</h2>
                <p>لم تُضف دورات بعد. ستظهر هنا الدورات ووثائقها بعد إضافتها.</p>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
