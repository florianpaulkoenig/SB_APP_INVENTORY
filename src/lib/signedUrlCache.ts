import { supabase } from './supabase';
import { THUMB_PREFIX, thumbnailPath, createThumbnailBlob } from './imageThumbnails';

// ---------------------------------------------------------------------------
// Signed URL cache — avoids redundant Supabase storage calls when navigating
// between pages that show the same images.
//
// URLs are cached for CACHE_TTL_MS (8 min) which is safely below the default
// 600s (10 min) expiry used across the app.
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 8 * 60 * 1000; // 8 minutes
const DEFAULT_EXPIRY_SECONDS = 600; // 10 minutes

interface CacheEntry {
  url: string;
  expiresAt: number; // Date.now() + TTL
}

const cache = new Map<string, CacheEntry>();

// ---------------------------------------------------------------------------
// Image transform options — Supabase renders a resized/re-encoded variant
// server-side, drastically reducing bytes for thumbnails and list views.
// ---------------------------------------------------------------------------
export interface ImageTransform {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
}

/** Shared thumbnail preset for grids, pickers and list rows. */
export const THUMBNAIL_TRANSFORM: ImageTransform = {
  width: 300,
  quality: 60,
  resize: 'contain',
};

// ---------------------------------------------------------------------------
// Transform fallback — Supabase's image renderer rejects very large source
// files (400 "The source image file is too large to process"), so a
// transformed thumbnail URL can sign successfully yet fail to load.
//
// Loading the multi-MB original instead is far too heavy for grid views
// (several 100MP images saturate the connection and starve the app's API
// calls). Instead, the first failure downloads the original ONCE, downscales
// it in the browser and persists the result to storage under thumbs/<path>.
// Every later request — this session and all future ones — serves that small
// persisted thumbnail.
// ---------------------------------------------------------------------------

const failedTransformPaths = new Set<string>();

// Paths probed for a persisted thumbnail that turned out not to have one —
// avoids re-probing on every grid render. Cleared by invalidateSignedUrl
// (e.g. after upload-time thumbnail generation).
const missingThumbPaths = new Set<string>();

const RENDER_URL_RE = /\/storage\/v1\/render\/image\/sign\/([^/]+)\/([^?]+)/;

const inFlightFallbacks = new Map<string, Promise<string | null>>();

// Serialize downloads/decodes of large originals — running several 100MP
// decodes in parallel freezes the tab and starves other requests.
let fallbackQueue: Promise<unknown> = Promise.resolve();
function enqueueFallback<T>(fn: () => Promise<T>): Promise<T> {
  const run = fallbackQueue.then(fn, fn);
  fallbackQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function generateAndPersistThumb(bucket: string, path: string): Promise<string | null> {
  const thumbPath = thumbnailPath(path);

  // A previous session (or another device) may already have persisted it
  const persisted = await getSignedUrl(bucket, thumbPath);
  if (persisted) return persisted;

  const originalUrl = await getSignedUrl(bucket, path);
  if (!originalUrl) return null;

  try {
    const resp = await fetch(originalUrl);
    if (!resp.ok) return null;
    const blob = await resp.blob();

    const thumbBlob = await createThumbnailBlob(blob);
    if (!thumbBlob) return originalUrl;

    // Persist for all future sessions — best effort (gallery users lack
    // upload rights on the bucket; they still get the local object URL)
    void supabase.storage
      .from(bucket)
      .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg' })
      .then(({ error }) => {
        if (error) console.warn('Failed to persist generated thumbnail:', error.message);
      });

    // Serve the local copy immediately; cache under the thumb path so
    // getSignedUrl reuses it until the uploaded object takes over
    const objectUrl = URL.createObjectURL(thumbBlob);
    cache.set(cacheKey(bucket, thumbPath), { url: objectUrl, expiresAt: Date.now() + CACHE_TTL_MS });
    missingThumbPaths.delete(`${bucket}:${path}`);
    return objectUrl;
  } catch {
    // Decode/downscale failed — the full original is the last resort
    return originalUrl;
  }
}

function getFallbackThumbUrl(bucket: string, path: string): Promise<string | null> {
  const key = `${bucket}:${path}`;
  const inFlight = inFlightFallbacks.get(key);
  if (inFlight) return inFlight;
  const promise = enqueueFallback(() => generateAndPersistThumb(bucket, path)).finally(() =>
    inFlightFallbacks.delete(key),
  );
  inFlightFallbacks.set(key, promise);
  return promise;
}

/**
 * Resolve a lightweight replacement for a transform URL whose image failed
 * to load: a persisted (or freshly generated) downscaled thumbnail, falling
 * back to the original only if downscaling isn't possible. Marks the path so
 * future getSignedUrl(s) calls skip the broken transform.
 *
 * Components with their own <img> onError handling (e.g. ArtworkCard) must
 * call this and swap the src themselves — a React error handler that hides
 * the image on the first error would otherwise win over the global listener.
 */
export async function getOriginalUrlForFailedTransform(failedSrc: string): Promise<string | null> {
  const match = RENDER_URL_RE.exec(failedSrc);
  if (!match) return null;
  const bucket = match[1];
  const path = decodeURIComponent(match[2]);
  failedTransformPaths.add(`${bucket}:${path}`);
  return getFallbackThumbUrl(bucket, path);
}

function installTransformFallbackListener() {
  if (typeof window === 'undefined') return;
  window.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      if (img.dataset.transformFallback === '1') return;
      if (!RENDER_URL_RE.test(img.src)) return;
      img.dataset.transformFallback = '1';
      void getOriginalUrlForFailedTransform(img.src).then((url) => {
        if (url && img.isConnected) img.src = url;
      });
    },
    true, // error events don't bubble; capture catches them from any <img>
  );
}

