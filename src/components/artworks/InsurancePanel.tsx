import { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { useInsuranceRecords } from '../../hooks/useInsuranceRecords';
import { CURRENCIES } from '../../lib/constants';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { Currency, InsuranceRecordRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InsurancePanelProps {
  artworkId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInsuranceStatus(
  record: InsuranceRecordRow,
): 'active' | 'expired' | 'unknown' {
  if (!record.valid_from || !record.valid_to) return 'unknown';
  const today = new Date().toISOString().slice(0, 10);
  if (record.valid_to < today) return 'expired';
  if (record.valid_from <= today && record.valid_to >= today) return 'active';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InsurancePanel({ artworkId }: InsurancePanelProps) {
  const { records, loading, createRecord, updateRecord, deleteRecord } =
    useInsuranceRecords(artworkId);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<InsuranceRecordRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [insuredValue, setInsuredValue] = useState('');
  const [currency, setCurrency] = useState<string>('EUR');
  const [insurer, setInsurer] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [notes, setNotes] = useState('');

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // -- Handlers -------------------------------------------------------------

  function resetForm() {
    setInsuredValue('');
    setCurrency('EUR');
    setInsurer('');
    setPolicyNumber('');
    setValidFrom('');
    setValidTo('');
    setNotes('');
    setEditingRecord(null);
  }

  function openForEdit(record: InsuranceRecordRow) {
    setEditingRecord(record);
    setInsuredValue(String(record.insured_value));
    setCurrency(record.currency);
    setInsurer(record.insurer ?? '');
    setPolicyNumber(record.policy_number ?? '');
    setValidFrom(record.valid_from ?? '');
    setValidTo(record.valid_to ?? '');
    setNotes(record.notes ?? '');
    setModalOpen(true);
  }

  function openForCreate() {
    resetForm();
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        artwork_id: artworkId,
        insured_value: parseFloat(insuredValue),
        currency: currency as Currency,
        insurer: insurer || null,
        policy_number: policyNumber || null,
        valid_from: validFrom || null,
        valid_to: validTo || null,
        notes: notes || null,
      };

      if (editingRecord) {
        await updateRecord(editingRecord.id, payload);
      } else {
        await createRecord(payload);
      }
      resetForm();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteRecord(deleteId);
    setDeleteId(null);
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

  // -- Render ---------------------------------------------------------------

  return (
    <section className="rounded-lg border border-primary-100 bg-white p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-primary-900">
          Insurance
        </h2>
        <Button size="sm" onClick={openForCreate}>
          Add Insurance
        </Button>
      </div>

      {/* Content */}
      {records.length === 0 ? (
        <EmptyState
          title="No insurance records"
          description="Add insurance information to protect this artwork."
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
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
          }
        />
      ) : (
        <div className="space-y-4">
          {records.map((record) => {
            const status = getInsuranceStatus(record);

            return (
              <div
                key={record.id}
                className="rounded-lg border border-primary-100 p-4"
              >
                {/* Value + Status */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold text-primary-900">
                      {formatCurrency(record.insured_value, record.currency)}
                    </p>
                    {record.insurer && (
                      <p className="mt-0.5 text-sm text-primary-600">
                        {record.insurer}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {status === 'active' && (
                      <Badge variant="success">ACTIVE</Badge>
                    )}
                    {status === 'expired' && (
                      <Badge variant="danger">EXPIRED</Badge>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="mt-3 space-y-1 text-sm text-primary-500">
                  {record.policy_number && (
                    <p>
                      Policy:{' '}
                      <span className="text-primary-700">
                        {record.policy_number}
                      </span>
                    </p>
                  )}
                  {(record.valid_from || record.valid_to) && (
                    <p>
                      Validity:{' '}
                      <span className="text-primary-700">
                        {record.valid_from
                          ? formatDate(record.valid_from)
                          : '...'}{' '}
                        &ndash;{' '}
                        {record.valid_to
                          ? formatDate(record.valid_to)
                          : '...'}
                      </span>
                    </p>
                  )}
                  {record.notes && <p className="text-primary-400">{record.notes}</p>}
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => openForEdit(record)}
                    className="text-xs text-primary-500 hover:text-primary-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(record.id)}
                    className="text-xs text-primary-400 hover:text-danger transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editingRecord ? 'Edit Insurance Record' : 'Add Insurance Record'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Insured Value"
              type="number"
              min="0"
              step="0.01"
              value={insuredValue}
              onChange={(e) => setInsuredValue(e.target.value)}
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
            label="Insurer"
            value={insurer}
            onChange={(e) => setInsurer(e.target.value)}
            placeholder="Insurance company name"
          />

          <Input
            label="Policy Number"
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            placeholder="e.g., POL-2024-12345"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Valid From"
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
            <Input
              label="Valid To"
              type="date"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
            />
          </div>

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Coverage details, deductibles, etc."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingRecord ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Insurance Record"
        message="Are you sure you want to delete this insurance record? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </section>
  );
}
