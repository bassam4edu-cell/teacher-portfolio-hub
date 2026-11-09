import { reportFields } from "@/lib/portfolio/templates";
import {
  kinds,
  statusNames,
  type Attachment,
  type Evidence,
  type EvidenceData,
  type Settings,
} from "@/lib/portfolio/model";
export function Report({
  evidence: e,
  settings: s,
  attachments,
  urls,
}: {
  evidence: Evidence;
  settings: Settings;
  attachments: Attachment[];
  urls: Record<string, string>;
}) {
  return (
    <article className="report-preview">
      <header className="report-header">
        <div>
          <strong>{s.teacher.administration}</strong>
          <p>{s.teacher.school}</p>
        </div>
        <div className="report-stamp">
          توثيق ممارسة مهنية<small>ملف شخصي للمعلم</small>
        </div>
      </header>
      <div className="report-title">
        <span>{kinds[e.kind]}</span>
        <h2>{e.title}</h2>
        <p>{s.criteria.find((c) => c.id === e.criterion)?.name}</p>
      </div>
      <dl className="report-fields">
        {reportFields(e.kind).map(([key, label]) => {
          const value = e.data[key as keyof EvidenceData];
          return (
            value !== undefined &&
            value !== "" && (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{String(value)}</dd>
              </div>
            )
          );
        })}
      </dl>
      {!e.data.execution_on && (
        <p className="muted">تاريخ التنفيذ غير محدد؛ تاريخ الرفع لا يُعد تاريخ التنفيذ.</p>
      )}
      {e.data.additional_criteria?.length > 0 && (
        <div>
          <h3>ارتباطات إضافية</h3>
          {e.data.additional_criteria.map((c) => (
            <p key={c.criterion}>
              العنصر {c.criterion}: {c.reason}
            </p>
          ))}
        </div>
      )}
      {attachments
        .filter((a) => a.mime.startsWith("image/"))
        .map(
          (a) =>
            urls[a.id] && (
              <figure key={a.id}>
                <img src={urls[a.id]} alt={a.name} />
                <figcaption>{a.name} — الأصل محفوظ دون تعديل</figcaption>
              </figure>
            ),
        )}
      <footer className="report-signatures">
        <span>إعداد المعلم: {s.teacher.name}</span>
        <span>مدير المدرسة: {s.teacher.director}</span>
      </footer>
      <p className="report-disclaimer">
        ظهور اسم المدير لا يعني اعتماد الشاهد. حالة البيانات: {statusNames[e.status]} · النسخة{" "}
        {e.version}
      </p>
    </article>
  );
}
