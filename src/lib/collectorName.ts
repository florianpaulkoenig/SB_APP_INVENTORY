// ---------------------------------------------------------------------------
// NOA Inventory -- Collector name helpers (pure, unit-tested)
// Used when a sale is recorded with a free-text buyer name: match it against
// existing contacts, or split it into first / last name for a new contact.
// ---------------------------------------------------------------------------

export interface NameParts {
  first_name: string;
  last_name: string;
}

interface ContactLike {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company?: string | null;
}

/** Collapse whitespace; the comparison key for name matching. */
export function normalizeName(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** "Anna Müller" for a contact; falls back to the company name. */
export function contactDisplayName(c: Pick<ContactLike, 'first_name' | 'last_name' | 'company'>): string {
  const name = [c.first_name, c.last_name].map((p) => (p ?? '').trim()).filter(Boolean).join(' ');
  return name || (c.company ?? '').trim();
}

/**
 * Split a typed name into first / last name.
 *   "Anna Maria Müller" → { first: "Anna Maria", last: "Müller" }
 *   "Müller, Anna"      → { first: "Anna",       last: "Müller" }
 *   "Sotheby's"         → { first: "",           last: "Sotheby's" }
 */
export function splitName(full: string): NameParts {
  const name = full.replace(/\s+/g, ' ').trim();
  if (!name) return { first_name: '', last_name: '' };
  const comma = name.indexOf(',');
  if (comma >= 0) {
    return {
      last_name: name.slice(0, comma).trim(),
      first_name: name.slice(comma + 1).trim(),
    };
  }
  const parts = name.split(' ');
  if (parts.length === 1) return { first_name: '', last_name: name };
  return { first_name: parts.slice(0, -1).join(' '), last_name: parts[parts.length - 1] };
}

/** Exact (case- and whitespace-insensitive) match on "First Last", "Last, First" or company. */
export function findContactByName<T extends ContactLike>(contacts: readonly T[], name: string): T | null {
  const key = normalizeName(name);
  if (!key) return null;
  for (const c of contacts) {
    const first = normalizeName(c.first_name);
    const last  = normalizeName(c.last_name);
    if (key === normalizeName(`${first} ${last}`)) return c;
    if (first && last && key === `${last}, ${first}`) return c;
    if (c.company && key === normalizeName(c.company)) return c;
  }
  return null;
}

/** Contacts whose name or company contains every typed term — for typeahead. */
export function searchContacts<T extends ContactLike>(contacts: readonly T[], query: string, limit = 6): T[] {
  const terms = normalizeName(query).split(' ').filter(Boolean);
  if (terms.length === 0) return [];
  const out: T[] = [];
  for (const c of contacts) {
    const hay = normalizeName(`${c.first_name ?? ''} ${c.last_name ?? ''} ${c.company ?? ''}`);
    if (terms.every((t) => hay.includes(t))) {
      out.push(c);
      if (out.length >= limit) break;
    }
  }
  return out;
}
