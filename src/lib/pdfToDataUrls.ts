// ---------------------------------------------------------------------------
// pdfToDataUrls — convert a PDF blob to an array of JPEG data URLs,
// one per page, using pdfjs-dist. Lazy-loaded on first call.
// ---------------------------------------------------------------------------

let workerConfigured = false;

/**
 * Render every page of a PDF blob to a JPEG data URL.
 * @param blob   The raw PDF file blob
 * @param scale  Render scale (2 = 2× the PDF's native size, good for A4 floor plans)
 */
export async function pdfBlobToDataUrls(blob: Blob, scale = 2.0): Promise<string[]> {
  // Lazy-load pdfjs-dist — only bundled when this function is called
  const pdfjsLib = await import('pdfjs-dist');

  if (!workerConfigured) {
    // new URL(..., import.meta.url) tells Vite to copy the worker to dist
    // and gives us the correct resolved URL in both dev and production.
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).href;
    workerConfigured = true;
  }

  const arrayBuffer = await blob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;

  const images: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.92));
    page.cleanup();
  }

  await pdf.destroy();
  return images;
}

/** Convert any Blob to a data URL (for images uploaded directly). */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
