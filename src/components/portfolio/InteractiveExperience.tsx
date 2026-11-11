import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Search,
  Share2,
  X,
  Images,
} from "lucide-react";
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
export function ReportGallery({
  publication,
  urls,
}: {
  publication: Publication;
  urls: Record<string, string>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState("");
  const touch = useRef(0);
  const assets = publication.assets.filter((a) => a.mime.startsWith("image/"));
  const move = (delta: number) => setIndex((i) => (i + delta + assets.length) % assets.length);
  return (
    <div className="report-extras">
      <button
        disabled={!assets.length || assets.some((a) => !urls[a.id])}
        onClick={() => {
          setIndex(0);
          dialog.current?.showModal();
        }}
      >
        <Images size={18} />
        استعراض الصور
      </button>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(location.href);
            setNotice("تم نسخ رابط التقرير");
          } catch {
            setNotice("يمكنك نسخ الرابط من شريط العنوان");
          }
        }}
      >
        <Share2 size={17} />
        مشاركة التقرير
      </button>
      <span role="status">{notice}</span>
      <dialog
        ref={dialog}
        className="experience-gallery"
        aria-label="صور الشاهد"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="gallery-header">
          <strong>{publication.title}</strong>
          <button aria-label="إغلاق معرض الصور" onClick={() => dialog.current?.close()}>
            <X />
          </button>
        </div>
        <div
          className="gallery-stage"
          onTouchStart={(e) => {
            touch.current = e.changedTouches[0]?.clientX ?? touch.current;
          }}
          onTouchEnd={(e) => {
            const delta = (e.changedTouches[0]?.clientX ?? touch.current) - touch.current;
            if (Math.abs(delta) > 50) move(delta > 0 ? 1 : -1);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") move(1);
            if (e.key === "ArrowRight") move(-1);
          }}
          tabIndex={0}
        >
          {assets[index] && (
            <img
              src={urls[assets[index].id]}
              alt={`صورة الشاهد ${index + 1} من ${assets.length}`}
            />
          )}
        </div>
        <div className="gallery-footer">
          <button aria-label="الصورة السابقة" disabled={assets.length < 2} onClick={() => move(-1)}>
            <ChevronRight />
          </button>
          <span aria-live="polite">
            {index + 1} / {assets.length}
          </span>
          <button aria-label="الصورة التالية" disabled={assets.length < 2} onClick={() => move(1)}>
            <ChevronLeft />
          </button>
          <a
            href={assets[index] ? urls[assets[index].id] : undefined}
            download={assets[index]?.name}
          >
            <ArrowRight size={16} />
            تنزيل الأصل
          </a>
        </div>
      </dialog>
    </div>
  );
}
