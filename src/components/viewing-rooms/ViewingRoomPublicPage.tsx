// ---------------------------------------------------------------------------
// NOA Inventory -- Viewing Room Public Page
// Public-facing gallery-style viewing room. No auth required.
// Supports three templates: Grid, Carousel, Editorial.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { usePublicViewingRoom } from '../../hooks/useViewingRooms';
import { supabase } from '../../lib/supabase';
import { COMPANY_NAME, ARTIST_NAME } from '../../lib/constants';
import { formatDimensions } from '../../lib/utils';
import type { PublicArtwork } from '../../hooks/useViewingRooms';
import type { ViewingRoomTemplate } from '../../types/database';

// ---------------------------------------------------------------------------
// Edition display helper
// ---------------------------------------------------------------------------

function formatEdition(artwork: PublicArtwork): string | null {
  if (artwork.edition_type === 'unique') return 'Unique';
  if (!artwork.edition_type) return null;

  const label =
    artwork.edition_type === 'numbered'
      ? 'Edition'
      : artwork.edition_type; // AP, HC, EA

  if (artwork.edition_number != null && artwork.edition_total != null) {
    return `${label} ${artwork.edition_number}/${artwork.edition_total}`;
  }

  if (artwork.edition_number != null) {
    return `${label} ${artwork.edition_number}`;
  }

  return label;
}

// ---------------------------------------------------------------------------
// Shared artwork metadata helper
// ---------------------------------------------------------------------------

function useArtworkMeta(artwork: PublicArtwork) {
  const dimensions = formatDimensions(
    artwork.height,
    artwork.width,
    artwork.depth,
    artwork.dimension_unit,
  );
  const edition = formatEdition(artwork);
  const mediumYear = [artwork.medium, artwork.year?.toString()]
    .filter(Boolean)
    .join(', ');
  return { dimensions, edition, mediumYear };
}

// ---------------------------------------------------------------------------
// Grid Template — Artwork Card (minimal gallery style with hover overlay)
// ---------------------------------------------------------------------------

