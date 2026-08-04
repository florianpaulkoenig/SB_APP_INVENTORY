import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Badge } from '../ui/Badge';
import type { ArtworkMutationRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkMutationLogProps {
  artworkId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<string, string> = {
  created: 'Created',
  status: 'Status',
  gallery: 'Gallery',
  location: 'Location',
  price: 'Price',
  estimated_value: 'Estimated Value',
  purchase_price: 'Purchase Price',
};

const FIELD_BADGE_CLASSES: Record<string, string> = {
  created: 'bg-emerald-100 text-emerald-700',
  status: 'bg-blue-100 text-blue-700',
  gallery: 'bg-purple-100 text-purple-700',
  location: 'bg-amber-100 text-amber-700',
  price: 'bg-rose-100 text-rose-700',
  estimated_value: 'bg-teal-100 text-teal-700',
  purchase_price: 'bg-teal-100 text-teal-700',
};

const INITIAL_VISIBLE = 15;

function fieldLabel(field: string): string {
  return (
    FIELD_LABELS[field] ??
    field
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}

/** Status values arrive as snake_case ('on_consignment') — prettify them. */
function formatValue(field: string, value: string | null): string {
  if (value === null || value === '') return '—';
  if (field === 'status' || field === 'created') {
    return value
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return value;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtworkMutationLog({ artworkId }: ArtworkMutationLogProps) {
  const [mutations, setMutations] = useState<ArtworkMutationRow[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchMutations() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('artwork_mutations')
        .select('*')
        .eq('artwork_id', artworkId)
        .order('changed_at', { ascending: false });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const rows = (data as ArtworkMutationRow[]) ?? [];
      setMutations(rows);
      setLoading(false);

      // Resolve actor display names (best-effort; UUIDs stay hidden on failure)
      const actorIds = [...new Set(rows.map((r) => r.changed_by).filter(Boolean))] as string[];
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name')
          .in('user_id', actorIds);
        if (cancelled || !profiles) return;
        const names: Record<string, string> = {};
        for (const p of profiles as { user_id: string; display_name: string | null }[]) {
          if (p.display_name) names[p.user_id] = p.display_name;
        }
        setActorNames(names);
      }
    }

    fetchMutations();

    return () => {
      cancelled = true;
    };
  }, [artworkId]);

  const visible = showAll ? mutations : mutations.slice(0, INITIAL_VISIBLE);

  return (
    <section className="rounded-lg border border-primary-100 bg-white p-6">
      {/* Header */}
      <div className="mb-4">
        <h2 className="font-display text-base font-semibold text-primary-900">
          Change Log
        </h2>
        <p className="mt-0.5 text-xs text-primary-400">
          Automatic record of status, gallery, location and price changes
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load change log: {error}
        </div>
      ) : mutations.length === 0 ? (
        <div className="py-8 text-center text-sm text-primary-400">
          No changes recorded yet. Changes to status, gallery, location and
          prices are logged automatically from now on.
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-primary-200" />

          <ul className="space-y-6">
            {visible.map((mutation) => {
              const actor = mutation.changed_by
                ? actorNames[mutation.changed_by] ?? null
                : 'System';

              return (
                <li key={mutation.id} className="relative pl-8">
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-accent bg-white" />

                  {/* Content */}
                  <div className="space-y-1">
                    {/* Date + field + actor */}
                    <div className="flex flex-wrap items-center gap-2">
                      <time className="text-xs font-medium text-primary-500">
                        {format(new Date(mutation.changed_at), 'dd MMM yyyy, HH:mm')}
                      </time>
                      <Badge
                        className={
                          FIELD_BADGE_CLASSES[mutation.field] ??
                          'bg-primary-100 text-primary-700'
                        }
                      >
                        {fieldLabel(mutation.field)}
                      </Badge>
                      {actor && (
                        <span className="text-xs text-primary-400">by {actor}</span>
                      )}
                    </div>

                    {/* Old -> New */}
                    <p className="text-sm text-primary-800">
                      {mutation.field === 'created' ? (
                        <>
                          Artwork created with status{' '}
                          <span className="font-medium">
                            {formatValue('created', mutation.new_value)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-primary-500">
                            {formatValue(mutation.field, mutation.old_value)}
                          </span>
                          <svg
                            className="mx-1.5 inline-block h-3.5 w-3.5 text-primary-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                            />
                          </svg>
                          <span className="font-medium">
                            {formatValue(mutation.field, mutation.new_value)}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {mutations.length > INITIAL_VISIBLE && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-4 pl-8 text-xs font-medium text-accent hover:underline"
            >
              {showAll
                ? 'Show fewer'
                : `Show all ${mutations.length} entries`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
