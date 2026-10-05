// ---------------------------------------------------------------------------
// NOA Inventory -- Resolve a sale's buyer to a contact
// A sale can be recorded with a picked contact or a free-text name. This
// links the name to an existing contact when it matches exactly, otherwise
// creates a new collector contact — so every buyer ends up in Contacts and
// artworks can be filtered by collector.
// ---------------------------------------------------------------------------

import { supabase } from './supabase';
import { splitName, findContactByName } from './collectorName';
import type { ContactRow } from '../types/database';

export interface CollectorValue {
  /** Picked / matched contact, or null for a free-text name */
  contactId: string | null;
  /** The name as shown in the input (kept in sales.buyer_name as well) */
  name: string;
}

export const EMPTY_COLLECTOR: CollectorValue = { contactId: null, name: '' };

export interface ResolvedCollector {
  contactId: string | null;
  buyerName: string | null;
  /** Set when a new contact was created for this sale */
  created: ContactRow | null;
}

const CONTACT_COLS = 'id, first_name, last_name, company';

export async function ensureCollectorContact(value: CollectorValue): Promise<ResolvedCollector> {
  const name = value.name.replace(/\s+/g, ' ').trim();
  if (!name) return { contactId: null, buyerName: null, created: null };
  if (value.contactId) return { contactId: value.contactId, buyerName: name, created: null };

  // Exact match against existing contacts first (any role — a prospect who
  // buys is simply linked, not duplicated)
  const { data: candidates } = await supabase
    .from('contacts')
    .select(CONTACT_COLS)
    .or(buildNameMatchOr(name))
    .limit(20);
  const match = findContactByName((candidates ?? []) as ContactRow[], name);
  if (match) return { contactId: match.id, buyerName: name, created: null };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('You must be logged in');

  const parts = splitName(name);
  const { data: created, error } = await supabase
    .from('contacts')
    .insert({
      user_id: session.user.id,
      type: 'collector',
      first_name: parts.first_name,
      last_name: parts.last_name,
      source: 'sale',
    } as never)
    .select()
    .single();
  if (error) throw error;
  return { contactId: (created as ContactRow).id, buyerName: name, created: created as ContactRow };
}

/** PostgREST `or` filter narrowing candidates before the exact in-memory match. */
function buildNameMatchOr(name: string): string {
  const parts = splitName(name);
  const esc = (s: string) => s.replace(/[%_,()]/g, ' ').trim();
  const clauses = [`company.ilike.${esc(name)}`];
  if (parts.last_name) clauses.push(`last_name.ilike.${esc(parts.last_name)}`);
  if (parts.first_name) clauses.push(`first_name.ilike.${esc(parts.first_name)}`);
  return clauses.join(',');
}
