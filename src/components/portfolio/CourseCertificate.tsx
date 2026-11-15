import { useEffect, useState } from "react";
import { Download, ArrowRight, RefreshCw } from "lucide-react";
import { courseDocument, loadCourses } from "@/lib/portfolio/courses";
import { errorText } from "@/lib/portfolio/api";
import "./certificate.css";
export function CourseCertificate({ id }: { id: string }) {
  const [file, setFile] = useState<{ url: string; mime: string; title: string } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true,
      url = "";
    setFile(null);
    setError("");
    (async () => {
      const courses = await loadCourses();
      if (!active) return;
      const course = courses.find((c) => c.document?.id === id);
      if (!course) throw Error("الشهادة غير متاحة للعرض العام أو لم تعد مرفقة بالدورة.");
      const blob = await courseDocument(id);
      url = URL.createObjectURL(blob);
      if (active) setFile({ url, mime: blob.type, title: course.title });
      else URL.revokeObjectURL(url);
    })().catch((err) => {
      if (active) setError(errorText(err));
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, retry]);
  return (
    <section className="certificate-view">
      <a href="#courses" className="certificate-back">
        <ArrowRight size={18} />
        العودة إلى الدورات
      </a>
      <header>
        <div>
          <h1>{file?.title || "معاينة شهادة الدورة"}</h1>
          <p>الوثيقة المنشورة للدورة</p>
        </div>
        {file && (
          <a
            className="certificate-download"
            href={file.url}
            download={`شهادة الدورة.${file.mime === "application/pdf" ? "pdf" : file.mime.split("/")[1]}`}
          >
            <Download size={18} />
            تنزيل الشهادة
          </a>
        )}
      </header>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setRetry((v) => v + 1)}>
            <RefreshCw size={17} />
            إعادة المحاولة
          </button>
        </div>
      ) : !file ? (
        <p role="status">جارٍ تحميل الشهادة…</p>
      ) : file.mime === "application/pdf" ? (
        <>
          <p className="certificate-fallback">
            إذا لم تظهر المعاينة،{" "}
            <a href={file.url} target="_blank" rel="noreferrer">
              افتح الشهادة مباشرة
            </a>{" "}
            أو نزّلها.
          </p>
          <iframe src={file.url} title={`شهادة ${file.title}`} />
        </>
      ) : (
        <img className="certificate-image" src={file.url} alt={`شهادة ${file.title}`} />
      )}
    </section>
  );
}
