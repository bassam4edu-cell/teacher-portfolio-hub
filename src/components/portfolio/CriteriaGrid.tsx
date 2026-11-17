import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowUpLeft,
  ClipboardCheck,
  UsersRound,
  MessagesSquare,
  Lightbulb,
  TrendingUp,
  NotebookPen,
  MonitorSmartphone,
  School,
  Presentation,
  ChartNoAxesCombined,
  ListChecks,
  FileText,
} from "lucide-react";
import type { Settings } from "@/lib/portfolio/model";
import type { Publication } from "@/lib/portfolio/simple-report";
import type { PublicDocument } from "@/lib/portfolio/documents";
import "./criteria-grid.css";
const icons = [
  ClipboardCheck,
  UsersRound,
  MessagesSquare,
  Lightbulb,
  TrendingUp,
  NotebookPen,
  MonitorSmartphone,
  School,
  Presentation,
  ChartNoAxesCombined,
  ListChecks,
];
const accents = [
  "navy",
  "green",
  "navy",
  "sand",
  "green",
  "navy",
  "green",
  "sand",
  "navy",
  "green",
  "sand",
];
const filters = [
  { id: "all", label: "جميع المعايير" },
  { id: "teaching", label: "الشواهد التعليمية" },
  { id: "technology", label: "المبادرات التقنية" },
  { id: "english", label: "English Teaching Artifacts" },
] as const;
/** Optional trusted aggregate; the current public API does not expose target completion. */
export type CriterionCompletion = {
  criterion: number;
  total: number;
  done: number;
  percent: number | null;
};
export function CriteriaGrid({
  settings,
  reports,
  onOpen,
  compact = false,
  completion,
  documents = [],
}: {
  settings: Settings;
  reports: Publication[];
  onOpen: (id: number) => void;
  compact?: boolean;
  completion?: CriterionCompletion[];
  documents?: PublicDocument[];
}) {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [hintsOff, setHintsOff] = useState(false);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHintsOff(true);
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, []);
  const visible = [...settings.criteria]
    .sort((a, b) => a.id - b.id)
    .filter(
      (c) =>
        filter === "all" ||
        (filter === "technology"
          ? c.id === 7
          : filter === "teaching"
            ? c.id !== 7
            : reports.some(
                (r) =>
                  r.criterion === c.id &&
                  /الإنجليز|الانجليز|English/i.test(r.title + " " + r.report.description),
              )),
    );
  return (
    <div className="criteria-showcase">
      <nav className="criteria-grid-filters" aria-label="تصفية عناصر الأداء">
        {filters.map((f) => (
          <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </nav>
      <div className="criteria-grid">
        {visible.map((c) => {
          const Icon = icons[c.id - 1] ?? ClipboardCheck,
            count = reports.filter((r) => r.criterion === c.id).length;
          const documentCount = documents.filter((d) => d.criterion === c.id).length;
          const value = completion?.find((r) => r.criterion === c.id);
          const valid =
            !!value &&
            value.total > 0 &&
            Number.isInteger(value.total) &&
            Number.isInteger(value.done) &&
            value.done >= 0 &&
            value.done <= value.total;
          const percent = valid
            ? Math.min(100, Math.round((value.done / value.total) * 100))
            : null;
          return (
            <div
              className="criteria-grid-item"
              key={c.id}
              data-tone={accents[c.id - 1] ?? "navy"}
              data-hint-dismissed={hintsOff}
              onMouseEnter={() => setHintsOff(false)}
              onFocus={() => setHintsOff(false)}
            >
              <button
                className="criterion-tile folio-criterion"
                onClick={() => onOpen(c.id)}
                aria-describedby={`criterion-hint-${compact ? "home" : "page"}-${c.id}`}
              >
                <span className="criterion-tile-icon">
                  <Icon size={29} strokeWidth={1.4} aria-hidden="true" />
                </span>
                <span className="criterion-tile-copy">
                  <span className="fc-number">{String(c.id).padStart(2, "0")}</span>
                  <h3>{c.name}</h3>
                  <span className="criterion-tile-badge">
                    {compact
                      ? "الممارسة والتوثيق المهني"
                      : `الوزن ${c.weight}% · الممارسة والتوثيق المهني`}
                  </span>
                </span>
                <span className="criterion-tile-action">
                  <span>
                    عرض الشواهد <ArrowUpLeft size={13} />
                  </span>
                  <strong>
                    <FileText size={14} />
                    <span>
                      {documentCount && !count ? `${documentCount} شاهد` : `${count} تقارير`}
                    </span>
                  </strong>
                </span>
                <span className="criterion-tile-progress">
                  <span className="criterion-progress-label">
                    {valid
                      ? `${value.done} من ${value.total} مكتمل · ${percent}%`
                      : "المستهدف غير متاح للعرض"}
                  </span>
                  <span
                    className="criterion-progress-track"
                    {...(valid
                      ? {
                          role: "progressbar",
                          "aria-label": `اكتمال توثيق ${c.name}`,
                          "aria-valuemin": 0,
                          "aria-valuemax": 100,
                          "aria-valuenow": percent ?? 0,
                        }
                      : { "aria-hidden": true as const })}
                  >
                    <span style={{ "--completion": `${percent ?? 0}%` } as CSSProperties} />
                  </span>
                </span>
              </button>
              <span
                className="criterion-tile-hint"
                role="tooltip"
                id={`criterion-hint-${compact ? "home" : "page"}-${c.id}`}
              >
                {c.description}
              </span>
            </div>
          );
        })}
      </div>
      {!visible.length && (
        <p className="criteria-grid-empty">لم تُضف شواهد منشورة ضمن هذا التصنيف بعد.</p>
      )}
      <p className="criteria-completion-note">
        الاكتمال يقيس توثيق المستهدفات، ولا يمثل درجة تقييم الأداء الوظيفي.
      </p>
    </div>
  );
}
