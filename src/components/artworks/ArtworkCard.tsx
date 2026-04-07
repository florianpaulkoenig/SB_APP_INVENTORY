import React from 'react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { formatCurrency, formatDimensions, truncate } from '../../lib/utils';
import type { ArtworkRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkCardProps {
  artwork: ArtworkRow & { galleries?: { name: string } | null };
  imageUrl?: string | null;
  onClick?: () => void;
  onDownloadCertificate?: (artworkId: string) => void;
  downloadingCertificate?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ArtworkCard = React.memo(function ArtworkCard({ artwork, imageUrl, onClick, onDownloadCertificate, downloadingCertificate }: ArtworkCardProps) {
  const [imgError, setImgError] = React.useState(false);

  // Reset error state when imageUrl changes
  React.useEffect(() => { setImgError(false); }, [imageUrl]);
  const dimensions = formatDimensions(
    artwork.height,
    artwork.width,
    artwork.depth,
    artwork.dimension_unit,
    artwork.is_circular,
  );

  const mediumYear = [artwork.medium, artwork.year?.toString()]
    .filter(Boolean)
    .join(', ');

  return (
    <Card hoverable onClick={onClick} className="group relative overflow-hidden">
      {/* Image area */}
      <div className="aspect-square bg-primary-100">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={artwork.title}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
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

        {/* Certificate download icon — top-right corner */}
        {onDownloadCertificate && (
          <button
            type="button"
            title="Download Certificate"
            onClick={(e) => {
              e.stopPropagation();
              onDownloadCertificate(artwork.id);
            }}
            disabled={downloadingCertificate}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-primary-600 opacity-0 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-primary-900 group-hover:opacity-100 disabled:opacity-50"
          >
            {downloadingCertificate ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
            )}
          </button>
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

        {/* Gallery name */}
        {(artwork as ArtworkCardProps['artwork']).galleries?.name && (
          <p className="text-xs text-accent truncate">
            {(artwork as ArtworkCardProps['artwork']).galleries!.name}
          </p>
        )}

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
          <div className="flex items-center gap-1.5">
            <StatusBadge status={artwork.status} />
            {artwork.available_for_partners && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700" title="Available for Partners">
                Partners
              </span>
            )}
          </div>
          {artwork.price != null && (
            <span className="text-sm font-medium text-primary-800">
              {formatCurrency(artwork.price, artwork.currency)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
});
