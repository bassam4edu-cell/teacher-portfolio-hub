import { useEffect, useRef, useState } from "react";
import "lenis/dist/lenis.css";

/** Visual enhancement only: never owns routing, content, forms or data. */
export function ManuscriptMotion({ pageKey }: { pageKey: string }) {
  const cursor = useRef<HTMLSpanElement>(null);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (reduced) return;
    const root = cursor.current?.closest<HTMLElement>(".folio");
    const main = root?.querySelector<HTMLElement>(".folio-main");
    if (!root || !main || root.dataset["view"] === "report") return;
    let disposed = false;
    let teardown = () => {};
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
      .then(async ([g, st]) => {
        if (disposed) return;
        const gsap = g.gsap;
        const ScrollTrigger = st.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);
        const context = gsap.context(() => {}, root);
        const visited = new WeakSet<Element>();
        const counters = new Set<HTMLElement>();
        const scan = () => {
          context.add(() => {
            main
              .querySelectorAll<HTMLElement>(
                ".reference-card,.folio-report-card,.about-content-card,.cv-section,.course-card,.folio-lesson,.folio-section-heading,.about-prose p",
              )
              .forEach((el) => {
                if (visited.has(el) || el.closest(".simple-report,dialog")) return;
                visited.add(el);
                ScrollTrigger.create({
                  trigger: el,
                  start: "top 96%",
                  once: true,
                  onEnter: () => {
                    context.add(() => {
                      gsap.fromTo(
                        el,
                        { y: 16, opacity: 0.75 },
                        {
                          y: 0,
                          opacity: 1,
                          duration: 0.55,
                          ease: "power3.out",
                          clearProps: "transform,opacity",
                        },
                      );
                      if (el.matches(".folio-section-heading"))
                        gsap.fromTo(
                          el,
                          { "--ink-rule-progress": 0 },
                          { "--ink-rule-progress": 1, duration: 0.8, ease: "power2.out" },
                        );
                    });
                  },
                });
              });
            main.querySelectorAll<HTMLElement>(".cv-timeline").forEach((el) => {
              if (visited.has(el)) return;
              visited.add(el);
              gsap.fromTo(
                el,
                { "--timeline-progress": 0.05 },
                {
                  "--timeline-progress": 1,
                  ease: "none",
                  scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 40%", scrub: 0.6 },
                },
              );
            });
            main.querySelectorAll<HTMLElement>(".courses-stats strong").forEach((el) => {
              const text = el.textContent?.trim() ?? "";
              if (visited.has(el) || !/^\d+$/.test(text)) return;
              visited.add(el);
              ScrollTrigger.create({
                trigger: el,
                start: "top 96%",
                once: true,
                onEnter: () => {
                  counters.add(el);
                  const number = { value: 0 };
                  context.add(() =>
                    gsap.to(number, {
                      value: Number(text),
                      duration: 0.85,
                      ease: "power2.out",
                      onUpdate: () => {
                        el.dataset["counter"] = String(Math.round(number.value));
                      },
                      onComplete: () => {
                        delete el.dataset["counter"];
                        counters.delete(el);
                      },
                    }),
                  );
                },
              });
            });
          });
        };
        root.dataset["manuscriptMotion"] = "ready";
        scan();
        void document.fonts.ready.then(() => {
          if (!disposed) ScrollTrigger.refresh();
        });
        let timer: ReturnType<typeof setTimeout> | undefined;
        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(scan, 100);
        });
        observer.observe(main, { childList: true, subtree: true });
        let lenis: import("lenis").default | undefined;
        let tick: ((time: number) => void) | undefined;
        const fine = matchMedia("(min-width: 1050px) and (pointer: fine)");
        const move = (event: PointerEvent) => {
          if (!fine.matches || event.pointerType === "touch") return;
          const dot = cursor.current;
          if (dot) {
            dot.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`;
            dot.dataset["visible"] = "true";
          }
          const card = (event.target as Element).closest<HTMLElement>(
            ".reference-card,.course-card",
          );
          if (card) {
            const rect = card.getBoundingClientRect();
            card.style.setProperty(
              "--spot-x",
              `${Math.max(4, Math.min(rect.width - 36, event.clientX - rect.left - 18))}px`,
            );
            card.style.setProperty(
              "--spot-y",
              `${Math.max(4, Math.min(rect.height - 36, event.clientY - rect.top - 18))}px`,
            );
          }
        };
        const hide = () => {
          if (cursor.current) delete cursor.current.dataset["visible"];
        };
        root.addEventListener("pointermove", move, { passive: true });
        root.addEventListener("pointerleave", hide);
        document.addEventListener("keydown", hide);
        teardown = () => {
          observer.disconnect();
          clearTimeout(timer);
          root.removeEventListener("pointermove", move);
          root.removeEventListener("pointerleave", hide);
          document.removeEventListener("keydown", hide);
          if (tick) gsap.ticker.remove(tick);
          lenis?.destroy();
          counters.forEach((el) => {
            delete el.dataset["counter"];
          });
          context.revert();
          delete root.dataset["manuscriptMotion"];
          hide();
        };
        if (fine.matches) {
          try {
            const { default: Lenis } = await import("lenis");
            if (disposed) return;
            lenis = new Lenis({
              autoRaf: false,
              duration: 0.8,
              smoothWheel: true,
              syncTouch: false,
              prevent: (node) =>
                !!node.closest(
                  "dialog,input,textarea,select,[data-lenis-prevent],.folio-week,.about-tabs-scroll",
                ),
            });
            lenis.on("scroll", ScrollTrigger.update);
            tick = (time) => lenis?.raf(time * 1000);
            gsap.ticker.add(tick);
          } catch {
            /* Native scrolling remains available. */
          }
        }
      })
      .catch(() => {
        /* Core pages remain visible if enhancement cannot load. */
      });
    return () => {
      disposed = true;
      teardown();
    };
  }, [pageKey, reduced]);
  return <span ref={cursor} className="manuscript-cursor" aria-hidden="true" />;
}
