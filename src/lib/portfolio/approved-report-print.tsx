import { renderToStaticMarkup } from "react-dom/server";
import { SimpleReport } from "@/components/portfolio/SimpleReport";
import reportCss from "@/components/portfolio/simple-report.css?raw";
import type { Settings } from "./model";
import type { Publication } from "./simple-report";
/** Keep desktop approved-template geometry inside the A4 assembly, even on phone viewports. */
export function approvedPrintCss() {
  let result = "",
    cursor = 0;
  for (;;) {
    const start = reportCss.indexOf("@media", cursor);
    if (start < 0) {
      result += reportCss.slice(cursor);
      break;
    }
    result += reportCss.slice(cursor, start);
    let end = reportCss.indexOf("{", start) + 1,
      depth = 1;
    for (; end < reportCss.length && depth; end++) {
      if (reportCss[end] === "{") depth++;
      else if (reportCss[end] === "}") depth--;
    }
    cursor = end;
  }
  return result.replace(/(-?\d*\.?\d+)px\b/g, "calc($1px * var(--fp-report-scale, 1))");
}
export function approvedReportNodes(
  doc: Document,
  publication: Publication,
  settings: Settings,
  urls: Record<string, string>,
  qr: string,
  link: string,
) {
  const host = doc.createElement("div");
  host.innerHTML = renderToStaticMarkup(
    <SimpleReport publication={publication} settings={settings} urls={urls} />,
  );
  const sheets = [...host.querySelectorAll<HTMLElement>(".simple-report")];
  for (const sheet of sheets) {
    const anchor = doc.createElement("a");
    anchor.className = "fp-report-qr";
    anchor.href = link;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    const img = doc.createElement("img");
    img.src = qr;
    img.alt = "رمز فتح التقرير";
    const label = doc.createElement("span");
    label.textContent = "فتح التقرير";
    anchor.append(img, label);
    sheet.querySelector(".sr-header")!.append(anchor);
    // Missing previews are explicit; never leave an endless loading label in a printed artifact.
    for (const node of sheet.querySelectorAll(".sr-image-loading")) {
      node.className = "sr-image-error";
      node.removeAttribute("role");
      node.textContent = "تعذر تجهيز معاينة الصورة؛ افتح التقرير من الرمز.";
    }
    // Image data URLs are not stable PDF links. The report QR is the sole link in its header.
    for (const imageLink of sheet.querySelectorAll<HTMLAnchorElement>(".sr-photos a"))
      imageLink.replaceWith(...imageLink.childNodes);
  }
  return sheets;
}
/** Split only oversized approved pages, retaining their header/title/field-box vocabulary. */
export function approvedReportPieces(doc: Document, sheet: HTMLElement) {
  const content = sheet.querySelector<HTMLElement>(".sr-content")!;
  const pieces: HTMLElement[] = [];
  for (const child of [...content.children] as HTMLElement[]) {
    if (!child.classList.contains("sr-narrative")) {
      pieces.push(child.cloneNode(true) as HTMLElement);
      continue;
    }
    for (const box of [...child.children]) {
      const label = box.querySelector(".sr-label")?.textContent || "";
      const original = box.querySelector(".sr-box-content")!;
      const units = original.querySelector("ul")
        ? [...original.querySelectorAll("li")].map((n) => n.textContent || "")
        : [original.textContent || ""];
      for (const unit of units) {
        const words = unit.split(/\s+/).filter(Boolean);
        for (let start = 0; start < words.length; start += 125) {
          const clone = box.cloneNode(true) as HTMLElement;
          clone.querySelector(".sr-label")!.textContent = label + (start ? " — تابع" : "");
          const p = doc.createElement("p");
          p.textContent = words.slice(start, start + 125).join(" ");
          clone.querySelector(".sr-box-content")!.replaceChildren(p);
          const row = doc.createElement("div");
          row.className = "sr-grid sr-two sr-narrative fp-narrative-single";
          row.append(clone);
          pieces.push(row);
        }
      }
    }
  }
  return pieces;
}
