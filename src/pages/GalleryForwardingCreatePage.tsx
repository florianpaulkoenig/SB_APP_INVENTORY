import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGalleryForwardings } from '../hooks/useGalleryForwarding';
import { GalleryForwardingForm } from '../components/gallery-forwarding/GalleryForwardingForm';
import { Button } from '../components/ui/Button';
import type { GalleryForwardingOrderInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleryForwardingCreatePage() {
  const navigate = useNavigate();
  const { createForwarding } = useGalleryForwardings();

  const [loading, setLoading] = useState(false);

  // ---- Submit handler -----------------------------------------------------

  async function handleSubmit(data: GalleryForwardingOrderInsert) {
    setLoading(true);

    const created = await createForwarding(data);

    setLoading(false);

    if (created) {
      navigate(`/forwarding/${created.id}`);
    }
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/forwarding')}
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
          Back to Forwarding Orders
        </Button>

        <h1 className="font-display text-2xl font-bold text-primary-900">
          New Forwarding Order
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Create a new forwarding order to track artwork transfers between galleries.
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl rounded-lg border border-primary-100 bg-white p-6">
        <GalleryForwardingForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/forwarding')}
          loading={loading}
        />
      </div>
    </div>
  );
}
