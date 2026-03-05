import { Card } from '../ui/Card';
import type { GalleryRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GalleryCardProps {
  gallery: GalleryRow;
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GalleryCard({ gallery, onClick }: GalleryCardProps) {
  const location = [gallery.city, gallery.country].filter(Boolean).join(', ');

  return (
    <Card hoverable onClick={onClick} className="p-5">
      {/* Name */}
      <h3 className="font-display text-base font-semibold text-primary-900 truncate">
        {gallery.name}
      </h3>

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

      {/* Commission badge */}
      {gallery.commission_rate != null && (
        <div className="mt-3">
          <span className="inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
            {gallery.commission_rate}% commission
          </span>
        </div>
      )}
    </Card>
  );
}
