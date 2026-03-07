// ---------------------------------------------------------------------------
// NOA Inventory -- Viewing Room Public Page
// Public-facing gallery-style viewing room. No auth required.
// Minimal, gallery-worthy design with generous whitespace.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { usePublicViewingRoom } from '../../hooks/useViewingRooms';
import { COMPANY_NAME, ARTIST_NAME } from '../../lib/constants';
import { formatDimensions } from '../../lib/utils';
import type { PublicArtwork } from '../../hooks/useViewingRooms';

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
// Artwork Card — minimal gallery style with hover overlay
// ---------------------------------------------------------------------------

function ArtworkCard({
  artwork,
  large,
}: {
  artwork: PublicArtwork;
  large?: boolean;
}) {
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

  // ---- Layout: single-column for ≤4 artworks, 2-column grid for more --------

  const useSingleColumn = artworks.length <= 4;

  // ---- Visible room ---------------------------------------------------------

  return (
    <div className="min-h-screen bg-white">
      {/* Header — generous spacing, minimal typography */}
      <header className="mx-auto max-w-6xl px-6 pt-12 pb-10 md:px-12 md:pt-20 md:pb-16">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#c9a96e]">
          {COMPANY_NAME}
        </p>
        <h1 className="mt-6 font-display text-3xl font-light text-neutral-900 md:text-4xl lg:text-5xl">
          {room.title}
        </h1>
        {room.description && (
          <p className="mt-4 max-w-2xl text-sm font-light leading-relaxed text-neutral-500 md:text-base">
            {room.description}
          </p>
        )}
        <p className="mt-5 text-[11px] font-light uppercase tracking-widest text-neutral-400">
          {ARTIST_NAME}
        </p>

        {/* Subtle divider */}
        <div className="mt-10 h-px w-16 bg-neutral-200" />
      </header>

      {/* Artworks */}
      <main className="mx-auto max-w-6xl px-6 pb-20 md:px-12 md:pb-32">
        {artworks.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm font-light text-neutral-400">
              No artworks in this viewing room yet.
            </p>
          </div>
        ) : useSingleColumn ? (
          /* Single-column: large images, centered, generous vertical spacing */
          <div className="space-y-20 md:space-y-28">
            {artworks.map((artwork) => (
              <ArtworkCard key={artwork.id} artwork={artwork} large />
            ))}
          </div>
        ) : (
          /* 2-column grid for larger collections */
          <div className="grid grid-cols-1 gap-x-10 gap-y-16 sm:grid-cols-2 md:gap-x-14 md:gap-y-20">
            {artworks.map((artwork) => (
              <ArtworkCard key={artwork.id} artwork={artwork} />
            ))}
          </div>
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
