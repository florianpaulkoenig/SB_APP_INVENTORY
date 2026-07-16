// ---------------------------------------------------------------------------
// Text sanitization for database writes.
//
// Text pasted from websites, PDFs or Word often carries invisible characters
// that PostgreSQL rejects (the write fails with a 400 and the save appears
// "blocked" to the user):
//   - NULL bytes and other C0/C1 control characters ("unsupported Unicode
//     escape sequence" / "invalid byte sequence" errors)
//   - lone UTF-16 surrogates from half-copied emoji ("invalid surrogate pair")
//   - zero-width spaces / joiners and BOMs (saved silently but break search
//     and look like corrupted data)
//   - U+2028/U+2029 line separators and non-breaking spaces
//
// deepClean() walks any JSON-shaped value and cleans every string in place.
// It is applied centrally in the Supabase client fetch wrapper, so every
// form in the app is covered without per-form changes.
// ---------------------------------------------------------------------------

// C0 controls except \t \n \r, DEL + C1 controls, zero-width chars,
// word joiner, BOM.
const STRIP_CHARS =
  // eslint-disable-next-line no-control-regex -- matching control chars is the point
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\u2060\uFEFF]/g;

// Unicode line/paragraph separators (U+2028/U+2029) — Postgres accepts them
// but they render inconsistently; normalize to a regular newline.
const LINE_SEPARATORS = /[\u2028\u2029]/g;

// Lone surrogates (high without following low, or low without preceding high)
// produce invalid UTF-8 on the wire and are rejected by Postgres.
const LONE_SURROGATES =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

// Non-breaking space → regular space.
const NBSP = /\u00A0/g;

export function cleanString(value: string): string {
  return value
    .replace(LINE_SEPARATORS, '\n')
    .replace(NBSP, ' ')
    .replace(LONE_SURROGATES, '')
    .replace(STRIP_CHARS, '');
}

export function deepClean<T>(value: T): T {
  if (typeof value === 'string') return cleanString(value) as T;
  if (Array.isArray(value)) return value.map(deepClean) as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = deepClean(val);
    }
    return out as T;
  }
  return value;
}
