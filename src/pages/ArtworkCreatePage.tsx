import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArtworks } from '../hooks/useArtworks';
import { useDocumentNumber } from '../hooks/useDocumentNumber';
import { ArtworkForm } from '../components/artworks/ArtworkForm';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { generateArtworkRefCode } from '../lib/utils';
import { DOC_PREFIXES } from '../lib/constants';
import type { ArtworkInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ArtworkCreatePage() {
  const navigate = useNavigate();
  const { createArtwork } = useArtworks();
  const { generateNumber } = useDocumentNumber();

  const [loading, setLoading] = useState(false);
  const [inventoryNumber, setInventoryNumber] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // ---- Auto-generate inventory number & reference code on mount -----------

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const [invNumber, refCode] = await Promise.all([
        generateNumber(DOC_PREFIXES.artwork),
        Promise.resolve(generateArtworkRefCode()),
      ]);

      if (!cancelled) {
        setInventoryNumber(invNumber);
        setReferenceCode(refCode);
        setInitializing(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [generateNumber]);

  // ---- Submit handler -----------------------------------------------------

  async function handleSubmit(data: ArtworkInsert) {
    setLoading(true);
    const created = await createArtwork({
      ...data,
      inventory_number: inventoryNumber ?? data.inventory_number,
      reference_code: referenceCode ?? data.reference_code,
    });
    setLoading(false);

    if (created) {
      navigate(`/artworks/${created.id}`);
    }
  }

  // ---- Loading state while generating IDs ---------------------------------

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
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
          onClick={() => navigate('/artworks')}
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
          Back to Artworks
        </Button>

        <h1 className="font-display text-2xl font-bold text-primary-900">
          New Artwork
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Add a new artwork to your inventory.
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl rounded-lg border border-primary-100 bg-white p-6">
        <ArtworkForm
          inventoryNumber={inventoryNumber ?? undefined}
          referenceCode={referenceCode ?? undefined}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/artworks')}
          loading={loading}
        />
      </div>
    </div>
  );
}
