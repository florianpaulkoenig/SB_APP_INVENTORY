import { clsx, type ClassValue } from 'clsx';
import { format } from 'date-fns';
import { ARTWORK_REF_PREFIX, ARTWORK_STATUSES, DELIVERY_STATUSES, PRODUCTION_STATUSES, INVOICE_STATUSES } from './constants';

// ---------------------------------------------------------------------------
// Conditional class-name helper (clsx wrapper)
// ---------------------------------------------------------------------------
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// ---------------------------------------------------------------------------
// PostgREST filter term sanitisation
// Strips characters that could inject additional filter clauses in .or() /
// .ilike() calls (commas, parentheses, dots preceded by identifier chars).
// ---------------------------------------------------------------------------
export function sanitizeFilterTerm(input: string): string {
  return input.replace(/[,()%_\\.]/g, '').trim();
}

// ---------------------------------------------------------------------------
// Currency formatting
// ---------------------------------------------------------------------------
export function formatCurrency(amount: number, currency: string): string {
  const isCHF = currency === 'CHF';
  return new Intl.NumberFormat(isCHF ? 'de-CH' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: isCHF ? 0 : 2,
    maximumFractionDigits: isCHF ? 0 : 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Date formatting (uses date-fns)
// ---------------------------------------------------------------------------
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd MMM yyyy');
}

// ---------------------------------------------------------------------------
// Dimension formatting  --  "100 x 80 x 5 cm"
// ---------------------------------------------------------------------------
export function formatDimensions(
  height: number | null | undefined,
  width: number | null | undefined,
  depth: number | null | undefined,
  unit: string,
): string {
  const parts = [height, width, depth].filter(
    (v): v is number => v != null && v > 0,
  );

  if (parts.length === 0) return '';
  return `${parts.join(' \u00D7 ')} ${unit}`;
}

// ---------------------------------------------------------------------------
// Inventory number display  --  "SB-2026-001"
// ---------------------------------------------------------------------------
export function generateInventoryDisplay(
  prefix: string,
  year: number,
  number: number,
): string {
  return `${prefix}-${year}-${String(number).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// Truncate a string
// ---------------------------------------------------------------------------
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}

// ---------------------------------------------------------------------------
// Status color lookup -- returns Tailwind class string
// ---------------------------------------------------------------------------
export function getStatusColor(status: string): string {
  const allStatuses = [
    ...ARTWORK_STATUSES,
    ...DELIVERY_STATUSES,
    ...PRODUCTION_STATUSES,
    ...INVOICE_STATUSES,
  ];

  const match = allStatuses.find((s) => s.value === status);
  return match?.color ?? 'bg-gray-100 text-gray-800';
}

// ---------------------------------------------------------------------------
// Initials from a name  --  "Simon Berger" -> "SB"
// ---------------------------------------------------------------------------
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);
}

// ---------------------------------------------------------------------------
// Artwork reference code  --  "NOA-SB-2026-K7M2"
// Generates a unique 4-char code: 2 uppercase letters + 2 digits, randomly
// interleaved. This code is immutable once assigned.
// Uses crypto.getRandomValues for secure randomness.
// ---------------------------------------------------------------------------
export function generateArtworkRefCode(): string {
  const year = new Date().getFullYear();
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I, O to avoid confusion with 1, 0
  const digits = '23456789'; // no 0, 1 to avoid confusion with O, I

  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);

  // Positions for letters and digits: e.g., K7M2 = letter, digit, letter, digit
  const code =
    letters[arr[0] % letters.length] +
    digits[arr[1] % digits.length] +
    letters[arr[2] % letters.length] +
    digits[arr[3] % digits.length];

  return `${ARTWORK_REF_PREFIX}-${year}-${code}`;
}

// ---------------------------------------------------------------------------
// Storage path sanitization -- keep original filename in DB, use safe path for storage
// ---------------------------------------------------------------------------
export function sanitizeStoragePath(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  const name = lastDot > 0 ? filename.substring(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.substring(lastDot) : '';
  const sanitized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
  return (sanitized || 'file') + ext.toLowerCase();
}

// ---------------------------------------------------------------------------
// Safe file download helper
// Opens PDFs in a new browser tab (avoids Chrome "unsafe download" warnings
// for blob: downloads, especially on HTTP origins). For other file types,
// falls back to the standard anchor-click approach.
// ---------------------------------------------------------------------------

/** Build a certificate filename: Simon_Berger_[title]_[framedDim]_[year]_[refCode].pdf */
export function buildCertificateFilename(artwork: {
  title: string;
  framed_height?: number | null;
  framed_width?: number | null;
  framed_depth?: number | null;
  dimension_unit?: string;
  year?: number | null;
  reference_code: string;
}): string {
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  const parts: string[] = ['Simon_Berger'];
  parts.push(sanitize(artwork.title));
  const dims = [artwork.framed_height, artwork.framed_width, artwork.framed_depth].filter((v): v is number => v != null);
  if (dims.length > 0) {
    parts.push(dims.join('x') + (artwork.dimension_unit ?? 'cm'));
  }
  if (artwork.year != null) parts.push(String(artwork.year));
  parts.push(sanitize(artwork.reference_code));
  return parts.join('_') + '.pdf';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const isPdf = blob.type === 'application/pdf' || filename.endsWith('.pdf');

  if (isPdf) {
    // Open PDF in a new tab — the browser's built-in viewer lets the user
    // save, print, or copy.  This avoids the "unsafe download" warning that
    // Chrome shows for programmatic blob downloads on HTTP origins.
    const w = window.open(url, '_blank');
    // If popup was blocked, fall back to anchor download
    if (!w) {
      triggerAnchorDownload(url, filename);
    } else {
      // Revoke after a delay so the tab has time to load
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  } else {
    triggerAnchorDownload(url, filename);
  }
}

function triggerAnchorDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Small delay before revoking so the browser can start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
