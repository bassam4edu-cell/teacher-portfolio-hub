/** Export-only raster preparation. Original DOM and attachment bytes are never changed. */
function canvasFor(doc: Document, width: number, height: number) {
  const canvas = doc.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width * 2));
  canvas.height = Math.max(1, Math.ceil(height * 2));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("تعذر تجهيز رسم التقرير");
  context.scale(2, 2);
  return { canvas, context };
}

/** Native SVG masks and object-fit are not implemented reliably by html2canvas on iOS. */
export async function rasterizeReportImages(doc: Document, root: HTMLElement) {
  for (const image of root.querySelectorAll<HTMLImageElement>("img")) {
    const bounds = image.getBoundingClientRect();
    if (!bounds.width || !bounds.height) continue;
    const { canvas, context } = canvasFor(doc, bounds.width, bounds.height);
    const fit = Math.min(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
    const width = image.naturalWidth * fit,
      height = image.naturalHeight * fit;
    context.drawImage(
      image,
      (bounds.width - width) / 2,
      (bounds.height - height) / 2,
      width,
      height,
    );
    image.src = canvas.toDataURL("image/png");
    image.style.objectFit = "fill"; // Contain geometry is already baked into this private rendition.
    await image.decode();
    canvas.width = canvas.height = 0;
  }
}

/** Preserve connected Arabic and mixed RTL/LTR text by drawing whole native-shaped lines.
 * DOM ranges only measure existing line breaks; letters are never individually painted/reversed.
 */
export function rasterizeReportNarrative(doc: Document, root: HTMLElement) {
  for (const paragraph of root.querySelectorAll<HTMLElement>(".sr-narrative p, .sr-narrative li")) {
    const bounds = paragraph.getBoundingClientRect();
    const text = paragraph.textContent ?? "";
    if (!text.trim() || !bounds.width || !bounds.height) continue;
    const css = doc.defaultView!.getComputedStyle(paragraph);
    const { canvas, context } = canvasFor(doc, bounds.width, bounds.height);
    context.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
    context.direction = css.direction === "rtl" ? "rtl" : "ltr";
    context.textAlign =
      css.textAlign === "center" ? "center" : css.direction === "rtl" ? "right" : "left";
    context.textBaseline = "alphabetic";
    context.fillStyle = css.color;
    const metrics = context.measureText("أبجد Hg");
    const ascent = metrics.fontBoundingBoxAscent || metrics.actualBoundingBoxAscent;
    const nodes: { node: Text; start: number; end: number }[] = [];
    const walker = doc.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let offset = 0;
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      nodes.push({ node, start: offset, end: offset + node.length });
      offset += node.length;
    }
    const lines: { top: number; start: number; end: number }[] = [];
    for (const match of text.matchAll(/\S+/gu)) {
      const start = match.index!,
        end = start + match[0].length;
      const first = nodes.find((n) => n.start <= start && n.end > start);
      const last = nodes.find((n) => n.start < end && n.end >= end);
      if (!first || !last) continue;
      const range = doc.createRange();
      range.setStart(first.node, start - first.start);
      range.setEnd(last.node, end - last.start);
      const rect = [...range.getClientRects()].find((r) => r.width > 0);
      if (!rect) continue;
      const top = rect.top - bounds.top;
      const line = lines.find((line) => Math.abs(line.top - top) < 2);
      if (line) {
        line.start = Math.min(line.start, start);
        line.end = Math.max(line.end, end);
      } else lines.push({ top, start, end });
    }
    const x =
      context.textAlign === "center"
        ? bounds.width / 2
        : context.textAlign === "right"
          ? bounds.width
          : 0;
    for (const line of lines.sort((a, b) => a.top - b.top))
      context.fillText(text.slice(line.start, line.end), x, line.top + ascent);
    const image = doc.createElement("img");
    image.src = canvas.toDataURL("image/png");
    image.alt = text;
    image.width = Math.ceil(bounds.width);
    image.height = Math.ceil(bounds.height);
    image.style.cssText = `display:block;width:${bounds.width}px;height:${bounds.height}px;max-width:100%`;
    paragraph.replaceChildren(image);
    canvas.width = canvas.height = 0;
  }
}
