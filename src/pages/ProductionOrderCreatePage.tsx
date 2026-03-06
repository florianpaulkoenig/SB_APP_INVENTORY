import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductionOrders } from '../hooks/useProductionOrders';
import { ProductionOrderForm } from '../components/production/ProductionOrderForm';
import { Button } from '../components/ui/Button';
import type { ProductionOrderInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ProductionOrderCreatePage() {
  const navigate = useNavigate();
  const { createProductionOrder } = useProductionOrders();

  const [loading, setLoading] = useState(false);

  // ---- Submit handler -----------------------------------------------------

  async function handleSubmit(data: ProductionOrderInsert) {
    setLoading(true);

    const created = await createProductionOrder(data);

    setLoading(false);

    if (created) {
      navigate(`/production/${created.id}`);
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
          onClick={() => navigate('/production')}
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
          Back to Production Orders
        </Button>

        <h1 className="font-display text-2xl font-bold text-primary-900">
          New Production Order
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Create a new production order to track manufacturing.
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-3xl rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
        <ProductionOrderForm
          onSubmit={handleSubmit}
          loading={loading}
        />
      </div>
    </div>
  );
}
