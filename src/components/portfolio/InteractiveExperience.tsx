import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
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
