// ---------------------------------------------------------------------------
// NOA Inventory -- Public Viewing Room Page
// Standalone public page (no auth, no AppLayout) that renders a viewing room
// for a given slug.
// ---------------------------------------------------------------------------

import { useParams } from 'react-router-dom';
import { ViewingRoomPublicPage } from '../components/viewing-rooms/ViewingRoomPublicPage';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ViewingRoomPage() {
  const { slug } = useParams<{ slug: string }>();

  // ---- Invalid / missing slug ---------------------------------------------

  if (!slug) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <div className="w-full max-w-md text-center">
          {/* Brand */}
          <div className="mb-10">
            <h1 className="font-display text-5xl font-bold text-primary-900">NOA</h1>
            <p className="mt-1 text-xs font-medium tracking-[0.3em] text-primary-400">
              INVENTORY
            </p>
          </div>

          {/* Error */}
          <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-8">
            <svg
              className="mx-auto h-10 w-10 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <h2 className="mt-4 font-display text-lg font-semibold text-primary-900">
              Invalid viewing room
            </h2>
            <p className="mt-2 text-sm text-primary-500">
              This viewing room link is not valid. Please check the URL and try
              again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Valid slug -- render public viewing room -----------------------------

  return <ViewingRoomPublicPage slug={slug} />;
}
