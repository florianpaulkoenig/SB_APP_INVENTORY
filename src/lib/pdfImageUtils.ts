// Resize an image URL to a JPEG data URL using canvas (client-side, no server transform).
// Supabase transform URLs (/render/image/sign/) don't load reliably in react-pdf,
// so we fetch the plain signed URL and resize client-side instead.
export async function resizeToDataUrl(url: string, maxPx: number, quality: number): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const out = await canvas.convertToBlob({ type: 'image/jpeg', quality });
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(out);
    });
  } catch {
    return null;
  }
}
