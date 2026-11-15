import { useState } from "react";
import { CalendarDays, Check, Clock3, Globe } from "lucide-react";
import type { Settings } from "@/lib/portfolio/model";
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
export { CriteriaGrid as ReferenceCriteria } from "./CriteriaGrid";
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
