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
import { useLoans } from '../../hooks/useLoans';
import { LOAN_STATUSES } from '../../lib/constants';
import { formatDate } from '../../lib/utils';
import type { LoanStatus, LoanRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LoanPanelProps {
  artworkId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isOverdue(loan: LoanRow): boolean {
  if (loan.status !== 'active') return false;
  if (!loan.loan_end) return false;
  return loan.loan_end < new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LoanPanel({ artworkId }: LoanPanelProps) {
  const { loans, loading, createLoan, updateLoan, deleteLoan } =
    useLoans(artworkId);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [borrower, setBorrower] = useState('');
  const [loanStart, setLoanStart] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [loanEnd, setLoanEnd] = useState('');
  const [status, setStatus] = useState<string>('pending');
  const [insuranceRequired, setInsuranceRequired] = useState(false);
  const [returnDate, setReturnDate] = useState('');
  const [terms, setTerms] = useState('');
  const [notes, setNotes] = useState('');

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // -- Handlers -------------------------------------------------------------

  function resetForm() {
    setBorrower('');
    setLoanStart(new Date().toISOString().slice(0, 10));
    setLoanEnd('');
    setStatus('pending');
    setInsuranceRequired(false);
    setReturnDate('');
    setTerms('');
    setNotes('');
    setEditingLoan(null);
  }

  function openForEdit(loan: LoanRow) {
    setEditingLoan(loan);
    setBorrower(loan.borrower);
    setLoanStart(loan.loan_start);
    setLoanEnd(loan.loan_end ?? '');
    setStatus(loan.status);
    setInsuranceRequired(loan.insurance_required);
    setReturnDate(loan.return_date ?? '');
    setTerms(loan.terms ?? '');
    setNotes(loan.notes ?? '');
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
        borrower,
        loan_start: loanStart,
        loan_end: loanEnd || null,
        status: status as LoanStatus,
        insurance_required: insuranceRequired,
        return_date: returnDate || null,
        terms: terms || null,
        notes: notes || null,
      };

      if (editingLoan) {
        await updateLoan(editingLoan.id, payload);
      } else {
        await createLoan(payload);
      }
      resetForm();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteLoan(deleteId);
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
          Loans
        </h2>
        <Button size="sm" onClick={openForCreate}>
          Add Loan
        </Button>
      </div>

      {/* Content */}
      {loans.length === 0 ? (
        <EmptyState
          title="No loans recorded"
          description="Track loans and borrowing activity for this artwork."
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
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          }
        />
      ) : (
        <div className="space-y-4">
          {loans.map((loan) => {
            const overdue = isOverdue(loan);
            const statusMeta = LOAN_STATUSES.find(
              (s) => s.value === loan.status,
            );

            return (
              <div
                key={loan.id}
                className="rounded-lg border border-primary-100 p-4"
              >
                {/* Borrower + Status */}
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-primary-900">
                    {loan.borrower}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className={statusMeta?.color}>
                      {statusMeta?.label ?? loan.status}
                    </Badge>
                    {overdue && (
                      <Badge variant="danger">OVERDUE</Badge>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="mt-2 space-y-1 text-sm text-primary-500">
                  {/* Date range */}
                  <p>
                    {formatDate(loan.loan_start)}
                    {loan.loan_end && (
                      <> &ndash; {formatDate(loan.loan_end)}</>
                    )}
                  </p>

                  {/* Insurance required */}
                  {loan.insurance_required && (
                    <p className="flex items-center gap-1.5">
                      <svg
                        className="h-3.5 w-3.5 text-amber-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                        />
                      </svg>
                      <span className="text-xs text-amber-700">
                        Insurance required
                      </span>
                    </p>
                  )}

                  {/* Return date */}
                  {loan.return_date && (
                    <p className="text-xs">
                      Returned:{' '}
                      <span className="text-primary-700">
                        {formatDate(loan.return_date)}
                      </span>
                    </p>
                  )}

                  {/* Terms */}
                  {loan.terms && (
                    <p className="text-xs text-primary-400">
                      Terms: {loan.terms}
                    </p>
                  )}

                  {/* Notes */}
                  {loan.notes && (
                    <p className="text-xs text-primary-400">{loan.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => openForEdit(loan)}
                    className="text-xs text-primary-500 hover:text-primary-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(loan.id)}
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
        title={editingLoan ? 'Edit Loan' : 'Add Loan'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Borrower"
            value={borrower}
            onChange={(e) => setBorrower(e.target.value)}
            placeholder="Person or institution borrowing"
            required
            maxLength={256}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Loan Start"
              type="date"
              value={loanStart}
              onChange={(e) => setLoanStart(e.target.value)}
              required
            />
            <Input
              label="Loan End"
              type="date"
              value={loanEnd}
              onChange={(e) => setLoanEnd(e.target.value)}
            />
          </div>

          <Select
            label="Status"
            options={LOAN_STATUSES.map((s) => ({
              value: s.value,
              label: s.label,
            }))}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />

          {/* Insurance checkbox */}
          <div className="flex items-center gap-2">
            <input
              id="insurance-required"
              type="checkbox"
              checked={insuranceRequired}
              onChange={(e) => setInsuranceRequired(e.target.checked)}
              className="h-4 w-4 rounded border-primary-300 text-accent focus:ring-accent"
            />
            <label
              htmlFor="insurance-required"
              className="text-sm font-medium text-primary-700"
            >
              Insurance Required
            </label>
          </div>

          <Input
            label="Return Date"
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />

          <Textarea
            label="Terms"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Loan agreement terms..."
            maxLength={5000}
          />

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            maxLength={5000}
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
              {editingLoan ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Loan"
        message="Are you sure you want to delete this loan record? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </section>
  );
}
