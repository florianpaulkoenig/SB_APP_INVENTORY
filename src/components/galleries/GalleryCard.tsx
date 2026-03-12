import { Card } from '../ui/Card';
import type { GalleryRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GalleryCardProps {
  gallery: GalleryRow;
  artworkCount?: number;
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GalleryCard({ gallery, artworkCount, onClick }: GalleryCardProps) {
  const location = [gallery.city, gallery.country].filter(Boolean).join(', ');

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

      {/* Artwork count + Commission badge */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {artworkCount != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            {artworkCount} {artworkCount === 1 ? 'artwork' : 'artworks'}
          </span>
        )}
        {gallery.commission_rate != null && (
          <span className="inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
            {gallery.commission_rate}% commission
          </span>
        )}
      </div>
    </Card>
  );
}
