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

  const galleryName = (artwork as ArtworkCardProps['artwork']).galleries?.name;
  const detailLine = [artwork.year?.toString(), dimensions].filter(Boolean).join(' · ');

  return (
    <Card hoverable onClick={onClick} className="group relative overflow-hidden border-0">
      {/* Image */}
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
            <svg className="h-10 w-10 text-primary-200" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}

        {/* Certificate download — appears on hover */}
        {onDownloadCertificate && (
          <button
            type="button"
            title="Download Certificate"
            onClick={(e) => { e.stopPropagation(); onDownloadCertificate(artwork.id); }}
            disabled={downloadingCertificate}
            className="absolute right-2 top-2 bg-white/90 p-1.5 text-primary-500 opacity-0 backdrop-blur-sm transition-all hover:text-primary-900 group-hover:opacity-100 disabled:opacity-50"
          >
            {downloadingCertificate ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="px-4 py-3 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-primary-900 truncate">
            {artwork.title}
          </h3>
          {artwork.reference_code && (
            <span className="shrink-0 text-xs text-primary-400">{artwork.reference_code}</span>
          )}
        </div>

        {artwork.artist_name && (
          <p className="text-xs font-medium text-primary-600 truncate">{artwork.artist_name}</p>
        )}

        {galleryName && (
          <p className="text-xs text-primary-400 truncate">{galleryName}</p>
        )}

        {detailLine && (
          <p className="text-xs text-primary-400 truncate">{detailLine}</p>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-primary-400 uppercase tracking-wide">
            {artwork.status.replace(/_/g, ' ')}
          </span>
          {artwork.price != null && (
            <span className="text-xs text-primary-700">
              {formatCurrency(artwork.price, artwork.currency)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
});
