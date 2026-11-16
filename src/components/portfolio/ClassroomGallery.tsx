import { useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import {
  ArrowUpLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Images,
  Pause,
  Play,
} from "lucide-react";
import { publicReportAsset } from "@/lib/portfolio/api";
import type { Settings } from "@/lib/portfolio/model";
import { reportDate, type Publication } from "@/lib/portfolio/simple-report";
import "./classroom-gallery.css";

export function ClassroomGallery({
  reports,
  settings,
  onOpen,
}: {
  reports: Publication[];
  settings: Settings;
  onOpen: (report: Publication) => void;
}) {
  // An edited report keeps its place: publication updated_at is deliberately excluded.
  const ordered = useMemo(
    () =>
      [...reports].sort(
        (a, b) =>
          (b.report.execution_on ?? "").localeCompare(a.report.execution_on ?? "") ||
          a.id.localeCompare(b.id),
      ),
    [reports],
  );
  const [reducedMotion, setReducedMotion] = useState(false);
  const [viewport, api] = useEmblaCarousel({
    direction: "rtl",
    loop: ordered.length > 1,
    duration: reducedMotion ? 0 : 32,
  });
  const root = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  const multiple = ordered.length > 1;
  const playing =
    multiple && !paused && !hovered && !focused && !dragging && inView && visible && !reducedMotion;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    const visibility = () => setVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(([entry]) => setInView(!!entry?.isIntersecting), {
      threshold: 0.2,
    });
    if (root.current) observer.observe(root.current);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!api) return;
    const sync = () => setSelected(api.selectedScrollSnap());
    const down = () => setDragging(true);
    const up = () => setDragging(false);
    sync();
    api.on("select", sync).on("reInit", sync).on("pointerDown", down).on("pointerUp", up);
    return () => {
      api.off("select", sync).off("reInit", sync).off("pointerDown", down).off("pointerUp", up);
    };
  }, [api]);
  useEffect(() => {
    if (!api || !playing) return;
    const timer = window.setTimeout(() => api.scrollTo((selected + 1) % ordered.length), 5000);
    return () => window.clearTimeout(timer);
  }, [api, playing, selected, ordered.length]);

  if (!ordered.length) return null;
  return (
    <section
      className="classroom-gallery"
      aria-labelledby="classroom-title"
      ref={root}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") {
          setHovered(false);
          // Mouse-click focus must not keep playback paused after the pointer leaves.
          const active = document.activeElement;
          if (active && e.currentTarget.contains(active) && !active.matches(":focus-visible"))
            setFocused(false);
        }
      }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      onKeyDown={(e) => {
        if (!multiple || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
        e.preventDefault();
        api?.scrollTo(
          (selected + (e.key === "ArrowLeft" ? 1 : -1) + ordered.length) % ordered.length,
        );
      }}
    >
      <header className="classroom-heading">
        <h2 id="classroom-title">
          من داخل <span className="classroom-title-word">الصف</span>
        </h2>
      </header>
      <div className="classroom-window" aria-roledescription="معرض تقارير">
        <div className="classroom-viewport" ref={viewport}>
          <div className="classroom-track" aria-live={playing ? "off" : "polite"}>
            {ordered.map((report, index) => (
              <article
                className="classroom-slide"
                key={report.id}
                role="group"
                aria-roledescription="تقرير"
                aria-label={`${index + 1} من ${ordered.length}`}
                aria-hidden={selected !== index}
                inert={selected !== index}
              >
                <GalleryCover
                  report={report}
                  enabled={
                    inView && (index === selected || index === (selected + 1) % ordered.length)
                  }
                  onOpen={() => onOpen(report)}
                />
                <div className="classroom-details">
                  <span className="classroom-category">
                    {settings.criteria.find((c) => c.id === report.criterion)?.name}
                  </span>
                  <h3>{report.title}</h3>
                  <div className="classroom-meta">
                    <span>
                      <CalendarDays size={16} aria-hidden="true" />
                      <time dateTime={report.report.execution_on}>
                        <bdi>{reportDate(report.report)}</bdi>
                      </time>
                    </span>
                    <span>
                      <Images size={16} aria-hidden="true" />
                      {report.assets.length} شواهد
                    </span>
                  </div>
                  <button className="classroom-open" onClick={() => onOpen(report)}>
                    فتح التقرير <ArrowUpLeft size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
        {multiple && (
          <div className="classroom-controls">
            <div className="classroom-arrows">
              <button
                aria-label="التقرير السابق"
                onClick={() => api?.scrollTo((selected - 1 + ordered.length) % ordered.length)}
              >
                <ChevronRight size={21} />
              </button>
              <button
                aria-label="التقرير التالي"
                onClick={() => api?.scrollTo((selected + 1) % ordered.length)}
              >
                <ChevronLeft size={21} />
              </button>
            </div>
            <div className="classroom-dots" aria-label="اختيار التقرير">
              {ordered.map((r, i) => (
                <button
                  key={r.id}
                  className={i === selected ? "is-selected" : ""}
                  aria-label={`التقرير ${i + 1}: ${r.title}`}
                  aria-current={i === selected ? "true" : undefined}
                  onClick={() => api?.scrollTo(i)}
                />
              ))}
            </div>
            <div className="classroom-playback">
              <bdi className="classroom-counter">
                {String(selected + 1).padStart(2, "0")} / {String(ordered.length).padStart(2, "0")}
              </bdi>
              {!reducedMotion && (
                <button
                  aria-label={paused ? "تشغيل العرض التلقائي" : "إيقاف العرض التلقائي"}
                  onClick={() => setPaused((value) => !value)}
                >
                  {paused ? <Play size={18} /> : <Pause size={18} />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function GalleryCover({
  report,
  enabled,
  onOpen,
}: {
  report: Publication;
  enabled: boolean;
  onOpen: () => void;
}) {
  const asset = report.assets.find((a) => a.mime.startsWith("image/"));
  const assetId = asset?.id;
  const [requested, setRequested] = useState(false);
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (enabled) setRequested(true);
  }, [enabled]);
  useEffect(() => {
    if (!requested || !assetId) return;
    let active = true;
    let url = "";
    publicReportAsset(assetId)
      .then((value) => {
        url = value;
        if (active) setSrc(value);
        else URL.revokeObjectURL(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [requested, assetId]);
  return (
    <button className="classroom-cover" onClick={onOpen} aria-label={`فتح تقرير ${report.title}`}>
      {src ? (
        <img
          src={src}
          alt={asset?.name ?? report.title}
          width="800"
          height="600"
          decoding="async"
          draggable={false}
        />
      ) : (
        <span className="classroom-cover-placeholder">
          <FileText size={44} strokeWidth={1.2} />
          <span>
            {failed ? "افتح التقرير لعرض الشواهد" : asset ? "جارٍ تجهيز الشاهد…" : "عرض التقرير"}
          </span>
        </span>
      )}
      <span className="classroom-cover-label">شواهد الممارسة التعليمية</span>
    </button>
  );
}
