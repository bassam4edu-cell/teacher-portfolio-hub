import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpLeft, CalendarDays, Check, Clock3, FileText, Globe } from "lucide-react";
import type { Settings } from "@/lib/portfolio/model";
import type { Publication } from "@/lib/portfolio/simple-report";
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
  const root = useRef<HTMLDivElement>(null);
  const visible = [...settings.criteria].sort((a, b) => a.id - b.id);
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
  }, []);
  return (
    <>
      <div className="folio-criteria reference-criteria" ref={root}>
        {visible.map((c, i) => {
          const count = reports.filter((p) => p.criterion === c.id).length;
          return (
            <button
              className="folio-criterion reference-card"
              key={c.id}
              style={{ "--card-delay": `${Math.min(i, 5) * 80}ms` } as CSSProperties}
              onClick={() => onOpen(c.id)}
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
                <span className="fc-report-count">
                  <FileText size={17} aria-hidden="true" />
                  <strong>{count} تقارير</strong>
                </span>
                <small>
                  عرض الشواهد <ArrowUpLeft size={15} />
                </small>
              </span>
            </button>
          );
        })}
      </div>
      {!visible.length && <p className="folio-empty">لم تُضف عناصر الأداء بعد.</p>}
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
