import css from "@/components/portfolio/print-progress.css?raw";
const stages = [
  "قراءة بيانات الملف",
  "تجهيز صور الشواهد",
  "تجهيز رموز التقارير والدورات",
  "تنسيق الصفحات والفهرس",
  "الملف جاهز",
];
/** Percentages represent completed work in weighted phases, never elapsed time. */
export function createPrintProgress(doc: Document) {
  const style = doc.createElement("style");
  style.textContent = css;
  doc.head.append(style);
  const screen = doc.createElement("section");
  screen.className = "fp-progress-screen";
  screen.setAttribute("role", "dialog");
  screen.setAttribute("aria-modal", "true");
  screen.setAttribute("aria-labelledby", "fp-progress-title");
  screen.tabIndex = -1;
  screen.innerHTML = `<div class="fp-progress-panel"><div class="fp-progress-ring" role="progressbar" aria-label="تجهيز ملف الإنجاز" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><svg viewBox="0 0 148 148" aria-hidden="true"><circle class="fp-progress-track" cx="74" cy="74" r="64"/><circle class="fp-progress-fill" cx="74" cy="74" r="64"/></svg><div class="fp-progress-symbol" aria-hidden="true"><svg class="fp-progress-document" viewBox="0 0 32 32"><path d="M18 3H7a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V12L18 3Z"/><path d="M18 3v9h9M10 18h12M10 23h8"/></svg><svg class="fp-progress-check" viewBox="0 0 32 32"><path d="m7 17 6 6L26 9"/></svg></div></div><p class="fp-progress-number" aria-hidden="true">0٪</p><h1 id="fp-progress-title">نجهّز ملف إنجازك</h1><p role="status" aria-live="polite">جارٍ قراءة بيانات الملف…</p><ol class="fp-progress-steps">${stages.map((stage, i) => `<li data-step="${i}" data-state="${i === 0 ? "active" : "pending"}">${stage}</li>`).join("")}</ol><p class="fp-progress-error" role="alert" hidden></p><button class="fp-progress-retry" hidden>إعادة المحاولة</button></div>`;
  doc.body.replaceChildren(screen);
  doc.body.classList.add("fp-preparing");
  screen.focus();
  const bar = screen.querySelector<HTMLElement>("[role=progressbar]")!,
    label = screen.querySelector<HTMLElement>("[role=status]")!;
  let current = 0,
    stopped = false;
  const update = (percent: number, message: string, step: number) => {
    if (stopped) return;
    if (doc.defaultView?.closed) throw Error("أُغلقت نافذة التقرير.");
    current = Math.max(current, Math.min(100, Math.floor(percent)));
    bar.style.setProperty("--progress", String(current));
    bar.setAttribute("aria-valuenow", String(current));
    bar.setAttribute("aria-valuetext", `${current}% — ${message}`);
    screen.querySelector(".fp-progress-number")!.textContent = `${current}٪`;
    label.textContent = message;
    screen
      .querySelectorAll<HTMLElement>("[data-step]")
      .forEach(
        (node, i) =>
          (node.dataset["state"] = i < step ? "done" : i === step ? "active" : "pending"),
      );
  };
  return {
    screen,
    update,
    async finish(pages: number, warning: string) {
      update(100, `اكتمل تجهيز ${pages} صفحة${warning}`, 4);
      screen.dataset["state"] = "complete";
      screen.querySelector("h1")!.textContent = "ملفك جاهز";
      if (!doc.defaultView?.matchMedia("(prefers-reduced-motion: reduce)").matches)
        await new Promise((resolve) => setTimeout(resolve, 500));
      screen.remove();
      doc.body.classList.remove("fp-preparing");
    },
    fail(message: string, retry: () => Promise<unknown>) {
      stopped = true;
      screen.dataset["state"] = "error";
      bar.removeAttribute("role");
      screen.querySelector("h1")!.textContent = "تعذر تجهيز الملف";
      label.textContent = "يمكنك إعادة المحاولة من هنا.";
      const error = screen.querySelector<HTMLElement>(".fp-progress-error")!;
      error.textContent = message;
      error.hidden = false;
      const button = screen.querySelector<HTMLButtonElement>(".fp-progress-retry")!;
      button.hidden = false;
      button.onclick = () => {
        button.disabled = true;
        void retry().catch(() => undefined);
      };
      button.focus();
    },
  };
}
