import { useEffect, useState } from "react";
import { FileText, Images, Clock3, GraduationCap } from "lucide-react";
import { loadCourses, courseTotals } from "@/lib/portfolio/courses";
import type { Publication } from "@/lib/portfolio/simple-report";
/** Published records only; counts are not a formal performance score. */
export function PortfolioOverview({
  publications,
  revision,
}: {
  publications: Publication[];
  revision: number;
}) {
  const [totals, setTotals] = useState<ReturnType<typeof courseTotals> | null>(null);
  useEffect(() => {
    let active = true;
    loadCourses()
      .then((rows) => {
        if (active) setTotals(courseTotals(rows));
      })
      .catch(() => {
        if (active) setTotals(null);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  const items = [
    { icon: FileText, label: "تقرير منشور", value: publications.length },
    {
      icon: Images,
      label: "مرفق شاهد",
      value: new Set(publications.flatMap((p) => p.assets.map((a) => a.id))).size,
    },
    { icon: GraduationCap, label: "دورة مسجلة", value: totals?.count },
    { icon: Clock3, label: "ساعة تدريبية", value: totals?.hours },
  ];
  return (
    <section className="gov-overview" aria-label="ملخص السجلات المنشورة">
      {items.map(({ icon: Icon, label, value }) => (
        <div className="gov-kpi" key={label}>
          <span className="gov-icon">
            <Icon size={23} aria-hidden="true" />
          </span>
          <div>
            <strong>{value ?? "—"}</strong>
            <span>{label}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
