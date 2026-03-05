import { useState, useEffect, useCallback } from 'react';
import { useShareLink } from '../../hooks/useShareLinks';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { COMPANY_NAME } from '../../lib/constants';
import { formatDate } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ShareDownloadPageProps {
  token: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareDownloadPage({ token }: ShareDownloadPageProps) {
  const { link, loading, error, expired, incrementDownload, getSignedUrls } =
    useShareLink(token);

  const [downloading, setDownloading] = useState(false);
  const [downloadingArtwork, setDownloadingArtwork] = useState<string | null>(null);

  // ---- Download helpers ----------------------------------------------------

  const triggerDownloads = useCallback(
    async (urls: { url: string; fileName: string }[]) => {
      for (const { url, fileName } of urls) {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Small delay between downloads to avoid browser blocking
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    [],
  );

  const handleDownloadAll = useCallback(async () => {
    setDownloading(true);
    try {
      const urls = await getSignedUrls();
      if (urls.length > 0) {
        await triggerDownloads(urls);
        await incrementDownload();
      }
    } finally {
      setDownloading(false);
    }
  }, [getSignedUrls, triggerDownloads, incrementDownload]);

  const handleDownloadArtwork = useCallback(
    async (artworkId: string) => {
      setDownloadingArtwork(artworkId);
      try {
        const allUrls = await getSignedUrls();
        const artworkUrls = allUrls.filter((u) => u.artworkId === artworkId);
        if (artworkUrls.length > 0) {
          await triggerDownloads(artworkUrls);
          await incrementDownload();
        }
      } finally {
        setDownloadingArtwork(null);
      }
    },
    [getSignedUrls, triggerDownloads, incrementDownload],
  );

  // ---- Loading state -------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-primary-400">Loading shared images...</p>
        </div>
      </div>
    );
  }

  // ---- Error / expired / not found state -----------------------------------

  if (error || expired || !link) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
            <svg
              className="h-8 w-8 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>

          <h1 className="font-display text-2xl font-semibold text-primary-900">
            This link has expired or is invalid
          </h1>
          <p className="mt-3 text-sm text-primary-500">
            The share link you followed is no longer available. It may have
            expired or been removed by the owner. Please contact the sender for
            a new link.
          </p>

          {/* Branding */}
          <div className="mt-10 border-t border-primary-100 pt-6">
            <p className="text-xs text-primary-300">{COMPANY_NAME}</p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Compute artwork data from link --------------------------------------

  // We need to group images by artwork. Since useShareLink returns flat signed
  // URL data, we build the artwork cards from link.artwork_ids and fetch image
  // info on demand. For the card display, we query the artworks and their
  // images inline via a helper component below.

  return (
    <div className="min-h-screen bg-white">
      {/* ---- Header ---- */}
      <header className="border-b border-primary-100">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {/* Branding */}
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#c9a96e]">
            {COMPANY_NAME}
          </p>

          <h1 className="font-display mt-4 text-3xl font-semibold text-primary-900">
            Shared Images
          </h1>

          <p className="mt-2 text-sm text-primary-500">
            {link.artwork_ids.length} artwork{link.artwork_ids.length !== 1 ? 's' : ''}{' '}
            &middot; Shared on {formatDate(link.created_at)}
            {link.expiry && (
              <>
                {' '}
                &middot; Expires {formatDate(link.expiry)}
              </>
            )}
          </p>

          {/* Download all button */}
          <div className="mt-6">
            <Button
              variant="primary"
              size="lg"
              onClick={handleDownloadAll}
              loading={downloading}
              className="bg-[#c9a96e] hover:bg-[#b89555] active:bg-[#a6843e]"
            >
              <svg
                className="h-5 w-5"
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
              Download All Images
            </Button>
          </div>
        </div>
      </header>

      {/* ---- Artwork grid ---- */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {link.artwork_ids.map((artworkId) => (
            <ArtworkCard
              key={artworkId}
              artworkId={artworkId}
              imageTypes={link.image_types}
              downloading={downloadingArtwork === artworkId}
              onDownload={() => handleDownloadArtwork(artworkId)}
            />
          ))}
        </div>
      </main>

      {/* ---- Footer ---- */}
      <footer className="border-t border-primary-100">
        <div className="mx-auto max-w-5xl px-6 py-8 text-center">
          <p className="text-xs text-primary-300">
            Powered by {COMPANY_NAME}
          </p>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ArtworkCard -- loads artwork data independently for the public page
// ---------------------------------------------------------------------------

interface ArtworkCardProps {
  artworkId: string;
  imageTypes: string[];
  downloading: boolean;
  onDownload: () => void;
}

function ArtworkCard({
  artworkId,
  imageTypes,
  downloading,
  onDownload,
}: ArtworkCardProps) {
  const [title, setTitle] = useState<string>('Loading...');
  const [imageCount, setImageCount] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  // Fetch artwork info on mount
  useEffect(() => {
    let cancelled = false;

    const fetchInfo = async () => {
      try {
        const [artworkRes, imagesRes] = await Promise.all([
          supabase
            .from('artworks')
            .select('title')
            .eq('id', artworkId)
            .single(),
          supabase
            .from('artwork_images')
            .select('id, image_type')
            .eq('artwork_id', artworkId)
            .in('image_type', imageTypes),
        ]);

        if (cancelled) return;

        if (artworkRes.data) {
          setTitle(artworkRes.data.title);
        }

        if (imagesRes.data) {
          setImageCount(imagesRes.data.length);
        }

        setLoaded(true);
      } catch {
        if (!cancelled) {
          setTitle('Untitled');
          setLoaded(true);
        }
      }
    };

    fetchInfo();

    return () => {
      cancelled = true;
    };
  }, [artworkId, imageTypes]);

  // Image type label mapping
  const imageTypeLabels: Record<string, string> = {
    raw: 'RAW',
    retouched: 'Retouched',
    detail: 'Detail',
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-5">
        {/* Title */}
        <h3 className="font-display text-lg font-semibold text-primary-900 truncate">
          {title}
        </h3>

        {/* Image types as badges */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {imageTypes.map((type) => (
            <Badge key={type} variant="default">
              {imageTypeLabels[type] ?? type}
            </Badge>
          ))}
        </div>

        {/* Image count */}
        {loaded && (
          <p className="mt-3 text-xs text-primary-400">
            {imageCount} image{imageCount !== 1 ? 's' : ''} available
          </p>
        )}

        {/* Download button */}
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            loading={downloading}
            className="w-full"
          >
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
            Download All
          </Button>
        </div>
      </div>
    </Card>
  );
}
