import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useArtwork, useArtworks } from '../hooks/useArtworks';
import { ArtworkForm } from '../components/artworks/ArtworkForm';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { ArtworkInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ArtworkEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { artwork, loading: fetchLoading } = useArtwork(id!);
  const { updateArtwork } = useArtworks();

  const [saving, setSaving] = useState(false);

  // ---- Submit handler -----------------------------------------------------

  async function handleSubmit(data: ArtworkInsert) {
    if (!id) return;

    setSaving(true);
    const updated = await updateArtwork(id, data);
    setSaving(false);

    if (updated) {
      navigate(`/artworks/${id}`);
    }
  }

  // ---- Loading state ------------------------------------------------------

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ---- Not found state ----------------------------------------------------

  if (!artwork) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="font-display text-xl font-semibold text-primary-900">
          Artwork not found
        </h2>
        <p className="mt-2 text-sm text-primary-500">
          The artwork you are looking for does not exist.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/artworks')}
          className="mt-6"
        >
          Back to Artworks
        </Button>
      </div>
    );
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/artworks/${id}`)}
          className="mb-4"
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
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to Artwork
        </Button>

        <h1 className="font-display text-2xl font-bold text-primary-900">
          Edit Artwork
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Update artwork information for &ldquo;{artwork.title}&rdquo;.
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl rounded-lg border border-primary-100 bg-white p-6">
        <ArtworkForm
          artwork={artwork}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/artworks/${id}`)}
          loading={saving}
        />
      </div>
    </div>
  );
}
