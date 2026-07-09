import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Persistent thumbnails — downscaled JPEG copies stored under thumbs/<path>
// in the same bucket as the original.
//
// Supabase's image renderer rejects source files over ~25MB ("The source
// image file is too large to process"), so on-the-fly transforms of large
// originals fail. A persisted ≤1200px JPEG is always small enough to
// transform, and cheap enough to serve directly.
//
// Thumbnails are generated client-side at upload time (useArtworkImages) and
// reactively for legacy images whose transform fails (signedUrlCache). A
// one-off backfill for existing large images lives in
// scripts/backfill-thumbnails.mjs.
// ---------------------------------------------------------------------------

export const THUMB_PREFIX = 'thumbs/';
export const THUMB_MAX_DIMENSION = 1200;
export const THUMB_JPEG_QUALITY = 0.8;

/** Storage path of the persisted thumbnail for an original object path. */
export function thumbnailPath(path: string): string {
  return THUMB_PREFIX + path;
}

/**
 * Downscale an image blob to at most maxDimension on its longest edge
 * and re-encode as JPEG. Returns null when the source can't be decoded, or
 * when it's already small enough that a thumbnail would gain nothing.
 */
export async function createThumbnailBlob(
  source: Blob,
  maxDimension: number = THUMB_MAX_DIMENSION,
): Promise<Blob | null> {
  let full: ImageBitmap;
  try {
    full = await createImageBitmap(source);
  } catch {
    return null;
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(full.width, full.height));
    // Small dimensions AND small file — a thumbnail wouldn't be any lighter
    if (scale === 1 && source.size <= 1024 * 1024) return null;

    const width = Math.max(1, Math.round(full.width * scale));
    const height = Math.max(1, Math.round(full.height * scale));

    let bitmap = full;
    if (scale < 1) {
      bitmap = await createImageBitmap(full, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'high',
      });
      full.close();
    }

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    // JPEG has no alpha — flatten transparency onto white, not black
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', THUMB_JPEG_QUALITY),
    );
  } catch {
    return null;
  }
}

/**
 * Generate a thumbnail for a just-uploaded storage object and persist it
 * under thumbs/<path> in the same bucket. Best effort — on failure, grid
 * views fall back to on-the-fly transforms of the original.
 */
export async function generateAndUploadThumbnail(
  bucket: string,
  path: string,
  source: Blob,
): Promise<boolean> {
  try {
    const thumbBlob = await createThumbnailBlob(source);
    if (!thumbBlob) return false;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(thumbnailPath(path), thumbBlob, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      console.warn('Failed to persist generated thumbnail:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Thumbnail generation failed:', err);
    return false;
  }
}
