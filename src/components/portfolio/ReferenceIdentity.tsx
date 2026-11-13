import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpLeft, CalendarDays, Check, Clock3, FileText, Globe, X } from "lucide-react";
import type { Settings } from "@/lib/portfolio/model";
import type { Publication } from "@/lib/portfolio/simple-report";
import { publicReportAsset } from "@/lib/portfolio/api";
export function AcademicIcon({ index }: { index: number }) {
  return (
    <svg className="academic-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M9 49V19c9-3 15-2 23 4 8-6 14-7 23-4v30c-9-3-15-2-23 3-8-5-14-6-23-3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M32 23v29M16 29h9M16 35h9M39 35h9M39 41h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d={
          index % 3 === 0
            ? "m31 8 8 4-8 4-8-4 8-4Zm0 8v5"
            : index % 3 === 1
              ? "M40 29v-9m6 9V14m6 15V9"
              : "m41 22 4 4 9-11"
        }
        stroke="var(--reference-bronze)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="13" cy="10" r="3" fill="var(--reference-bronze)" />
    </svg>
  );
}
function EvidencePreview({ report }: { report: Publication }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    let current = "";
    const asset = report.assets[0];
    if (asset)
      publicReportAsset(asset.id)
        .then((value) => {
          current = value;
          if (active) setUrl(value);
          else URL.revokeObjectURL(value);
        })
        .catch(() => {});
    return () => {
      active = false;
      if (current) URL.revokeObjectURL(current);
    };
  }, [report.id, report.assets]);
  return (
    <a className="reference-evidence" href={`#criteria/${report.criterion}/report/${report.id}`}>
      {url ? <img src={url} alt={report.title} /> : <FileText aria-hidden="true" />}
      <div>
        <h3>{report.title}</h3>
        <span>
          {report.assets.length} صور · عرض التقرير <ArrowUpLeft size={15} />
        </span>
      </div>
    </a>
  );
}
const filters = [
  ["all", "جميع المعايير"],
  ["teaching", "الشواهد التعليمية"],
  ["technology", "المبادرات التقنية"],
  ["english", "English Teaching Artifacts"],
] as const;
export function ReferenceCriteria({
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
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<number | null>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const criterion = settings.criteria.find((c) => c.id === selected);
  const evidence = reports.filter((p) => p.criterion === selected);
  const visible = [...settings.criteria]
    .sort((a, b) => a.id - b.id)
    .filter(
      (c) =>
        filter === "all" ||
        reports.some(
          (p) =>
            p.criterion === c.id &&
            (filter === "technology"
              ? c.id === 7
              : filter === "teaching"
                ? c.id !== 7
                : /الإنجليز|الانجليز|English/i.test(p.title + " " + p.report.description)),
        ),
    );
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-entered", "true");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    root.current?.querySelectorAll(".folio-criterion").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [filter]);
  return (
    <>
      <div className="reference-filters" aria-label="تصفية عناصر الأداء">
        {filters.map(([id, label]) => (
          <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="folio-criteria reference-criteria" ref={root}>
        {visible.map((c, i) => {
          const count = reports.filter((p) => p.criterion === c.id).length;
          return (
            <button
              className="folio-criterion reference-card"
              key={c.id}
              data-populated={count > 0}
              style={{ "--card-delay": `${Math.min(i, 5) * 80}ms` } as CSSProperties}
              onClick={() => {
                setSelected(c.id);
                drawer.current?.showModal();
              }}
            >
              <span className="fc-number">{String(c.id).padStart(2, "0")}</span>
              <AcademicIcon index={c.id} />
              <div className="fc-copy">
                <h3>{c.name}</h3>
                <span className="reference-pill">
                  {compact
                    ? "الممارسة والتوثيق المهني"
                    : `عنصر الأداء ${c.id} · الوزن ${c.weight}%`}
                </span>
              </div>
              <span className="fc-meta">
                <FileText size={20} />
                <span>الشواهــــد</span>
                <strong>{count} تقارير</strong>
                <small>
                  عرض الشواهد <ArrowUpLeft size={15} />
                </small>
              </span>
            </button>
          );
        })}
      </div>
      {!visible.length && <p className="folio-empty">لم تُضف شواهد منشورة ضمن هذا التصنيف بعد.</p>}
      <dialog
        ref={drawer}
        className="reference-drawer"
        aria-label="شواهد عنصر الأداء"
        onClick={(e) => {
          if (e.target === drawer.current) drawer.current.close();
        }}
      >
        <div className="reference-drawer-heading">
          <AcademicIcon index={selected ?? 1} />
          <button aria-label="إغلاق معاينة العنصر" onClick={() => drawer.current?.close()}>
            <X />
          </button>
        </div>
        {criterion && (
          <>
            <span className="reference-pill">
              العنصر {criterion.id} · الوزن {criterion.weight}%
            </span>
            <h2>{criterion.name}</h2>
            <p>{criterion.description}</p>
            <p className="reference-drawer-count">{evidence.length} تقارير منشورة</p>
            <div
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) drawer.current?.close();
              }}
            >
              {evidence.map((report) => (
                <EvidencePreview key={report.id} report={report} />
              ))}
            </div>
            {!evidence.length && <p>لم يُضف تقرير لهذا العنصر بعد.</p>}
            <button
              className="folio-primary"
              onClick={() => {
                drawer.current?.close();
                onOpen(criterion.id);
              }}
            >
              فتح صفحة العنصر <ArrowUpLeft size={17} />
            </button>
          </>
        )}
      </dialog>
    </>
  );
}
export function VerificationZone({ settings }: { settings: Settings }) {
  const [copied, setCopied] = useState(false);
  const period = settings.periods.find((p) => p.id === settings.current_period);
  return (
    <section className="reference-verification" aria-label="معلومات الملف ومشاركته">
      <div>
        <Clock3 />
        <h2>توثيق مســــتمر</h2>
        <p>{period?.name ?? "ملف الإنجاز المهني"}</p>
        <span>التوقيت المحلي: الرياض</span>
      </div>
      <div>
        <CalendarDays />
        <h2>ملف الممارسات المهنية</h2>
        <p>
          <Check size={16} /> شواهد مرفقة بمستنداتها الأصلية
        </p>
        <p>
          <Check size={16} /> مرتبة حسب عناصر الأداء الوظيفي
        </p>
        <span>ملف شخصي للمعلم؛ لا يمثل منصة رسمية للوزارة</span>
      </div>
      <div className="reference-share">
        <a href="https://bassamport.lovable.app" aria-label="رابط ملف الإنجاز عبر رمز QR">
          <img src="/brand/portfolio-qr.svg" alt="رمز QR لرابط ملف الإنجاز" />
        </a>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText("https://bassamport.lovable.app");
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "تم نسخ الرابط" : "نسخ رابط الملف"}
        </button>
        <span role="status">{copied ? "الرابط جاهز للمشاركة" : ""}</span>
      </div>
      <a className="reference-address" href="https://bassamport.lovable.app">
        <Globe size={16} /> bassamport.lovable.app
      </a>
    </section>
  );
}
