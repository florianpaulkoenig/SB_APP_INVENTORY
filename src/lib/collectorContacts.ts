// ---------------------------------------------------------------------------
// Contact list for the CollectorPicker — loaded once per page and shared.
// Kept outside the component file so it can be invalidated from anywhere
// (after a contact is created) without tripping React Fast Refresh.
// ---------------------------------------------------------------------------

import { supabase } from './supabase';

export interface PickerContact {
  id: string;
  first_name: string;
  last_name: string;
  company: string | null;
  type: string;
  city: string | null;
}

let cache: PickerContact[] | null = null;
let inflight: Promise<PickerContact[]> | null = null;

export async function loadPickerContacts(): Promise<PickerContact[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = (async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, company, type, city')
        .order('last_name')
        .limit(2000);
      const list = (data ?? []) as PickerContact[];
      cache = list;
      return list;
    })();
  }
  return inflight;
}

export function peekPickerContacts(): PickerContact[] {
  return cache ?? [];
}

/** Forget the cached list — call after creating a contact elsewhere. */
export function invalidateCollectorPickerCache(): void {
  cache = null;
  inflight = null;
}
