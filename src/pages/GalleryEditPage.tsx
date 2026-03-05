import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGalleries } from '../hooks/useGalleries';
import { GalleryForm } from '../components/galleries/GalleryForm';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { GalleryRow, GalleryInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleryEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateGallery } = useGalleries();

  const [gallery, setGallery] = useState<GalleryRow | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // ---- Fetch gallery ------------------------------------------------------

  useEffect(() => {
    async function fetchGallery() {
      if (!id) return;

      setFetchLoading(true);
      const { data, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setGallery(data as GalleryRow);
      }

      setFetchLoading(false);
    }

    fetchGallery();
  }, [id]);

  // ---- Submit handler -----------------------------------------------------

  async function handleSubmit(data: GalleryInsert) {
    if (!id) return;

    setSaving(true);
    const updated = await updateGallery(id, data);
    setSaving(false);

    if (updated) {
      navigate(`/galleries/${id}`);
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

  if (notFound || !gallery) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="font-display text-xl font-semibold text-primary-900">
          Gallery not found
        </h2>
        <p className="mt-2 text-sm text-primary-500">
          The gallery you are looking for does not exist.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/galleries')}
          className="mt-6"
        >
          Back to Galleries
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
          onClick={() => navigate(`/galleries/${id}`)}
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
          Back to Gallery
        </Button>

        <h1 className="font-display text-2xl font-bold text-primary-900">
          Edit Gallery
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Update gallery information for "{gallery.name}".
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl rounded-lg border border-primary-100 bg-white p-6">
        <GalleryForm
          gallery={gallery}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/galleries/${id}`)}
          loading={saving}
        />
      </div>
    </div>
  );
}
