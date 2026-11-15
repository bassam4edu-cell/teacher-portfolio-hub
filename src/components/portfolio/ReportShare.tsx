import { useEffect, useRef, useState, type RefObject } from "react";
import { Download, FileText, Image, Share2, X } from "lucide-react";
import { errorText } from "@/lib/portfolio/api";
import type { ReportFormat } from "@/lib/portfolio/report-share";
import "./report-share.css";
export function ReportShare({
  report,
  title,
  ready,
}: {
  report: RefObject<HTMLDivElement | null>;
  title: string;
  ready: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [notice, setNotice] = useState("");
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), [files]);
  async function prepare(format: ReportFormat) {
    if (!report.current) return;
    setBusy(true);
    setError("");
    setNotice("");
    setFiles([]);
    try {
      const { createReportFiles } = await import("@/lib/portfolio/report-share");
      const result = await createReportFiles(report.current, title, format);
      if (active.current)
        setFiles(result.map((file) => ({ file, url: URL.createObjectURL(file) })));
    } catch (e) {
      if (active.current) setError(errorText(e));
    } finally {
      if (active.current) setBusy(false);
    }
  }
  let canShare = false;
  try {
    canShare = files.length > 0 && !!navigator.canShare?.({ files: files.map((f) => f.file) });
  } catch {
    /* Download remains available. */
  }
  async function share() {
    try {
      await navigator.share({ files: files.map((f) => f.file), title });
      setNotice("تم تسليم الملفات إلى قائمة مشاركة الجهاز.");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("تعذرت المشاركة المباشرة. يمكنك تنزيل الملف وإرساله من التطبيق المطلوب.");
    }
  }
  return (
    <div className="report-extras">
      <button disabled={!ready} onClick={() => dialog.current?.showModal()}>
        <Share2 size={17} /> مشاركة التقرير
      </button>
      <dialog
        ref={dialog}
        className="report-share-dialog"
        aria-labelledby="report-share-title"
        onClick={(e) => {
          if (e.target === dialog.current && !busy) dialog.current.close();
        }}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <header>
          <div>
            <h2 id="report-share-title">مشاركة التقرير</h2>
            <p>التقرير كاملًا بنصوصه وصوره، بالقالب المعتمد.</p>
          </div>
          <button
            aria-label="إغلاق المشاركة"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </header>
        <div className="report-share-formats">
          <button disabled={busy} onClick={() => prepare("png")}>
            <Image size={23} />
            <strong>صورة PNG</strong>
            <span>صورة مستقلة لكل صفحة</span>
          </button>
          <button disabled={busy} onClick={() => prepare("pdf")}>
            <FileText size={23} />
            <strong>ملف PDF</strong>
            <span>جميع الصفحات في ملف واحد</span>
          </button>
        </div>
        <div role="status" aria-live="polite">
          {busy
            ? "جارٍ تجهيز التقرير… قد يستغرق ذلك لحظات."
            : files.length
              ? `تم تجهيز ${files.length} ${files[0]?.file.type === "application/pdf" ? "ملف PDF" : "صورة"}.`
              : notice}
        </div>
        {files.length > 0 && (
          <div className="report-share-ready">
            {canShare ? (
              <button className="folio-primary" onClick={share}>
                <Share2 size={18} /> إرسال إلى التطبيقات
              </button>
            ) : (
              <p>
                المتصفح لا يدعم مشاركة هذه الملفات مباشرة. نزّلها ثم أرسلها عبر واتساب أو تليقرام.
              </p>
            )}
            <div className="report-share-downloads">
              {files.map(({ file, url }) => (
                <a key={url} href={url} download={file.name}>
                  <Download size={17} /> تنزيل {file.type === "application/pdf" ? "PDF" : file.name}
                </a>
              ))}
            </div>
            <small>
              تظهر التطبيقات المتاحة حسب جهازك. يمكنك المشاركة أو التنزيل دون تغيير الأصل.
            </small>
            {notice && <p>{notice}</p>}
          </div>
        )}
        {error && (
          <p role="alert" className="folio-error">
            {error}
          </p>
        )}
      </dialog>
    </div>
  );
}
