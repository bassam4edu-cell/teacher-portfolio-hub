import type { ReactNode } from "react";
import type { Settings } from "@/lib/portfolio/model";
import { reportDate, type Publication } from "@/lib/portfolio/simple-report";
import "./simple-report.css";
export function SimpleReport({
  publication: p,
  settings: s,
  urls = {},
}: {
  publication: Publication;
  settings: Settings;
  urls?: Record<string, string>;
}) {
  const chunks = p.assets
    .filter((a) => a.mime.startsWith("image/"))
    .reduce<(typeof p.assets)[]>((result, a, i) => {
      if (i % 2 === 0) result.push([]);
      result.at(-1)!.push(a);
      return result;
    }, []);
  if (!chunks.length) chunks.push([]);
  return (
    <div className="report-pages">
      {chunks.map((photos, page) => (
        <article className="simple-report" key={page} dir="rtl">
          <header className="sr-header">
            <div className="sr-identity">
              <img src="/brand/moe-white.svg" alt="شعار وزارة التعليم" />
            </div>
            <div className="sr-school">
              <span>{s.teacher.administration}</span>
              <strong>{s.teacher.school}</strong>
            </div>
          </header>
          <h2 className="sr-title">
            {p.title}
            {page > 0 ? " — صور الشاهد" : ""}
          </h2>
          <div className="sr-content">
            {page === 0 && (
              <>
                <div className="sr-grid sr-two">
                  <Field title="المنفذ" value={s.teacher.name} />
                  <Field title="المشاركون" value={p.report.participants ?? "—"} />
                </div>
                <div className="sr-grid sr-three">
                  <Field title="مكان التنفيذ" value={p.report.place ?? s.teacher.school} />
                  <Field title="مدة التنفيذ" value={p.report.duration ?? "غير محددة"} />
                  <Field title="تاريخ التنفيذ" value={reportDate(p.report)} />
                </div>
                <div className="sr-grid sr-two">
                  <Field
                    title="المستفيدون / العدد"
                    value={[
                      p.report.audience,
                      p.report.beneficiaries !== undefined
                        ? String(p.report.beneficiaries)
                        : "العدد غير محدد",
                    ]
                      .filter(Boolean)
                      .join(" — ")}
                  />
                  <Field title="المجال" value={p.report.field ?? "تعليم"} />
                </div>
                <div className="sr-grid sr-two sr-narrative">
                  <ReportBox title="خطوات التنفيذ / الوصف">
                    <p>
                      <ReportText value={p.report.description} />
                    </p>
                  </ReportBox>
                  <ReportBox title="الأهداف">
                    <ul>
                      {p.report.objectives.map((o, i) => (
                        <li key={i}>
                          <ReportText value={o} />
                        </li>
                      ))}
                    </ul>
                  </ReportBox>
                </div>
              </>
            )}
            <ReportBox title="الشواهد" className="sr-evidence">
              {photos.length ? (
                <div className="sr-photos">
                  {photos.map((a) => (
                    <figure key={a.id}>
                      {urls[a.id] ? (
                        <a href={urls[a.id]} target="_blank" rel="noreferrer">
                          <img src={urls[a.id]} alt={a.name} />
                        </a>
                      ) : (
                        <div className="sr-image-loading" role="status">
                          جارٍ تحميل الصورة…
                        </div>
                      )}
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="sr-no-images">لا توجد صور مرفقة بهذا التقرير.</p>
              )}
            </ReportBox>
            <footer className="sr-signatures">
              <div>
                إعداد المعلم<strong>{s.teacher.name}</strong>
              </div>
              <div>
                مدير المدرسة<strong>{s.teacher.director}</strong>
              </div>
            </footer>
          </div>
          <div className="sr-bottom">
            <span>{s.teacher.school}</span>
            <small>
              ملف إنجاز مهني شخصي{chunks.length > 1 ? ` · ${page + 1} / ${chunks.length}` : ""}
            </small>
          </div>
        </article>
      ))}
    </div>
  );
}
function Field({ title, value }: { title: string; value: string }) {
  return (
    <ReportBox title={title}>
      <p className="sr-value">
        <ReportText value={value} />
      </p>
    </ReportBox>
  );
}
function ReportBox({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`sr-box ${className}`} aria-label={title}>
      <h3 className="sr-label">{title}</h3>
      <div className="sr-box-content">{children}</div>
    </section>
  );
}
function ReportText({ value }: { value: string }) {
  return (
    <>
      {value.split(/([«“"]?[A-Za-z][A-Za-z0-9 .—-]*[A-Za-z0-9][»”"]?)/g).map((part, i) =>
        /[A-Za-z]/.test(part) ? (
          <bdi dir="ltr" key={i}>
            {part}
          </bdi>
        ) : (
          part
        ),
      )}
    </>
  );
}
