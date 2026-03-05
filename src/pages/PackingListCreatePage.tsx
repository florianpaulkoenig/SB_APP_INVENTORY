import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePackingLists } from '../hooks/usePackingLists';
import { useDocumentNumber } from '../hooks/useDocumentNumber';
import { PackingListForm } from '../components/packing/PackingListForm';
import { Button } from '../components/ui/Button';
import type { PackingListInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PackingListCreatePage() {
  const navigate = useNavigate();
  const { createPackingList } = usePackingLists();
  const { generateNumber } = useDocumentNumber();

  const [loading, setLoading] = useState(false);
  const [packingNumber, setPackingNumber] = useState('');

  // ---- Auto-generate packing number on mount ------------------------------

  useEffect(() => {
    async function generate() {
      const num = await generateNumber('PL');
      if (num) {
        setPackingNumber(num);
      }
    }

    generate();
  }, [generateNumber]);

  // ---- Submit handler -----------------------------------------------------

  async function handleSubmit(data: PackingListInsert) {
    setLoading(true);

    const created = await createPackingList({
      ...data,
      packing_number: packingNumber || data.packing_number,
    });

    setLoading(false);

    if (created) {
      navigate(`/packing-lists/${created.id}`);
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
          onClick={() => navigate('/packing-lists')}
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
          Back to Packing Lists
        </Button>

        <h1 className="font-display text-2xl font-bold text-primary-900">
          New Packing List
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Create a new packing list for artwork shipments.
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl rounded-lg border border-primary-100 bg-white p-6">
        <PackingListForm
          packingNumber={packingNumber}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/packing-lists')}
          loading={loading}
        />
      </div>
    </div>
  );
}
