import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeals } from '../hooks/useDeals';
import { DealPipeline } from '../components/crm/DealPipeline';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { DEAL_STAGES, CURRENCIES } from '../lib/constants';
import type { DealInsert, DealRow } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DealsPage() {
  const navigate = useNavigate();
  const { deals, loading, createDeal, updateDeal } = useDeals();

  // ---- Modal state --------------------------------------------------------

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // ---- Form state ---------------------------------------------------------

  const [contactId, setContactId] = useState('');
  const [artworkId, setArtworkId] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [stage, setStage] = useState('lead');
  const [notes, setNotes] = useState('');

  // ---- Handlers -----------------------------------------------------------

  function resetForm() {
    setContactId('');
    setArtworkId('');
    setValue('');
    setCurrency('EUR');
    setStage('lead');
    setNotes('');
  }

  async function handleCreateDeal(e: FormEvent) {
    e.preventDefault();

    if (!contactId.trim()) return;

    setSaving(true);

    const data: DealInsert = {
      contact_id: contactId.trim(),
      artwork_id: artworkId.trim() || null,
      value: value ? parseFloat(value) : null,
      currency: value ? (currency as DealInsert['currency']) : null,
      stage: stage as DealInsert['stage'],
      notes: notes.trim() || null,
    };

    const created = await createDeal(data);
    setSaving(false);

    if (created) {
      resetForm();
      setShowModal(false);
    }
  }

  function handleDealClick(deal: DealRow) {
    if (deal.contact_id) {
      navigate(`/contacts/${deal.contact_id}`);
    }
  }

  async function handleStageChange(dealId: string, newStage: string) {
    await updateDeal(dealId, { stage: newStage as DealInsert['stage'] });
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Deal Pipeline
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Track opportunities through the sales pipeline.
          </p>
        </div>

        <Button onClick={() => setShowModal(true)}>
          New Deal
        </Button>
      </div>

      {/* Pipeline */}
      <DealPipeline
        deals={deals}
        onDealClick={handleDealClick}
        onStageChange={handleStageChange}
        loading={loading}
      />

      {/* New Deal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              resetForm();
              setShowModal(false);
            }}
          />

          {/* Modal content */}
          <div className="relative z-10 mx-4 w-full max-w-lg rounded-lg border border-primary-100 bg-white p-6 shadow-xl">
            <h2 className="mb-6 font-display text-lg font-semibold text-primary-900">
              New Deal
            </h2>

            <form onSubmit={handleCreateDeal} className="space-y-4">
              <Input
                label="Contact ID *"
                placeholder="Contact UUID"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              />

              <Input
                label="Artwork ID"
                placeholder="Artwork UUID (optional)"
                value={artworkId}
                onChange={(e) => setArtworkId(e.target.value)}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Value"
                  type="number"
                  placeholder="0.00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
                <Select
                  label="Currency"
                  options={[...CURRENCIES]}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </div>

              <Select
                label="Stage"
                options={DEAL_STAGES.map((s) => ({ value: s.value, label: s.label }))}
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              />

              <Textarea
                label="Notes"
                placeholder="Any additional information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-primary-100 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  Create Deal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
