import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGalleries } from '../hooks/useGalleries';
import { GalleryDetail } from '../components/galleries/GalleryDetail';
import { TaskList } from '../components/crm/TaskList';
import { Button } from '../components/ui/Button';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { GalleryRow } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteGallery } = useGalleries();

  const [gallery, setGallery] = useState<GalleryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ---- Fetch gallery ------------------------------------------------------

  useEffect(() => {
    async function fetchGallery() {
      if (!id) return;

      setLoading(true);
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

      setLoading(false);
    }

    fetchGallery();
  }, [id]);

  // ---- Delete handler -----------------------------------------------------

  async function handleDelete() {
    if (!id) return;

    const success = await deleteGallery(id);
    if (success) {
      navigate('/galleries');
    }
  }

  // ---- Loading state ------------------------------------------------------

  if (loading) {
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
          The gallery you are looking for does not exist or has been deleted.
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
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Galleries', href: '/galleries' },
          { label: gallery.name },
        ]}
        className="mb-4"
      />

      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/galleries')}
        className="mb-6"
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
        Back to Galleries
      </Button>

      {/* Gallery detail */}
      <GalleryDetail
        gallery={gallery}
        onEdit={() => navigate(`/galleries/${id}/edit`)}
        onDelete={handleDelete}
      />

      {/* Related Tasks */}
      <div className="mt-6 rounded-lg border border-primary-100 bg-white p-6">
        <TaskList galleryId={id} compact />
      </div>
    </div>
  );
}
