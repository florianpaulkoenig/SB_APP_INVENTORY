import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Badge } from '../ui/Badge';
import type { ArtworkMovementRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkMovementHistoryProps {
  artworkId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtworkMovementHistory({ artworkId }: ArtworkMovementHistoryProps) {
  const [movements, setMovements] = useState<ArtworkMovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMovements() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('artwork_movements')
        .select('*')
        .eq('artwork_id', artworkId)
        .order('movement_date', { ascending: false });

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setMovements(data ?? []);
      setLoading(false);
    }

    fetchMovements();

    return () => {
      cancelled = true;
    };
  }, [artworkId]);

  // -- Loading state --------------------------------------------------------
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // -- Error state ----------------------------------------------------------
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load movement history: {error}
      </div>
    );
  }

  // -- Empty state ----------------------------------------------------------
  if (movements.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-primary-400">
        No movement history recorded for this artwork.
      </div>
    );
  }

  // -- Timeline -------------------------------------------------------------
  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-primary-200" />

      <ul className="space-y-6">
        {movements.map((movement) => {
          const typeLabel = movement.movement_type
            .split('_')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

          return (
            <li key={movement.id} className="relative pl-8">
              {/* Timeline dot */}
              <div className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-accent bg-white" />

              {/* Content */}
              <div className="space-y-1">
                {/* Date + Type */}
                <div className="flex flex-wrap items-center gap-2">
                  <time className="text-xs font-medium text-primary-500">
                    {formatDate(movement.movement_date)}
                  </time>
                  <Badge className="bg-primary-100 text-primary-700">
                    {typeLabel}
                  </Badge>
                </div>

                {/* From -> To */}
                <p className="text-sm text-primary-800">
                  {movement.from_location ? (
                    <>
                      <span className="text-primary-500">
                        {movement.from_location}
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
                      <span className="font-medium">{movement.to_location}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{movement.to_location}</span>
                    </>
                  )}
                </p>

                {/* Notes */}
                {movement.notes && (
                  <p className="text-xs text-primary-500">{movement.notes}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
