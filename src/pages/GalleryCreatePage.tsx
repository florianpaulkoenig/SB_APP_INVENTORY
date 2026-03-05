import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGalleries } from '../hooks/useGalleries';
import { GalleryForm } from '../components/galleries/GalleryForm';
import { Button } from '../components/ui/Button';
import type { GalleryInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleryCreatePage() {
  const navigate = useNavigate();
  const { createGallery } = useGalleries();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: GalleryInsert) {
    setLoading(true);
    const created = await createGallery(data);
    setLoading(false);

    if (created) {
      navigate(`/galleries/${created.id}`);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/galleries')}
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
          Back to Galleries
        </Button>

        <h1 className="font-display text-2xl font-bold text-primary-900">
          New Gallery
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Add a new gallery or consignment partner.
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl rounded-lg border border-primary-100 bg-white p-6">
        <GalleryForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/galleries')}
          loading={loading}
        />
      </div>
    </div>
  );
}
