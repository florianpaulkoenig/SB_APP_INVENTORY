import { memo } from 'react';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';
import type { GalleryRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Stats interface
// ---------------------------------------------------------------------------

export interface GalleryStats {
  total: number;
  onConsignment: number;
  sold: number;
  ordered: number;
  revenueSold: number;
  revenuePotential: number;
  revenueOrdered: number;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GalleryCardProps {
  gallery: GalleryRow;
  stats?: GalleryStats;
  /** @deprecated Use stats.total instead */
  artworkCount?: number;
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const GalleryCard = memo(function GalleryCard({ gallery, stats, artworkCount, onClick }: GalleryCardProps) {
  const location = [gallery.city, gallery.country].filter(Boolean).join(', ');
  const total = stats?.total ?? artworkCount ?? 0;

  return (
    <Card hoverable onClick={onClick} className="p-5">
      {/* Name + status dot */}
      <div className="flex items-center gap-2">
        {gallery.status_color && (
          <span
            className={`inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full ${
              gallery.status_color === 'green'
                ? 'bg-green-500'
                : gallery.status_color === 'yellow'
                  ? 'bg-yellow-400'
                  : 'bg-red-500'
            }`}
          />
        )}
        <h3 className="font-display text-base font-semibold text-primary-900 truncate">
          {gallery.name}
        </h3>
      </div>

      {/* Location */}
      {location && (
        <p className="mt-1 text-sm text-primary-500 truncate">{location}</p>
      )}

      {/* Contact info */}
      <div className="mt-3 space-y-1">
        {gallery.contact_person && (
          <div className="flex items-center gap-2 text-sm text-primary-600">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            <span className="truncate">{gallery.contact_person}</span>
          </div>
        )}

        {gallery.email && (
          <div className="flex items-center gap-2 text-sm text-primary-600">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            <span className="truncate">{gallery.email}</span>
          </div>
        )}
      </div>

      {/* Stats counters */}
      {stats && (
        <div className="mt-3 grid grid-cols-4 gap-1 rounded-md bg-primary-50 px-2 py-2 text-center">
          <div>
            <p className="text-xs text-primary-400">Total</p>
            <p className="text-sm font-semibold text-primary-800">{stats.total}</p>
          </div>
          <div>
            <p className="text-xs text-primary-400">Consigned</p>
            <p className="text-sm font-semibold text-blue-600">{stats.onConsignment}</p>
          </div>
          <div>
            <p className="text-xs text-primary-400">Sold</p>
            <p className="text-sm font-semibold text-red-600">{stats.sold}</p>
          </div>
          <div>
            <p className="text-xs text-primary-400">Ordered</p>
            <p className="text-sm font-semibold text-indigo-600">{stats.ordered}</p>
          </div>
        </div>
      )}

      {/* Revenue rows */}
      {stats && (stats.revenueSold > 0 || stats.revenuePotential > 0 || stats.revenueOrdered > 0) && (
        <div className="mt-2 space-y-0.5 text-xs">
          {stats.revenueSold > 0 && (
            <div className="flex justify-between">
              <span className="text-primary-400">Revenue Sold</span>
              <span className="font-medium text-primary-700">{formatCurrency(Math.round(stats.revenueSold), 'CHF')}</span>
            </div>
          )}
          {stats.revenuePotential > 0 && (
            <div className="flex justify-between">
              <span className="text-primary-400">Revenue Potential</span>
              <span className="font-medium text-amber-600">{formatCurrency(Math.round(stats.revenuePotential), 'CHF')}</span>
            </div>
          )}
          {stats.revenueOrdered > 0 && (
            <div className="flex justify-between">
              <span className="text-primary-400">Revenue Ordered</span>
              <span className="font-medium text-indigo-600">{formatCurrency(Math.round(stats.revenueOrdered), 'CHF')}</span>
            </div>
          )}
        </div>
      )}

      {/* Commission badge */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {gallery.commission_rate != null && (
          <span className="inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
            {gallery.commission_rate}% commission
          </span>
        )}
      </div>
    </Card>
  );
});
