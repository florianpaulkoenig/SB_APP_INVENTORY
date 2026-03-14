import { supabase } from './supabase';

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

function cacheKey(bucket: string, path: string): string {
  return `${bucket}:${path}`;
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
): Promise<string | null> {
  const key = cacheKey(bucket, path);
  const now = Date.now();

  // Return cached URL if still valid
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  // Generate new signed URL
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

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
): Promise<Map<string, string>> {
  const now = Date.now();
  const result = new Map<string, string>();
  const uncachedPaths: string[] = [];

  // Check cache first
  for (const path of paths) {
    const key = cacheKey(bucket, path);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      result.set(path, cached.url);
    } else {
      uncachedPaths.push(path);
    }
  }

  // Fetch uncached URLs in parallel
  if (uncachedPaths.length > 0) {
    const responses = await Promise.all(
      uncachedPaths.map((p) =>
        supabase.storage.from(bucket).createSignedUrl(p, expiresIn),
      ),
    );

    const ttl = Math.min(expiresIn * 800, CACHE_TTL_MS);
    for (let i = 0; i < uncachedPaths.length; i++) {
      const url = responses[i]?.data?.signedUrl;
      if (url) {
        const path = uncachedPaths[i];
        result.set(path, url);
        cache.set(cacheKey(bucket, path), { url, expiresAt: now + ttl });
      }
    }

    if (uncachedPaths.length > 0) ensureCleanup();
  }

  return result;
}

/**
 * Invalidate cached URL(s). Useful after uploading/deleting images.
 */
export function invalidateSignedUrl(bucket: string, path: string): void {
  cache.delete(cacheKey(bucket, path));
}

export function invalidateSignedUrls(bucket: string, paths: string[]): void {
  for (const path of paths) {
    cache.delete(cacheKey(bucket, path));
  }
}

/** Clear the entire cache (e.g. on sign-out). */
export function clearSignedUrlCache(): void {
  cache.clear();
}
