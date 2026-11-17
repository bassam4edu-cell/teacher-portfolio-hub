import { useEffect, useRef, useState } from "react";
import { Download, FileText, ArrowUpLeft } from "lucide-react";
import { errorText, publicDocumentFile } from "@/lib/portfolio/api";
import type { PublicDocument } from "@/lib/portfolio/documents";
import "./criterion-documents.css";
export function CriterionDocuments({ documents }: { documents: PublicDocument[] }) {
  if (!documents.length) return null;
  return (
    <section className="criterion-documents" aria-label="الوثائق والشواهد الأصلية">
      {documents.map((document) => (
        <DocumentCard key={document.id} document={document} />
      ))}
    </section>
  );
}
function DocumentCard({ document: record }: { document: PublicDocument }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const allocated = urls.current;
    return () => {
      for (const url of allocated) URL.revokeObjectURL(url);
      allocated.clear();
    };
  }, []);
  async function open(download: boolean) {
    const popup = download ? null : window.open("", "_blank");
    if (!download && !popup) {
      setError("اسمح بفتح نافذة الوثيقة ثم أعد المحاولة.");
      return;
    }
    if (popup) {
      popup.document.title = record.title;
      popup.document.documentElement.dir = "rtl";
      popup.document.body.textContent = "جارٍ فتح الملف الأصلي…";
    }
    setBusy(true);
    setError("");
    try {
      const file = await publicDocumentFile(record);
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      if (download) {
        const a = window.document.createElement("a");
        a.href = url;
        a.download = record.name;
        a.click();
      } else if (popup && !popup.closed) popup.location.replace(url);
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
        urls.current.delete(url);
      }, 60000);
    } catch (e) {
      setError(errorText(e));
      if (popup && !popup.closed) popup.close();
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="criterion-document-card" aria-label={record.title}>
      <span className="document-file-icon" aria-hidden="true">
        <FileText size={32} strokeWidth={1.5} />
      </span>
      <div className="document-file-copy">
        <span className="document-file-type">شاهد أصلي · PDF</span>
        <h3>{record.title}</h3>
        <p>
          {record.pages ? `${record.pages} صفحة · ` : ""}
          <bdi>{(record.size / 1024 / 1024).toFixed(1)} MB</bdi>
        </p>
      </div>
      <div className="document-file-actions">
        <button className="document-action-primary" disabled={busy} onClick={() => open(false)}>
          فتح الملف <ArrowUpLeft size={17} />
        </button>
        <button disabled={busy} onClick={() => open(true)}>
          تنزيل الأصل <Download size={17} />
        </button>
      </div>
      {busy && (
        <p className="document-file-notice" role="status">
          جارٍ تجهيز الملف الأصلي…
        </p>
      )}
      {error && (
        <p className="document-file-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