function ArtworkCard({
  artwork,
  large,
}: {
  artwork: PublicArtwork;
  large?: boolean;
}) {
  const { dimensions, edition, mediumYear } = useArtworkMeta(artwork);

  return (
    <div className={`group ${large ? 'mx-auto max-w-4xl' : ''}`}>
      {/* Image with hover overlay */}
      <div className="relative w-full overflow-hidden bg-neutral-50">
        {artwork.imageUrl ? (
          <img
            src={artwork.imageUrl}
            alt={artwork.title}
            loading="lazy"
            className={`w-full object-contain transition-all duration-700 ${
              large ? 'max-h-[80vh]' : 'aspect-[3/4] object-cover'
            }`}
          />
        ) : (
          <ArtworkPlaceholder />
        )}

        {/* Hover overlay with details */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/60 to-transparent p-6 pt-16 transition-transform duration-300 group-hover:translate-y-0">
          <p className="text-sm font-medium text-white/90">{artwork.title}</p>
          {mediumYear && (
            <p className="mt-0.5 text-xs text-white/70">{mediumYear}</p>
          )}
          {dimensions && (
            <p className="mt-0.5 text-xs text-white/60">{dimensions}</p>
          )}
          {edition && (
            <p className="mt-0.5 text-xs text-white/60">{edition}</p>
          )}
        </div>
      </div>

      {/* Minimal caption below — always visible */}
      <div className="mt-3 space-y-0.5">
        <p className="text-[13px] font-light text-neutral-800">{artwork.title}</p>
        {mediumYear && (
          <p className="text-[11px] font-light text-neutral-400">{mediumYear}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared placeholder
// ---------------------------------------------------------------------------

function ArtworkPlaceholder() {
  return (
    <div className="flex aspect-[3/4] w-full items-center justify-center bg-neutral-50">
      <svg
        className="h-16 w-16 text-neutral-200"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="0.5"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
        />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GRID Template Layout
// ---------------------------------------------------------------------------

function GridLayout({ artworks }: { artworks: PublicArtwork[] }) {
  const useSingleColumn = artworks.length <= 4;

  if (artworks.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm font-light text-neutral-400">
          No artworks in this viewing room yet.
        </p>
      </div>
    );
  }

  if (useSingleColumn) {
    return (
      <div className="space-y-20 md:space-y-28">
        {artworks.map((artwork) => (
          <ArtworkCard key={artwork.id} artwork={artwork} large />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-16 sm:grid-cols-2 md:gap-x-14 md:gap-y-20">
      {artworks.map((artwork) => (
        <ArtworkCard key={artwork.id} artwork={artwork} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CAROUSEL Template Layout
// ---------------------------------------------------------------------------

function CarouselLayout({ artworks }: { artworks: PublicArtwork[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % artworks.length);
  }, [artworks.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + artworks.length) % artworks.length);
  }, [artworks.length]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  if (artworks.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm font-light text-neutral-400">
          No artworks in this viewing room yet.
        </p>
      </div>
    );
  }

  const artwork = artworks[currentIndex];
  const { dimensions, edition, mediumYear } = (() => {
    const d = formatDimensions(artwork.height, artwork.width, artwork.depth, artwork.dimension_unit);
    const ed = formatEdition(artwork);
    const my = [artwork.medium, artwork.year?.toString()].filter(Boolean).join(', ');
    return { dimensions: d, edition: ed, mediumYear: my };
  })();

  return (
    <div className="relative">
      {/* Main artwork display */}
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="w-full max-w-5xl">
          {artwork.imageUrl ? (
            <img
              src={artwork.imageUrl}
              alt={artwork.title}
              className="mx-auto max-h-[75vh] w-auto object-contain transition-opacity duration-500"
            />
          ) : (
            <div className="mx-auto max-w-lg">
              <ArtworkPlaceholder />
            </div>
          )}
        </div>
      </div>

      {/* Caption */}
      <div className="mx-auto mt-8 max-w-2xl text-center">
        <p className="text-base font-light text-neutral-900">{artwork.title}</p>
        {mediumYear && (
          <p className="mt-1 text-sm font-light text-neutral-500">{mediumYear}</p>
        )}
        {dimensions && (
          <p className="mt-0.5 text-xs font-light text-neutral-400">{dimensions}</p>
        )}
        {edition && (
          <p className="mt-0.5 text-xs font-light text-neutral-400">{edition}</p>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-center gap-8">
        {/* Prev button */}
        <button
          type="button"
          onClick={goPrev}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-800"
          aria-label="Previous artwork"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Counter */}
        <span className="text-xs font-light tracking-widest text-neutral-400">
          {currentIndex + 1} / {artworks.length}
        </span>

        {/* Next button */}
        <button
          type="button"
          onClick={goNext}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-800"
          aria-label="Next artwork"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Thumbnail strip */}
      {artworks.length > 1 && (
        <div className="mx-auto mt-8 flex max-w-4xl justify-center gap-2 overflow-x-auto px-4 pb-2">
          {artworks.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className={`flex-shrink-0 overflow-hidden rounded transition-all duration-200 ${
                i === currentIndex
                  ? 'ring-2 ring-neutral-900 ring-offset-2'
                  : 'opacity-50 hover:opacity-80'
              }`}
            >
              {a.imageUrl ? (
                <img
                  src={a.imageUrl}
                  alt={a.title}
                  className="h-14 w-14 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center bg-neutral-100">
                  <svg className="h-4 w-4 text-neutral-300" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EDITORIAL Template Layout
// ---------------------------------------------------------------------------

function EditorialLayout({ artworks }: { artworks: PublicArtwork[] }) {
  if (artworks.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm font-light text-neutral-400">
          No artworks in this viewing room yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-32 md:space-y-48">
      {artworks.map((artwork, index) => (
        <EditorialArtwork key={artwork.id} artwork={artwork} index={index} />
      ))}
    </div>
  );
}

function EditorialArtwork({
  artwork,
  index,
}: {
  artwork: PublicArtwork;
  index: number;
}) {
  const { dimensions, edition, mediumYear } = useArtworkMeta(artwork);
  const isEven = index % 2 === 0;

  return (
    <div className={`flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-16 ${
      isEven ? '' : 'lg:flex-row-reverse'
    }`}>
      {/* Image — large, generous space */}
      <div className="flex-1 lg:flex-[2]">
        {artwork.imageUrl ? (
          <img
            src={artwork.imageUrl}
            alt={artwork.title}
            loading="lazy"
            className="w-full object-contain"
          />
        ) : (
          <ArtworkPlaceholder />
        )}
      </div>

      {/* Text — editorial style with generous typography */}
      <div className={`flex-1 lg:flex-[1] lg:sticky lg:top-20 ${
        isEven ? 'lg:text-left' : 'lg:text-right'
      }`}>
        <div className="space-y-4">
          {/* Index number — editorial touch */}
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-300">
            {String(index + 1).padStart(2, '0')}
          </p>

          <h2 className="font-display text-2xl font-light text-neutral-900 md:text-3xl leading-tight">
            {artwork.title}
          </h2>

          <div className="h-px w-12 bg-neutral-200" />

          {mediumYear && (
            <p className="text-sm font-light leading-relaxed text-neutral-600">
              {mediumYear}
            </p>
          )}

          {dimensions && (
            <p className="text-sm font-light text-neutral-400">
              {dimensions}
            </p>
          )}

          {edition && (
            <p className="text-xs font-light uppercase tracking-wider text-neutral-400">
              {edition}
            </p>
          )}

          {/* Artist attribution */}
          <p className="pt-4 text-[10px] font-light uppercase tracking-[0.2em] text-neutral-300">
            {ARTIST_NAME}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Password Gate (with rate limiting)
// ---------------------------------------------------------------------------

function PasswordGate({
  onUnlock,
}: {
  onUnlock: (password: string) => Promise<boolean>;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting check
    const now = Date.now();
    if (lockedUntil && now < lockedUntil) {
      const remainingSec = Math.ceil((lockedUntil - now) / 1000);
      setError(`Too many attempts. Try again in ${remainingSec}s`);
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const success = await onUnlock(password);
      if (!success) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= 5) {
          setLockedUntil(now + 60_000); // Lock for 60 seconds
          setAttempts(0);
          setError('Too many attempts. Locked for 60 seconds');
        } else {
          setError('Incorrect password. Please try again.');
        }
        setPassword('');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#c9a96e]">
          {COMPANY_NAME}
        </p>

        <div className="mt-10">
          <svg
            className="mx-auto h-8 w-8 text-neutral-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          <p className="mt-4 text-sm font-light text-neutral-600">
            This viewing room is protected
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            disabled={checking}
            className="w-full border-b border-neutral-200 bg-transparent px-1 py-2 text-center text-sm text-neutral-900 placeholder:text-neutral-300 transition-colors focus:border-neutral-900 focus:outline-none disabled:opacity-50"
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-500">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!password || checking}
            className="w-full rounded-none bg-neutral-900 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {checking ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ViewingRoomPublicPageProps {
  slug: string;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ViewingRoomPublicPage({ slug }: ViewingRoomPublicPageProps) {
  const { room, artworks, loading, error, checkPassword } =
    usePublicViewingRoom(slug);
  const [unlocked, setUnlocked] = useState(false);

  // Log a view via rate-limited RPC (fire-and-forget)
  useEffect(() => {
    if (room?.id) {
      supabase.rpc('record_viewing_room_view', {
        p_viewing_room_id: room.id,
        p_viewer_ip: null,
      });
    }
  }, [room?.id]);

  // ---- Loading state --------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ---- Error / Not found state ----------------------------------------------

  if (error || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#c9a96e]">
            {COMPANY_NAME}
          </p>
          <h1 className="mt-8 text-lg font-light text-neutral-800">
            This viewing room is not available
          </h1>
          <p className="mt-2 text-sm font-light text-neutral-400">
            It may have been removed or is not currently published.
          </p>
        </div>
      </div>
    );
  }

  // ---- Password gate --------------------------------------------------------

  if (room.visibility === 'password' && room.password_hash && !unlocked) {
    return (
      <PasswordGate
        onUnlock={async (pw) => {
          const valid = await checkPassword(pw);
          if (valid) setUnlocked(true);
          return valid;
        }}
      />
    );
  }

  // ---- Determine template ---------------------------------------------------

  const template: ViewingRoomTemplate = room.template || 'grid';

  // ---- Visible room ---------------------------------------------------------

  return (
    <div className="min-h-screen bg-white">
      {/* Header — generous spacing, minimal typography */}
      <header className={`mx-auto px-6 pt-12 pb-10 md:px-12 md:pt-20 md:pb-16 ${
        template === 'carousel' ? 'max-w-5xl text-center' : 'max-w-6xl'
      }`}>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#c9a96e]">
          {COMPANY_NAME}
        </p>
        <h1 className="mt-6 font-display text-3xl font-light text-neutral-900 md:text-4xl lg:text-5xl">
          {room.title}
        </h1>
        {room.description && (
          <p className={`mt-4 text-sm font-light leading-relaxed text-neutral-500 md:text-base ${
            template === 'carousel' ? 'mx-auto max-w-2xl' : 'max-w-2xl'
          }`}>
            {room.description}
          </p>
        )}
        <p className="mt-5 text-[11px] font-light uppercase tracking-widest text-neutral-400">
          {ARTIST_NAME}
        </p>

        {/* Subtle divider */}
        <div className={`mt-10 h-px w-16 bg-neutral-200 ${
          template === 'carousel' ? 'mx-auto' : ''
        }`} />
      </header>

      {/* Artworks — template-specific layout */}
      <main className={`mx-auto px-6 pb-20 md:px-12 md:pb-32 ${
        template === 'carousel' ? 'max-w-7xl' : 'max-w-6xl'
      }`}>
        {template === 'carousel' ? (
          <CarouselLayout artworks={artworks} />
        ) : template === 'editorial' ? (
          <EditorialLayout artworks={artworks} />
        ) : (
          <GridLayout artworks={artworks} />
        )}
      </main>

      {/* Footer — ultra-minimal */}
      <footer className="border-t border-neutral-100">
        <div className="mx-auto max-w-6xl px-6 py-10 md:px-12">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-[#c9a96e]">
              {COMPANY_NAME}
            </p>
            <p className="text-[10px] font-light text-neutral-400">
              {ARTIST_NAME}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
