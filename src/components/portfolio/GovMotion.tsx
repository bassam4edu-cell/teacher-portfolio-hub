import { useEffect } from "react";
/** Native progressive animation; never hides content or controls scrolling. */
export function GovMotion({ pageKey }: { pageKey: string }) {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.querySelector(".folio-main");
    if (!root) return;
    const seen = new WeakSet<Element>();
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            animations.push(
              e.target.animate(
                [
                  { opacity: 0.82, transform: "translateY(8px)" },
                  { opacity: 1, transform: "none" },
                ],
                { duration: 280, easing: "cubic-bezier(.16,1,.3,1)" },
              ),
            );
            observer.unobserve(e.target);
          }
      },
      { threshold: 0.05 },
    );
    const scan = () =>
      root
        .querySelectorAll(".reference-card,.course-card,.about-panel,.gov-kpi,.cv-section")
        .forEach((el) => {
          if (!seen.has(el)) {
            seen.add(el);
            observer.observe(el);
          }
        });
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      animations.forEach((a) => a.cancel());
    };
  }, [pageKey]);
  return null;
}
