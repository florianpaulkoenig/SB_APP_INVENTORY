import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeliveries } from '../hooks/useDeliveries';
import { useDocumentNumber } from '../hooks/useDocumentNumber';
import { DeliveryForm } from '../components/deliveries/DeliveryForm';
import type { InlineDeliveryItem } from '../components/deliveries/DeliveryForm';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import type { DeliveryInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DeliveryCreatePage() {
  const navigate = useNavigate();
  const { createDelivery } = useDeliveries();
  const { generateNumber } = useDocumentNumber();

  const [loading, setLoading] = useState(false);
  const [deliveryNumber, setDeliveryNumber] = useState('');

  // ---- Auto-generate delivery number on mount -----------------------------

  useEffect(() => {
    async function generate() {
      const num = await generateNumber('DEL');
      if (num) {
        setDeliveryNumber(num);
      }
    }

    generate();
  }, [generateNumber]);

  // ---- Submit handler -----------------------------------------------------

  async function handleSubmit(data: DeliveryInsert, items?: InlineDeliveryItem[]) {
    setLoading(true);

    const created = await createDelivery({
      ...data,
      delivery_number: deliveryNumber || data.delivery_number,
    });

    if (created) {
      // Add inline items if any were provided
      if (items && items.length > 0) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.artwork_id) continue;

            await supabase.from('delivery_items').insert({
              delivery_id: created.id,
              user_id: session.user.id,
              artwork_id: item.artwork_id,
              sort_order: i,
              notes: item.notes.trim() || null,
            });
          }
        }
      }

      setLoading(false);
      navigate(`/deliveries/${created.id}`);
    } else {
      setLoading(false);
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
          onClick={() => navigate('/deliveries')}
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
          Back to Deliveries
        </Button>

        <h1 className="font-display text-2xl font-bold text-primary-900">
          New Delivery
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Create a new delivery for artwork shipments.
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl rounded-lg border border-primary-100 bg-white p-6">
        <DeliveryForm
          deliveryNumber={deliveryNumber}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/deliveries')}
          loading={loading}
        />
      </div>
    </div>
  );
}
