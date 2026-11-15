import { useEffect, useState } from "react";
import { ArrowUp, ChevronLeft, Search } from "lucide-react";
import type { Publication } from "@/lib/portfolio/simple-report";
export function ReadingControls() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      setScrolled(y > 500);
      document.querySelector(".folio")?.setAttribute("data-scrolled", String(y > 80));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return scrolled ? (
    <button
      className="reading-top"
      aria-label="العودة إلى الأعلى"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        })
      }
    >
      <ArrowUp size={20} />
    </button>
  ) : null;
}
export function ReportSearch({
  reports,
  onOpen,
}: {
  reports: Publication[];
  onOpen: (p: Publication) => void;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("ar");
  const matches = normalized
    ? reports.filter((p) =>
        (p.title + " " + p.report.description).toLocaleLowerCase("ar").includes(normalized),
      )
    : [];
  return (
    <section className="experience-search" aria-label="بحث التقارير">
      <label>
        <Search size={20} />
        <span className="search-label">ابحث في التقارير</span>
        <input
          type="search"
          aria-label="ابحث في التقارير"
          placeholder="اسم الاستراتيجية أو كلمة من التقرير…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {normalized && (
        <div className="search-results">
          <p role="status">{matches.length} نتيجة</p>
          {matches.map((p) => (
            <button key={p.id} onClick={() => onOpen(p)}>
              <span>{p.title}</span>
              <ChevronLeft size={18} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