installTransformFallbackListener();

// Periodic cleanup every 2 minutes to avoid unbounded growth
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(key);
    }
    // Stop the timer if cache is empty (no references held)
    if (cache.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, 2 * 60 * 1000);
}

function transformSuffix(transform?: ImageTransform): string {
  if (!transform) return '';
  return `@${transform.width ?? ''}x${transform.height ?? ''}q${transform.quality ?? ''}${transform.resize ?? ''}`;
}

function cacheKey(bucket: string, path: string, transform?: ImageTransform): string {
  return `${bucket}:${path}${transformSuffix(transform)}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get a signed URL for a storage object, returning a cached version if
 * available and not expired.
 *
 * @param bucket  Storage bucket name (e.g. 'artwork-images')
 * @param path    Object path within the bucket
 * @param expiresIn  URL expiry in seconds (default 600)
 * @returns The signed URL string, or null on error
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = DEFAULT_EXPIRY_SECONDS,
  transform?: ImageTransform,
): Promise<string | null> {
  // Thumbnail requests prefer the persisted downscaled copy (thumbs/<path>)
  // over transforming the original: the renderer rejects very large originals,
  // while a ≤1200px thumbnail is always transformable.
  if (transform && !path.startsWith(THUMB_PREFIX)) {
    const pathKey = `${bucket}:${path}`;
    if (failedTransformPaths.has(pathKey)) {
      // Renderer already failed on the original — serve the persisted (or
      // locally generated) thumbnail as-is; only if none exists yet, sign
      // the untransformed original.
      const thumbUrl = await getSignedUrl(bucket, thumbnailPath(path), expiresIn);
      if (thumbUrl) return thumbUrl;
      transform = undefined;
    } else if (!missingThumbPaths.has(pathKey)) {
      const thumbUrl = await getSignedUrl(bucket, thumbnailPath(path), expiresIn, transform);
      if (thumbUrl) return thumbUrl;
      missingThumbPaths.add(pathKey);
    }
  }

  const key = cacheKey(bucket, path, transform);
  const now = Date.now();

  // Return cached URL if still valid
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  // Generate new signed URL
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn, transform ? { transform } : undefined);

  if (error || !data?.signedUrl) {
    return null;
  }

  // Cache with TTL proportional to expiry (80% of expiry, capped at CACHE_TTL_MS)
  const ttl = Math.min(expiresIn * 800, CACHE_TTL_MS);
  cache.set(key, { url: data.signedUrl, expiresAt: now + ttl });
  ensureCleanup();

  return data.signedUrl;
}

/**
 * Get signed URLs for multiple storage objects in parallel, using the cache
 * for any that are already available.
 *
 * @param bucket  Storage bucket name
 * @param paths   Array of object paths
 * @param expiresIn  URL expiry in seconds (default 600)
 * @returns Map of path → signed URL (only includes successful results)
 */
export async function getSignedUrls(
  bucket: string,
  paths: string[],
  expiresIn = DEFAULT_EXPIRY_SECONDS,
  transform?: ImageTransform,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  // Delegate per path so every path shares the cache and the
  // failed-transform handling in getSignedUrl.
  await Promise.all(
    paths.map(async (path) => {
      const url = await getSignedUrl(bucket, path, expiresIn, transform);
      if (url) result.set(path, url);
    }),
  );

  return result;
}

/**
 * Invalidate cached URL(s). Useful after uploading/deleting images.
 */
export function invalidateSignedUrl(bucket: string, path: string): void {
  // Delete the base key plus every transform variant (keys are prefixed
  // with "bucket:path" and optionally suffixed with "@…"), the persisted
  // thumbnail, and the failed-transform / missing-thumbnail marks.
  failedTransformPaths.delete(`${bucket}:${path}`);
  missingThumbPaths.delete(`${bucket}:${path}`);
  const prefixes = [`${bucket}:${path}`, `${bucket}:${thumbnailPath(path)}`];
  for (const key of cache.keys()) {
    for (const prefix of prefixes) {
      if (key === prefix || key.startsWith(`${prefix}@`)) cache.delete(key);
    }
  }
}

export function invalidateSignedUrls(bucket: string, paths: string[]): void {
  for (const path of paths) {
    invalidateSignedUrl(bucket, path);
  }
}

/** Clear the entire cache (e.g. on sign-out). */
export function clearSignedUrlCache(): void {
  cache.clear();
}
