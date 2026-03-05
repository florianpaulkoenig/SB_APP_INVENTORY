import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { formatCurrency, formatDimensions, truncate } from '../../lib/utils';
import type { ArtworkRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkCardProps {
  artwork: ArtworkRow;
  imageUrl?: string | null;
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtworkCard({ artwork, imageUrl, onClick }: ArtworkCardProps) {
  const dimensions = formatDimensions(
    artwork.height,
    artwork.width,
    artwork.depth,
    artwork.dimension_unit,
  );

  const mediumYear = [artwork.medium, artwork.year?.toString()]
    .filter(Boolean)
    .join(', ');

  return (
    <Card hoverable onClick={onClick} className="overflow-hidden">
      {/* Image area */}
      <div className="aspect-[4/3] bg-primary-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={artwork.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              className="h-12 w-12 text-primary-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        {/* Title */}
        <h3 className="font-display text-base font-semibold text-primary-900 truncate">
          {truncate(artwork.title, 40)}
        </h3>

        {/* Reference code */}
        <p className="font-mono text-xs text-primary-400">
          {artwork.reference_code}
        </p>

        {/* Medium + Year */}
        {mediumYear && (
          <p className="text-sm text-primary-600 truncate">{mediumYear}</p>
        )}

        {/* Dimensions */}
        {dimensions && (
          <p className="text-sm text-primary-500">{dimensions}</p>
        )}

        {/* Status + Price row */}
        <div className="flex items-center justify-between pt-1">
          <StatusBadge status={artwork.status} />
          {artwork.price != null && (
            <span className="text-sm font-medium text-primary-800">
              {formatCurrency(artwork.price, artwork.currency)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
