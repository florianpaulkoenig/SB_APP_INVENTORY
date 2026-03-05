// ---------------------------------------------------------------------------
// NOA Inventory -- Viewing Room Public Page
// Public-facing gallery-style viewing room. No auth required.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { usePublicViewingRoom } from '../../hooks/useViewingRooms';
import { COMPANY_NAME, ARTIST_NAME } from '../../lib/constants';
import { formatDimensions } from '../../lib/utils';
import type { PublicArtwork } from '../../hooks/useViewingRooms';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ViewingRoomPublicPageProps {
  slug: string;
}

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
// Artwork Card (internal)
// ---------------------------------------------------------------------------

function ArtworkCard({ artwork }: { artwork: PublicArtwork }) {
  const dimensions = formatDimensions(
    artwork.height,
    artwork.width,
    artwork.depth,
    artwork.dimension_unit,
  );
  const edition = formatEdition(artwork);

  return (
    <div className="group">
      {/* Image */}
      <div className="aspect-[4/5] w-full overflow-hidden rounded-sm bg-primary-100">
        {artwork.imageUrl ? (
          <img
            src={artwork.imageUrl}
            alt={artwork.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              className="h-12 w-12 text-primary-200"
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
      </div>

      {/* Info */}
      <div className="mt-4 space-y-1">
        <h3 className="font-display text-sm font-semibold text-primary-900">
          {artwork.title}
        </h3>
        {artwork.medium && (
          <p className="text-xs text-primary-500">
            {artwork.medium}
            {artwork.year ? `, ${artwork.year}` : ''}
          </p>
        )}
        {!artwork.medium && artwork.year && (
          <p className="text-xs text-primary-500">{artwork.year}</p>
        )}
        {dimensions && (
          <p className="text-xs text-primary-400">{dimensions}</p>
        )}
        {edition && (
          <p className="text-xs text-primary-400">{edition}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Password Gate (internal)
// ---------------------------------------------------------------------------

function PasswordGate({ onUnlock }: { onUnlock: (password: string) => boolean }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onUnlock(password);
    if (!success) {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm text-center">
        {/* Branding */}
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#c9a96e]">
          {COMPANY_NAME}
        </p>

        <div className="mt-8">
          <svg
            className="mx-auto h-10 w-10 text-primary-300"
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
          <h2 className="mt-4 font-display text-lg font-semibold text-primary-900">
            This viewing room is protected
          </h2>
          <p className="mt-2 text-sm text-primary-500">
            Please enter the password to view the artworks.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            className="w-full rounded-md border border-primary-200 bg-white px-4 py-2.5 text-sm text-primary-900 placeholder:text-primary-400 transition-colors focus:border-[#c9a96e] focus:ring-1 focus:ring-[#c9a96e] focus:outline-none"
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-600">
              Incorrect password. Please try again.
            </p>
          )}
          <button
            type="submit"
            disabled={!password}
            className="w-full rounded-md bg-primary-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ViewingRoomPublicPage({ slug }: ViewingRoomPublicPageProps) {
  const { room, artworks, loading, error, checkPassword } = usePublicViewingRoom(slug);
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
          <h1 className="mt-6 font-display text-xl font-semibold text-primary-900">
            This viewing room is not available
          </h1>
          <p className="mt-2 text-sm text-primary-500">
            The viewing room you are looking for may have been removed or is not
            currently published.
          </p>
        </div>
      </div>
    );
  }

  // ---- Password gate --------------------------------------------------------

  if (room.visibility === 'password' && room.password_hash && !unlocked) {
    return (
      <PasswordGate
        onUnlock={(pw) => {
          const valid = checkPassword(pw);
          if (valid) setUnlocked(true);
          return valid;
        }}
      />
    );
  }

  // ---- Visible room ---------------------------------------------------------

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-primary-100">
        <div className="mx-auto max-w-6xl px-6 py-8 md:py-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#c9a96e]">
            {COMPANY_NAME}
          </p>
          <h1 className="mt-4 font-display text-2xl font-semibold text-primary-900 md:text-3xl lg:text-4xl">
            {room.title}
          </h1>
          {room.description && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-primary-500 md:text-base">
              {room.description}
            </p>
          )}
          <p className="mt-4 text-xs text-primary-400">
            {ARTIST_NAME}
          </p>
        </div>
      </header>

      {/* Artwork grid */}
      <main className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        {artworks.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-primary-400">
              No artworks in this viewing room yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {artworks.map((artwork) => (
              <ArtworkCard key={artwork.id} artwork={artwork} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-primary-100">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#c9a96e]">
              {COMPANY_NAME}
            </p>
            <p className="text-xs text-primary-400">
              {ARTIST_NAME}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
