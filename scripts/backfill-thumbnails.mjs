#!/usr/bin/env node
// ---------------------------------------------------------------------------
// One-off backfill: generate persistent thumbnails (thumbs/<path>) for
// existing images in the artwork-images bucket.
//
// Grid/picker views prefer a persisted thumbs/<path> JPEG over on-the-fly
// transforms of the original (see src/lib/signedUrlCache.ts). New uploads
// generate one client-side (src/lib/imageThumbnails.ts); this script covers
// images uploaded before that. Only large originals need one — small files
// transform fine server-side — hence the 5MB default threshold.
//
// If a manually uploaded "<name>_lowres.<ext>" sibling exists, it is used as
// the resize source to avoid downloading the multi-MB original.
//
// Usage (from the repo root):
//   npm i --no-save sharp             # one-off native dep, not committed
//   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
//   node scripts/backfill-thumbnails.mjs [--dry-run] [--min-size 5]
//
// The project URL is read from .env (VITE_SUPABASE_URL) unless SUPABASE_URL
// is set. The service-role key lives in the Supabase dashboard under
// Settings → API — never in .env or the repo.
//
// Flags:
//   --dry-run        list what would be generated, don't download/upload
//   --min-size <MB>  only process originals at least this large (default 5)
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'artwork-images';
const THUMB_PREFIX = 'thumbs/';
const THUMB_MAX_DIMENSION = 1200;
const THUMB_JPEG_QUALITY = 80;
const IMAGE_EXT_RE = /\.(jpe?g|png|webp)$/i;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const minSizeIdx = args.indexOf('--min-size');
const minSizeMB = minSizeIdx !== -1 ? Number(args[minSizeIdx + 1]) : 5;
if (!Number.isFinite(minSizeMB) || minSizeMB < 0) {
  console.error('Invalid --min-size value');
  process.exit(1);
}
const minSizeBytes = minSizeMB * 1024 * 1024;

function urlFromDotenv() {
  try {
    const match = readFileSync('.env', 'utf8').match(/^\s*(?:VITE_)?SUPABASE_URL\s*=\s*(\S+)/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? urlFromDotenv();
if (!url) {
  console.error('Set SUPABASE_URL, or run from the repo root so .env provides VITE_SUPABASE_URL');
  process.exit(1);
}
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY (Supabase dashboard → Settings → API)');
  process.exit(1);
}

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  if (!dryRun) {
    console.error('sharp is not installed. Run: npm i --no-save sharp');
    process.exit(1);
  }
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

/** Recursively list every file in the bucket as { path, size }. */
async function listAll(prefix = '') {
  const files = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`list(${prefix}): ${error.message}`);
    for (const item of data ?? []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        // folder
        files.push(...(await listAll(path)));
      } else {
        files.push({ path, size: item.metadata?.size ?? 0 });
      }
    }
    if (!data || data.length < PAGE) break;
  }
  return files;
}

function lowresSibling(path, allPaths) {
  const m = path.match(/^(.*)(\.[^.]+)$/);
  if (!m) return null;
  for (const ext of [m[2], '.jpg', '.jpeg', '.png', '.webp']) {
    const candidate = `${m[1]}_lowres${ext}`;
    if (allPaths.has(candidate)) return candidate;
  }
  return null;
}

console.log(`Listing ${BUCKET} …`);
const files = await listAll();
const allPaths = new Set(files.map((f) => f.path));
const existingThumbs = new Set(
  files.filter((f) => f.path.startsWith(THUMB_PREFIX)).map((f) => f.path),
);

const candidates = files.filter(
  (f) =>
    !f.path.startsWith(THUMB_PREFIX) &&
    IMAGE_EXT_RE.test(f.path) &&
    f.size >= minSizeBytes &&
    !existingThumbs.has(THUMB_PREFIX + f.path),
);

console.log(
  `${files.length} objects, ${existingThumbs.size} existing thumbnails, ` +
    `${candidates.length} originals ≥ ${minSizeMB}MB without a thumbnail`,
);

let ok = 0;
let failed = 0;

for (const file of candidates) {
  const source = lowresSibling(file.path, allPaths) ?? file.path;
  const note = source !== file.path ? ` (from ${source})` : '';
  if (dryRun) {
    console.log(`[dry-run] ${file.path} (${(file.size / 1024 / 1024).toFixed(1)}MB)${note}`);
    continue;
  }

  try {
    const { data: blob, error: dlError } = await supabase.storage.from(BUCKET).download(source);
    if (dlError) throw new Error(`download: ${dlError.message}`);

    const input = Buffer.from(await blob.arrayBuffer());
    const thumb = await sharp(input)
      .rotate() // apply EXIF orientation
      .resize(THUMB_MAX_DIMENSION, THUMB_MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: THUMB_JPEG_QUALITY })
      .toBuffer();

    const { error: upError } = await supabase.storage
      .from(BUCKET)
      .upload(THUMB_PREFIX + file.path, thumb, { contentType: 'image/jpeg', upsert: true });
    if (upError) throw new Error(`upload: ${upError.message}`);

    ok++;
    console.log(
      `✓ ${file.path}${note} → ${(thumb.length / 1024).toFixed(0)}KB`,
    );
  } catch (err) {
    failed++;
    console.error(`✗ ${file.path}: ${err.message}`);
  }
}

if (!dryRun) console.log(`Done: ${ok} generated, ${failed} failed.`);
