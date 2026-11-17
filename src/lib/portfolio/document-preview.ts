import { publicDocumentFile } from "./api";
import type { PublicDocument } from "./documents";
import { cachedPublicPreview } from "./print-cache";
/** A display derivative of the verified original: render only page one, cache by SHA. */
export async function publicDocumentPreview(record: PublicDocument) {
  const result = await cachedPublicPreview(
    `document-first-page-v1:${record.id}:${record.sha256}`,
    async () => {
      const file = await publicDocumentFile(record);
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      const canvas = document.createElement("canvas");
      try {
        const pdf = await task.promise;
        const page = await pdf.getPage(1);
        const natural = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(2, 1200 / natural.width) });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, viewport }).promise;
        const url = canvas.toDataURL("image/webp", 0.9);
        page.cleanup();
        return url;
      } finally {
        canvas.width = canvas.height = 0;
        await task.destroy();
      }
    },
  );
  return result.value;
}
