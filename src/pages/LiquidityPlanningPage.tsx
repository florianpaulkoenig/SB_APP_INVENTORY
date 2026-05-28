// ---------------------------------------------------------------------------
// Liquidity Planning — manual income entries, 12-month view
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../lib/utils';
import { CURRENCIES } from '../lib/constants';
import { useNOALiquidity } from '../hooks/useNOALiquidity';
import type { MonthBucket } from '../hooks/useNOALiquidity';
import type { NOALiquidityIncomeRow } from '../types/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c.value, label: c.label }));

// ---------------------------------------------------------------------------
// Add-income form
// ---------------------------------------------------------------------------

interface AddIncomeFormProps {
  onSave: (data: {
    description: string;
    amount: number;
    currency: string;
    expected_date: string;
    notes?: string | null;
  }) => Promise<boolean>;
  onCancel: () => void;
}

function AddIncomeForm({ onSave, onCancel }: AddIncomeFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('CHF');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const amountNum = parseFloat(amount);
    if (!description.trim()) return;
    if (!amount || isNaN(amountNum) || amountNum <= 0) return;
    if (!expectedDate) return;

    setSaving(true);
    const ok = await onSave({
      description: description.trim(),
      amount: amountNum,
      currency,
      expected_date: expectedDate,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (ok) {
      setDescription('');
      setAmount('');
      setExpectedDate('');
      setNotes('');
    }
  }

  return (
    <div className="mb-8 rounded-lg border border-primary-100 bg-primary-50 p-4">
      <h3 className="mb-4 text-sm font-semibold text-primary-700">Neue Einnahme</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Description — full width */}
        <div className="sm:col-span-2">
          <Input
            label="Beschreibung *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="z. B. Provision Gallery X, Verkauf Kunstwerk Y …"
          />
        </div>

        {/* Amount + currency */}
        <Input
          label="Betrag *"
          type="number"
          min="0"
          step="100"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="z. B. 25000"
        />
        <Select
          label="Währung"
          options={CURRENCY_OPTIONS}
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        />

        {/* Date */}
        <Input
          label="Erwartetes Datum *"
          type="date"
          value={expectedDate}
          onChange={(e) => setExpectedDate(e.target.value)}
        />

        {/* Notes */}
        <Input
          label="Notiz (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Interne Notiz …"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button
          onClick={handleSubmit}
          loading={saving}
          disabled={!description.trim() || !amount || !expectedDate}
        >
          Speichern
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single income entry row
// ---------------------------------------------------------------------------

function EntryRow({
  entry,
  onDelete,
}: {
  entry: NOALiquidityIncomeRow;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-primary-50 last:border-0">
      {/* Date */}
      <span className="w-24 shrink-0 text-xs text-primary-400 tabular-nums">
        {formatDate(entry.expected_date)}
      </span>

      {/* Description + notes */}
      <div className="min-w-0 flex-1">
        <span className="text-sm text-primary-900">{entry.description}</span>
        {entry.notes && (
          <span className="ml-2 text-xs text-primary-400">{entry.notes}</span>
        )}
      </div>

      {/* Amount */}
      <span className="shrink-0 text-sm font-medium text-primary-900 tabular-nums">
        {formatCurrency(entry.amount, entry.currency)}
      </span>

      {/* Delete */}
      {confirming ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onDelete(entry.id)}
            className="text-xs text-red-600 hover:text-red-800 font-medium"
          >
            Löschen
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs text-primary-400 hover:text-primary-600"
          >
            Nein
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="shrink-0 text-primary-300 hover:text-red-400 transition-colors"
          aria-label="Löschen"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month section
// ---------------------------------------------------------------------------

function MonthSection({
  bucket,
  isCurrentMonth,
  onDelete,
}: {
  bucket: MonthBucket;
  isCurrentMonth: boolean;
  onDelete: (id: string) => void;
}) {
  const hasEntries = bucket.entries.length > 0;

  // Compute total per currency
  const totals: Record<string, number> = {};
  for (const e of bucket.entries) {
    totals[e.currency] = (totals[e.currency] ?? 0) + e.amount;
  }
  const totalStr = Object.entries(totals)
    .map(([cur, amt]) => formatCurrency(amt, cur))
    .join(' + ');

  return (
    <div
      className={`rounded-lg border ${
        isCurrentMonth
          ? 'border-primary-300 bg-white'
          : hasEntries
          ? 'border-primary-100 bg-white'
          : 'border-primary-50 bg-primary-50/40'
      }`}
    >
      {/* Month header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          {isCurrentMonth && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          )}
          <span
            className={`text-sm font-semibold ${
              hasEntries ? 'text-primary-900' : 'text-primary-400'
            }`}
          >
            {bucket.label}
          </span>
        </div>

        {hasEntries ? (
          <span className="text-sm font-semibold text-emerald-700">{totalStr}</span>
        ) : (
          <span className="text-xs text-primary-300">—</span>
        )}
      </div>

      {/* Entries */}
      {hasEntries && (
        <div className="border-t border-primary-50 px-4 pb-1">
          {bucket.entries.map((e) => (
            <EntryRow key={e.id} entry={e} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function LiquidityPlanningPage() {
  const { months, loading, addIncome, deleteIncome } = useNOALiquidity();
  const [showForm, setShowForm] = useState(false);

  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  async function handleAdd(data: Parameters<typeof addIncome>[0]) {
    const ok = await addIncome(data);
    if (ok) setShowForm(false);
    return ok;
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary-900">
            Liquiditätsplanung
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Kommende Einnahmen der nächsten 12 Monate
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Neue Einnahme
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <AddIncomeForm
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* 12-month view */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-2">
          {months.map((bucket) => {
            const key = `${bucket.year}-${String(bucket.month + 1).padStart(2, '0')}`;
            return (
              <MonthSection
                key={key}
                bucket={bucket}
                isCurrentMonth={key === currentMonthKey}
                onDelete={deleteIncome}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
