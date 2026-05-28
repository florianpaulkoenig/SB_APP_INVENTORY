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

/**
 * Convert any image Blob to a JPEG data URL via an off-screen canvas.
 * Normalises WebP / HEIC / AVIF to JPEG, which @react-pdf/renderer supports.
 * @param blob     Any browser-decodable image blob
 * @param quality  JPEG quality 0–1 (default 0.92)
 * @param maxDim   Longest edge cap in pixels — downscales large photos (default 1800)
 */
export function blobToJpegDataUrl(
  blob: Blob,
  quality = 0.92,
  maxDim = 1800,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new window.Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      if (Math.max(w, h) > maxDim) {
        const ratio = maxDim / Math.max(w, h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('No canvas 2d context')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}
