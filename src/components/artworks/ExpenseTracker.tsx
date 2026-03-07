import { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { useExpenses } from '../../hooks/useExpenses';
import { EXPENSE_CATEGORIES, CURRENCIES } from '../../lib/constants';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { ExpenseCategory, Currency } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ExpenseTrackerProps {
  artworkId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalizeCategory(category: string): string {
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExpenseTracker({ artworkId }: ExpenseTrackerProps) {
  const { expenses, loading, totalAmount, createExpense, deleteExpense } =
    useExpenses(artworkId);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [category, setCategory] = useState<string>('other');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<string>('EUR');
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // -- Handlers -------------------------------------------------------------

  function resetForm() {
    setCategory('other');
    setAmount('');
    setCurrency('EUR');
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setVendor('');
    setNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createExpense({
        artwork_id: artworkId,
        category: category as ExpenseCategory,
        amount: parseFloat(amount),
        currency: currency as Currency,
        expense_date: expenseDate,
        vendor: vendor || null,
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
    await deleteExpense(deleteId);
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
        <div>
          <h2 className="font-display text-base font-semibold text-primary-900">
            Expenses
          </h2>
          {expenses.length > 0 && totalAmount !== undefined && (
            <p className="mt-0.5 text-xs text-primary-500">
              Total:{' '}
              <span className="font-semibold text-primary-700">
                {formatCurrency(totalAmount, 'EUR')}
              </span>
            </p>
          )}
        </div>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          Add Expense
        </Button>
      </div>

      {/* Content */}
      {expenses.length === 0 ? (
        <EmptyState
          title="No expenses tracked"
          description="Record framing, shipping, restoration, and other costs."
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary-100 text-left">
                <th className="pb-2 pr-4 text-xs font-medium text-primary-500">
                  Date
                </th>
                <th className="pb-2 pr-4 text-xs font-medium text-primary-500">
                  Category
                </th>
                <th className="pb-2 pr-4 text-xs font-medium text-primary-500">
                  Vendor
                </th>
                <th className="pb-2 pr-4 text-right text-xs font-medium text-primary-500">
                  Amount
                </th>
                <th className="pb-2 pr-4 text-xs font-medium text-primary-500">
                  Notes
                </th>
                <th className="pb-2 text-xs font-medium text-primary-500" />
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {expenses.map((expense) => (
                <tr key={expense.id} className="group">
                  <td className="py-2.5 pr-4 text-primary-600 whitespace-nowrap">
                    {formatDate(expense.expense_date)}
                  </td>
                  <td className="py-2.5 pr-4 text-primary-700 whitespace-nowrap">
                    {capitalizeCategory(expense.category)}
                  </td>
                  <td className="py-2.5 pr-4 text-primary-600 whitespace-nowrap">
                    {expense.vendor ?? '--'}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-medium text-primary-900 whitespace-nowrap">
                    {formatCurrency(expense.amount, expense.currency)}
                  </td>
                  <td className="py-2.5 pr-4 text-primary-400 max-w-[200px] truncate">
                    {expense.notes ?? ''}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setDeleteId(expense.id)}
                      className="text-xs text-primary-400 opacity-0 group-hover:opacity-100 hover:text-danger transition-all"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Total row */}
            {totalAmount !== undefined && (
              <tfoot>
                <tr className="border-t border-primary-200">
                  <td
                    colSpan={3}
                    className="pt-3 pr-4 text-right text-xs font-medium text-primary-500"
                  >
                    Total
                  </td>
                  <td className="pt-3 pr-4 text-right font-semibold text-primary-900">
                    {formatCurrency(totalAmount, 'EUR')}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Expense"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Category"
            options={EXPENSE_CATEGORIES.map((c) => ({
              value: c.value,
              label: c.label,
            }))}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
            label="Date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />

          <Input
            label="Vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Company or individual name"
          />

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Description of the expense..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </section>
  );
}
