import { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { useValuations } from '../../hooks/useValuations';
import { CURRENCIES } from '../../lib/constants';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { Currency } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ValuationHistoryProps {
  artworkId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ValuationHistory({ artworkId }: ValuationHistoryProps) {
  const { valuations, loading, createValuation, deleteValuation } =
    useValuations(artworkId);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState<string>('EUR');
  const [appraiser, setAppraiser] = useState('');
  const [valuationDate, setValuationDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState('');

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // -- Handlers -------------------------------------------------------------

  function resetForm() {
    setValue('');
    setCurrency('EUR');
    setAppraiser('');
    setValuationDate(new Date().toISOString().slice(0, 10));
    setNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createValuation({
        artwork_id: artworkId,
        value: parseFloat(value),
        currency: currency as Currency,
        appraiser: appraiser || null,
        valuation_date: valuationDate,
        notes: notes || null,
      });
      resetForm();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteValuation(deleteId);
    setDeleteId(null);
  }

  // -- Trend computation ----------------------------------------------------

  function getTrend(): 'up' | 'down' | null {
    if (valuations.length < 2) return null;
    // Valuations are assumed sorted by date descending (newest first)
    const latest = valuations[0].value;
    const previous = valuations[1].value;
    if (latest > previous) return 'up';
    if (latest < previous) return 'down';
    return null;
  }

  // -- Loading state --------------------------------------------------------

  if (loading) {
    return (
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </section>
    );
  }

  const trend = getTrend();

  // -- Render ---------------------------------------------------------------

  return (
    <section className="rounded-lg border border-primary-100 bg-white p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-base font-semibold text-primary-900">
            Valuation History
          </h2>
          {trend === 'up' && (
            <svg
              className="h-4 w-4 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
              />
            </svg>
          )}
          {trend === 'down' && (
            <svg
              className="h-4 w-4 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25"
              />
            </svg>
          )}
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          Add Valuation
        </Button>
      </div>

      {/* Content */}
      {valuations.length === 0 ? (
        <EmptyState
          title="No valuations recorded"
          description="Track how this artwork's value changes over time."
          icon={
            <svg
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
              />
            </svg>
          }
        />
      ) : (
        <ul className="divide-y divide-primary-100">
          {valuations.map((valuation, index) => {
            // Show per-item trend arrow (compare to next older entry)
            let itemTrend: 'up' | 'down' | null = null;
            if (index < valuations.length - 1) {
              const nextVal = valuations[index + 1].value;
              if (valuation.value > nextVal) itemTrend = 'up';
              else if (valuation.value < nextVal) itemTrend = 'down';
            }

            return (
              <li
                key={valuation.id}
                className="flex items-start justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="space-y-0.5">
                  {/* Date */}
                  <p className="text-xs font-medium text-primary-500">
                    {formatDate(valuation.valuation_date)}
                  </p>

                  {/* Value with trend */}
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-primary-900">
                      {formatCurrency(valuation.value, valuation.currency)}
                    </p>
                    {itemTrend === 'up' && (
                      <svg
                        className="h-3.5 w-3.5 text-emerald-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 19.5l15-15"
                        />
                      </svg>
                    )}
                    {itemTrend === 'down' && (
                      <svg
                        className="h-3.5 w-3.5 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 4.5l15 15"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Appraiser */}
                  {valuation.appraiser && (
                    <p className="text-xs text-primary-500">
                      by {valuation.appraiser}
                    </p>
                  )}

                  {/* Notes */}
                  {valuation.notes && (
                    <p className="text-xs text-primary-400">
                      {valuation.notes}
                    </p>
                  )}
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => setDeleteId(valuation.id)}
                  className="ml-4 shrink-0 text-xs text-primary-400 hover:text-danger transition-colors"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add Valuation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Valuation"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Value"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
            <Select
              label="Currency"
              options={CURRENCIES.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>

          <Input
            label="Appraiser"
            value={appraiser}
            onChange={(e) => setAppraiser(e.target.value)}
            placeholder="Name of the appraiser"
          />

          <Input
            label="Valuation Date"
            type="date"
            value={valuationDate}
            onChange={(e) => setValuationDate(e.target.value)}
            required
          />

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional context for this valuation..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Valuation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Valuation"
        message="Are you sure you want to delete this valuation? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </section>
  );
}
