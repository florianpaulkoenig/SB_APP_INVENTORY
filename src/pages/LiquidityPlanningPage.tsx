// ---------------------------------------------------------------------------
// Liquidity Planning — income, expenses, 12-month view with Saldo
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
import type { NOALiquidityIncomeRow, NOALiquidityExpenseRow, LiquidityExpenseType } from '../types/database';
import { LiquidityCashFlowChart } from '../components/liquidity/LiquidityCashFlowChart';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c.value, label: c.label }));

const RECURRENCE_OPTIONS: { value: LiquidityExpenseType; label: string }[] = [
  { value: 'one_time',    label: 'Einmalig' },
  { value: 'monthly',     label: 'Monatlich' },
  { value: 'quarterly',   label: 'Pro Quartal' },
  { value: 'semi_annual', label: 'Pro Halbjahr' },
  { value: 'annual',      label: 'Pro Jahr' },
];

const RECURRENCE_BADGES: Record<LiquidityExpenseType, { label: string; className: string }> = {
  one_time:    { label: 'Einmalig',     className: 'bg-primary-100 text-primary-500' },
  monthly:     { label: 'Monatlich',    className: 'bg-blue-100 text-blue-700' },
  quarterly:   { label: 'Pro Quartal',  className: 'bg-teal-100 text-teal-700' },
  semi_annual: { label: 'Pro Halbjahr', className: 'bg-indigo-100 text-indigo-700' },
  annual:      { label: 'Pro Jahr',     className: 'bg-purple-100 text-purple-700' },
};

// ---------------------------------------------------------------------------
// Startsaldo card
// ---------------------------------------------------------------------------

function StartsaldoCard({
  startsaldo, currency, onSave,
}: {
  startsaldo: number;
  currency: string;
  onSave: (amount: number, currency: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount]   = useState('');
  const [cur, setCur]         = useState('CHF');
  const [saving, setSaving]   = useState(false);

  function openEdit() { setAmount(startsaldo > 0 ? String(startsaldo) : ''); setCur(currency); setEditing(true); }

  async function handleSave() {
    const num = parseFloat(amount);
    if (isNaN(num)) return;
    setSaving(true);
    const ok = await onSave(num, cur);
    setSaving(false);
    if (ok) setEditing(false);
  }

  if (editing) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary-200 bg-white px-4 py-3">
        <span className="shrink-0 text-sm font-medium text-primary-600">Startsaldo</span>
        <Input type="number" min="0" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-40" />
        <Select options={CURRENCY_OPTIONS} value={cur} onChange={(e) => setCur(e.target.value)} className="w-28" />
        <Button size="sm" onClick={handleSave} loading={saving} disabled={!amount}>Speichern</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Abbrechen</Button>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary-100 bg-white px-4 py-3">
      <span className="text-sm text-primary-500">Startsaldo (Monatsbeginn)</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-primary-900">{formatCurrency(startsaldo, currency)}</span>
        <button onClick={openEdit} className="text-xs text-primary-400 hover:text-primary-700 underline underline-offset-2 transition-colors">
          Bearbeiten
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-income form
// ---------------------------------------------------------------------------

function AddIncomeForm({
  onSave, onCancel,
}: {
  onSave: (data: { description: string; amount: number; currency: string; expected_date: string; notes?: string | null }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [currency, setCurrency]       = useState('CHF');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);

  async function handleSubmit() {
    const n = parseFloat(amount);
    if (!description.trim() || isNaN(n) || n <= 0 || !expectedDate) return;
    setSaving(true);
    const ok = await onSave({ description: description.trim(), amount: n, currency, expected_date: expectedDate, notes: notes.trim() || null });
    setSaving(false);
    if (ok) { setDescription(''); setAmount(''); setExpectedDate(''); setNotes(''); }
  }

  return (
    <div className="mb-6 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
      <h3 className="mb-4 text-sm font-semibold text-emerald-800">Neue Einnahme</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Beschreibung *" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="z. B. Provision Gallery X …" />
        </div>
        <Input label="Betrag *" type="number" min="0" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="z. B. 25000" />
        <Select label="Währung" options={CURRENCY_OPTIONS} value={currency} onChange={(e) => setCurrency(e.target.value)} />
        <Input label="Erwartetes Datum *" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
        <Input label="Notiz (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Interne Notiz …" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleSubmit} loading={saving} disabled={!description.trim() || !amount || !expectedDate}>Speichern</Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-expense form
// ---------------------------------------------------------------------------

function AddExpenseForm({
  onSave, onCancel,
}: {
  onSave: (data: { description: string; amount: number; currency: string; type: LiquidityExpenseType; due_date: string }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [currency, setCurrency]       = useState('CHF');
  const [type, setType]               = useState<LiquidityExpenseType>('monthly');
  const [dueDate, setDueDate]         = useState('');
  const [saving, setSaving]           = useState(false);

  async function handleSubmit() {
    const n = parseFloat(amount);
    if (!description.trim() || isNaN(n) || n <= 0 || !dueDate) return;
    setSaving(true);
    const ok = await onSave({ description: description.trim(), amount: n, currency, type, due_date: dueDate });
    setSaving(false);
    if (ok) { setDescription(''); setAmount(''); setDueDate(''); setType('monthly'); }
  }

  return (
    <div className="mb-6 rounded-lg border border-red-100 bg-red-50/30 p-4">
      <h3 className="mb-4 text-sm font-semibold text-red-800">Neue Ausgabe</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Beschreibung *" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="z. B. Atelier-Miete, Versicherung …" />
        </div>
        <Input label="Betrag *" type="number" min="0" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="z. B. 1500" />
        <Select label="Währung" options={CURRENCY_OPTIONS} value={currency} onChange={(e) => setCurrency(e.target.value)} />
        <Select label="Wiederholung *" options={RECURRENCE_OPTIONS} value={type} onChange={(e) => setType(e.target.value as LiquidityExpenseType)} />
        <Input label={type === 'one_time' ? 'Datum *' : 'Ab Datum *'} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleSubmit} loading={saving} disabled={!description.trim() || !amount || !dueDate}>Speichern</Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline income edit form (replaces the entry row while editing)
// ---------------------------------------------------------------------------

function InlineIncomeEditForm({
  entry,
  onSave,
  onCancel,
}: {
  entry: NOALiquidityIncomeRow;
  onSave: (id: string, data: { description: string; amount: number; currency: string; expected_date: string; notes?: string | null }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(entry.description);
  const [amount, setAmount]           = useState(String(entry.amount));
  const [currency, setCurrency]       = useState(entry.currency);
  const [expectedDate, setExpectedDate] = useState(entry.expected_date);
  const [notes, setNotes]             = useState(entry.notes ?? '');
  const [saving, setSaving]           = useState(false);

  async function handleSave() {
    const n = parseFloat(amount);
    if (!description.trim() || isNaN(n) || n <= 0 || !expectedDate) return;
    setSaving(true);
    const ok = await onSave(entry.id, { description: description.trim(), amount: n, currency, expected_date: expectedDate, notes: notes.trim() || null });
    setSaving(false);
    if (ok) onCancel();
  }

  return (
    <div className="py-2 border-b border-primary-50">
      <div className="grid gap-2 sm:grid-cols-2 mb-2">
        <div className="sm:col-span-2">
          <Input label="" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beschreibung" />
        </div>
        <Input label="" type="number" min="0" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Betrag" />
        <Select label="" options={CURRENCY_OPTIONS} value={currency} onChange={(e) => setCurrency(e.target.value)} />
        <Input label="" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
        <Input label="" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notiz (optional)" />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} loading={saving} disabled={!description.trim() || !amount || !expectedDate}>Speichern</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Income entry row (unpaid + late variants)
// ---------------------------------------------------------------------------

function IncomeEntryRow({
  entry,
  isLate = false,
  onUpdate,
  onDelete,
  onMarkPaid,
}: {
  entry: NOALiquidityIncomeRow;
  isLate?: boolean;
  onUpdate: (id: string, data: { description: string; amount: number; currency: string; expected_date: string; notes?: string | null }) => Promise<boolean>;
  onDelete: (id: string) => void;
  onMarkPaid: (id: string) => void;
}) {
  const [editing, setEditing]       = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (editing) {
    return <InlineIncomeEditForm entry={entry} onSave={onUpdate} onCancel={() => setEditing(false)} />;
  }

  return (
    <div className={`flex items-center gap-2 py-2.5 border-b border-primary-50 last:border-0 ${isLate ? 'text-red-600' : ''}`}>
      {/* Late badge */}
      {isLate && (
        <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
          Überfällig
        </span>
      )}

      {/* Date */}
      <span className={`w-20 shrink-0 text-xs tabular-nums ${isLate ? 'text-red-400' : 'text-primary-400'}`}>
        {formatDate(entry.expected_date)}
      </span>

      {/* Description + notes */}
      <div className="min-w-0 flex-1">
        <span className={`text-sm ${isLate ? 'font-medium text-red-700' : 'text-primary-900'}`}>
          {entry.description}
        </span>
        {entry.notes && (
          <span className={`ml-2 text-xs ${isLate ? 'text-red-400' : 'text-primary-400'}`}>{entry.notes}</span>
        )}
      </div>

      {/* Amount */}
      <span className={`shrink-0 text-sm font-medium tabular-nums ${isLate ? 'text-red-600' : 'text-emerald-700'}`}>
        +{formatCurrency(entry.amount, entry.currency)}
      </span>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Paid button */}
        <button
          onClick={() => onMarkPaid(entry.id)}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
          title="Als bezahlt markieren"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Bezahlt
        </button>

        {/* Edit button */}
        <button
          onClick={() => setEditing(true)}
          className="p-1 text-primary-300 hover:text-primary-600 transition-colors"
          title="Bearbeiten"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
        </button>

        {/* Delete */}
        {confirming ? (
          <div className="flex items-center gap-1">
            <button onClick={() => onDelete(entry.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Löschen</button>
            <button onClick={() => setConfirming(false)} className="text-xs text-primary-400 hover:text-primary-600">Nein</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="p-1 text-primary-300 hover:text-red-400 transition-colors" aria-label="Löschen">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paid income row
// ---------------------------------------------------------------------------

function PaidIncomeRow({
  entry,
  onUpdate,
  onDelete,
  onMarkUnpaid,
}: {
  entry: NOALiquidityIncomeRow;
  onUpdate: (id: string, data: { description: string; amount: number; currency: string; expected_date: string; notes?: string | null }) => Promise<boolean>;
  onDelete: (id: string) => void;
  onMarkUnpaid: (id: string) => void;
}) {
  const [editing, setEditing]       = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (editing) {
    return <InlineIncomeEditForm entry={entry} onSave={onUpdate} onCancel={() => setEditing(false)} />;
  }

  return (
    <div className="flex items-center gap-2 py-2 border-b border-primary-50 last:border-0 opacity-60">
      {/* Paid check */}
      <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>

      {/* Date */}
      <span className="w-20 shrink-0 text-xs text-primary-400 tabular-nums">{formatDate(entry.expected_date)}</span>

      {/* Description */}
      <div className="min-w-0 flex-1">
        <span className="text-sm text-primary-600 line-through">{entry.description}</span>
        {entry.notes && <span className="ml-2 text-xs text-primary-300">{entry.notes}</span>}
      </div>

      {/* Amount */}
      <span className="shrink-0 text-sm text-primary-400 tabular-nums line-through">
        +{formatCurrency(entry.amount, entry.currency)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onMarkUnpaid(entry.id)}
          className="text-xs text-primary-400 hover:text-primary-700 transition-colors"
          title="Als unbezahlt markieren"
        >
          Rückgängig
        </button>
        <button onClick={() => setEditing(true)} className="p-1 text-primary-300 hover:text-primary-600 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
        </button>
        {confirming ? (
          <div className="flex items-center gap-1">
            <button onClick={() => onDelete(entry.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Löschen</button>
            <button onClick={() => setConfirming(false)} className="text-xs text-primary-400">Nein</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="p-1 text-primary-300 hover:text-red-400 transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expense row inside month section
// ---------------------------------------------------------------------------

function MonthExpenseRow({ expense }: { expense: NOALiquidityExpenseRow }) {
  const badge = RECURRENCE_BADGES[expense.type];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-primary-50 last:border-0">
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
      <span className="min-w-0 flex-1 text-sm text-primary-700">{expense.description}</span>
      <span className="shrink-0 text-sm font-medium text-red-500 tabular-nums">
        -{formatCurrency(expense.amount, expense.currency)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline expense edit form
// ---------------------------------------------------------------------------

function InlineExpenseEditForm({
  expense,
  onSave,
  onCancel,
}: {
  expense: NOALiquidityExpenseRow;
  onSave: (id: string, data: { description: string; amount: number; currency: string; type: LiquidityExpenseType; due_date: string }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount]           = useState(String(expense.amount));
  const [currency, setCurrency]       = useState(expense.currency);
  const [type, setType]               = useState<LiquidityExpenseType>(expense.type);
  const [dueDate, setDueDate]         = useState(expense.due_date ?? '');
  const [saving, setSaving]           = useState(false);

  async function handleSave() {
    const n = parseFloat(amount);
    if (!description.trim() || isNaN(n) || n <= 0 || !dueDate) return;
    setSaving(true);
    const ok = await onSave(expense.id, { description: description.trim(), amount: n, currency, type, due_date: dueDate });
    setSaving(false);
    if (ok) onCancel();
  }

  return (
    <div className="py-3 border-b border-primary-50">
      <div className="grid gap-2 sm:grid-cols-2 mb-2">
        <div className="sm:col-span-2">
          <Input label="" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beschreibung" />
        </div>
        <Input label="" type="number" min="0" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Betrag" />
        <Select label="" options={CURRENCY_OPTIONS} value={currency} onChange={(e) => setCurrency(e.target.value)} />
        <Select label="" options={RECURRENCE_OPTIONS} value={type} onChange={(e) => setType(e.target.value as LiquidityExpenseType)} />
        <Input label="" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} loading={saving} disabled={!description.trim() || !amount || !dueDate}>Speichern</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expense management row
// ---------------------------------------------------------------------------

function ExpenseManagementRow({
  expense, onUpdate, onDelete, onToggleActive,
}: {
  expense: NOALiquidityExpenseRow;
  onUpdate: (id: string, data: { description: string; amount: number; currency: string; type: LiquidityExpenseType; due_date: string }) => Promise<boolean>;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}) {
  const [editing, setEditing]       = useState(false);
  const [confirming, setConfirming] = useState(false);
  const badge = RECURRENCE_BADGES[expense.type];

  if (editing) {
    return <InlineExpenseEditForm expense={expense} onSave={onUpdate} onCancel={() => setEditing(false)} />;
  }

  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-primary-50 last:border-0 ${!expense.active ? 'opacity-50' : ''}`}>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
      <div className="min-w-0 flex-1">
        <span className="text-sm text-primary-900">{expense.description}</span>
        {expense.due_date && (
          <span className="ml-2 text-xs text-primary-400">
            {expense.type === 'one_time' ? formatDate(expense.due_date) : `ab ${formatDate(expense.due_date)}`}
          </span>
        )}
      </div>
      <span className="shrink-0 text-sm font-medium text-red-600 tabular-nums">{formatCurrency(expense.amount, expense.currency)}</span>
      {expense.type !== 'one_time' && (
        <button
          onClick={() => onToggleActive(expense.id, !expense.active)}
          className={`shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${expense.active ? 'bg-primary-700' : 'bg-primary-200'}`}
          title={expense.active ? 'Aktiv – klicken zum Deaktivieren' : 'Inaktiv – klicken zum Aktivieren'}
        >
          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${expense.active ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
      )}
      {/* Edit button */}
      <button
        onClick={() => setEditing(true)}
        className="shrink-0 p-1 text-primary-300 hover:text-primary-600 transition-colors"
        title="Bearbeiten"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
        </svg>
      </button>
      {confirming ? (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => { onDelete(expense.id); setConfirming(false); }} className="text-xs text-red-600 hover:text-red-800 font-medium">Löschen</button>
          <button onClick={() => setConfirming(false)} className="text-xs text-primary-400">Nein</button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="shrink-0 text-primary-300 hover:text-red-400 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expense management card (with sort controls)
// ---------------------------------------------------------------------------

type ExpenseSortKey = 'description' | 'amount' | 'type' | 'due_date';

const TYPE_ORDER: Record<LiquidityExpenseType, number> = {
  monthly: 0, quarterly: 1, semi_annual: 2, annual: 3, one_time: 4,
};

function SortButton({
  label, active, dir, onClick,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
        active ? 'bg-primary-100 text-primary-800 font-semibold' : 'text-primary-400 hover:text-primary-700'
      }`}
    >
      {label}
      {active && (
        <svg className={`h-3 w-3 transition-transform ${dir === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
      )}
    </button>
  );
}

function ExpenseManagementCard({
  expenses, onUpdate, onDelete, onToggleActive,
}: {
  expenses: NOALiquidityExpenseRow[];
  onUpdate: (id: string, data: { description: string; amount: number; currency: string; type: LiquidityExpenseType; due_date: string }) => Promise<boolean>;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}) {
  const [open, setOpen]           = useState(true);
  const [sortKey, setSortKey]     = useState<ExpenseSortKey | null>(null);
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc');

  if (expenses.length === 0) return null;

  function handleSort(key: ExpenseSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = sortKey
    ? [...expenses].sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'description': cmp = a.description.localeCompare(b.description, 'de'); break;
          case 'amount':      cmp = a.amount - b.amount; break;
          case 'type':        cmp = TYPE_ORDER[a.type] - TYPE_ORDER[b.type]; break;
          case 'due_date':    cmp = (a.due_date ?? '').localeCompare(b.due_date ?? ''); break;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : expenses;

  return (
    <div className="mb-6 rounded-lg border border-primary-100 bg-white">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="text-sm font-semibold text-primary-700">
          Ausgaben verwalten
          <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-500">{expenses.length}</span>
        </span>
        <svg className={`h-4 w-4 text-primary-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <>
          {/* Sort controls */}
          <div className="flex items-center gap-1 border-t border-primary-50 px-4 py-2">
            <span className="mr-1 text-xs text-primary-400 shrink-0">Sortieren:</span>
            <SortButton label="Bezeichnung" active={sortKey === 'description'} dir={sortDir} onClick={() => handleSort('description')} />
            <SortButton label="Betrag"      active={sortKey === 'amount'}      dir={sortDir} onClick={() => handleSort('amount')} />
            <SortButton label="Typ"         active={sortKey === 'type'}        dir={sortDir} onClick={() => handleSort('type')} />
            <SortButton label="Datum"       active={sortKey === 'due_date'}    dir={sortDir} onClick={() => handleSort('due_date')} />
            {sortKey !== null && (
              <button onClick={() => setSortKey(null)} className="ml-1 text-xs text-primary-300 hover:text-primary-600 transition-colors">
                Zurücksetzen
              </button>
            )}
          </div>
          <div className="border-t border-primary-50 px-4 pb-1">
            {sorted.map((e) => (
              <ExpenseManagementRow
                key={e.id}
                expense={e}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onToggleActive={onToggleActive}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Balance row (projected + Ist-Saldo)
// ---------------------------------------------------------------------------

function BalanceRow({
  bucket, currency, onUpsert, onDelete,
}: {
  bucket: MonthBucket;
  currency: string;
  onUpsert: (year: number, month: number, balance: number, currency: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput]     = useState('');
  const [saving, setSaving]   = useState(false);

  const { projectedBalance, actualBalance, actualBalanceId } = bucket;
  const delta = actualBalance !== null ? actualBalance - projectedBalance : null;

  function openEdit() {
    setInput(actualBalance !== null ? String(actualBalance) : String(Math.round(projectedBalance)));
    setEditing(true);
  }

  async function handleSave() {
    const num = parseFloat(input);
    if (isNaN(num)) return;
    setSaving(true);
    const ok = await onUpsert(bucket.year, bucket.month + 1, num, currency);
    setSaving(false);
    if (ok) setEditing(false);
  }

  async function handleDelete() {
    if (!actualBalanceId) return;
    setSaving(true);
    await onDelete(actualBalanceId);
    setSaving(false);
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-primary-50 bg-primary-50/40 px-4 py-2">
      <span className="shrink-0 text-xs font-medium text-primary-500">Saldo per Ende Monat</span>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-semibold tabular-nums ${projectedBalance >= 0 ? 'text-primary-800' : 'text-red-700'}`}>
          {formatCurrency(projectedBalance, currency)}
        </span>
        {!editing && actualBalance !== null && (
          <>
            <span className="text-primary-200 select-none">|</span>
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-sm font-semibold text-emerald-700 tabular-nums">{formatCurrency(actualBalance, currency)}</span>
              {delta !== null && delta !== 0 && (
                <span className={`text-xs tabular-nums ${delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  ({delta > 0 ? '+' : ''}{formatCurrency(delta, currency)})
                </span>
              )}
            </div>
            <button onClick={openEdit} className="text-primary-300 hover:text-primary-600 transition-colors" title="Ist-Saldo bearbeiten">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
            <button onClick={handleDelete} disabled={saving} className="text-primary-300 hover:text-red-400 transition-colors" title="Ist-Saldo löschen">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
        {!editing && actualBalance === null && (
          <button onClick={openEdit} className="flex items-center gap-1 text-xs text-primary-300 hover:text-primary-600 transition-colors">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Ist-Saldo
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary-500">Ist:</span>
            <input
              type="number" step="100" value={input} onChange={(e) => setInput(e.target.value)} autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
              className="w-32 rounded border border-primary-200 px-2 py-1 text-xs tabular-nums focus:border-primary-400 focus:outline-none"
            />
            <span className="text-xs text-primary-400">{currency}</span>
            <button onClick={handleSave} disabled={saving || !input}
              className="rounded bg-primary-700 px-2 py-1 text-xs text-white hover:bg-primary-800 disabled:opacity-50">
              {saving ? '…' : '✓'}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-primary-400 hover:text-primary-600">✕</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month summary footer — income / expenses / net (3-column)
// ---------------------------------------------------------------------------

function MonthSummaryFooter({
  bucket,
  currency,
}: {
  bucket: MonthBucket;
  currency: string;
}) {
  // Sum ALL income (unpaid + late + paid) as face value
  const allIncome = [...bucket.entries, ...bucket.lateEntries, ...bucket.paidEntries];
  const incomeTotal  = allIncome.reduce((s, e) => s + e.amount, 0);
  const expenseTotal = bucket.expenses.reduce((s, e) => s + e.amount, 0);
  const net          = incomeTotal - expenseTotal;

  return (
    <div className="grid grid-cols-3 divide-x divide-primary-100 border-t border-primary-100 bg-primary-50/60">
      {/* Einnahmen */}
      <div className="px-4 py-3">
        <p className="text-xs text-primary-400 mb-1">Einnahmen</p>
        <p className={`text-base font-semibold tabular-nums ${incomeTotal > 0 ? 'text-emerald-700' : 'text-primary-300'}`}>
          {incomeTotal > 0 ? '+' : ''}{formatCurrency(incomeTotal, currency)}
        </p>
      </div>

      {/* Ausgaben */}
      <div className="px-4 py-3">
        <p className="text-xs text-primary-400 mb-1">Ausgaben</p>
        <p className={`text-base font-semibold tabular-nums ${expenseTotal > 0 ? 'text-red-500' : 'text-primary-300'}`}>
          {expenseTotal > 0 ? '-' : ''}{formatCurrency(expenseTotal, currency)}
        </p>
      </div>

      {/* Netto */}
      <div className="px-4 py-3">
        <p className="text-xs text-primary-400 mb-1">Netto</p>
        <p className={`text-base font-semibold tabular-nums ${net > 0 ? 'text-primary-800' : net < 0 ? 'text-red-600' : 'text-primary-300'}`}>
          {net !== 0 ? (net > 0 ? '+' : '') : ''}{formatCurrency(net, currency)}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month section
// ---------------------------------------------------------------------------

function MonthSection({
  bucket,
  isCurrentMonth,
  balanceCurrency,
  onUpdateIncome,
  onDeleteIncome,
  onMarkIncomePaid,
  onMarkIncomeUnpaid,
  onUpsertActualBalance,
  onDeleteActualBalance,
}: {
  bucket: MonthBucket;
  isCurrentMonth: boolean;
  balanceCurrency: string;
  onUpdateIncome: (id: string, data: { description: string; amount: number; currency: string; expected_date: string; notes?: string | null }) => Promise<boolean>;
  onDeleteIncome: (id: string) => void;
  onMarkIncomePaid: (id: string) => void;
  onMarkIncomeUnpaid: (id: string) => void;
  onUpsertActualBalance: (year: number, month: number, balance: number, currency: string) => Promise<boolean>;
  onDeleteActualBalance: (id: string) => Promise<boolean>;
}) {
  const [showPaid, setShowPaid] = useState(false);

  const hasUnpaid   = bucket.entries.length > 0;
  const hasLate     = bucket.lateEntries.length > 0;
  const hasPaid     = bucket.paidEntries.length > 0;
  const hasExpenses = bucket.expenses.length > 0;
  const hasAny      = hasUnpaid || hasLate || hasPaid || hasExpenses;

  return (
    <div className={`rounded-lg border overflow-hidden ${
      isCurrentMonth ? 'border-primary-300 bg-white' : hasAny ? 'border-primary-100 bg-white' : 'border-primary-50 bg-primary-50/40'
    }`}>
      {/* Month header — name + late badge only */}
      <div className="flex items-center gap-3 px-4 py-3">
        {isCurrentMonth && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />}
        <span className={`text-sm font-semibold ${hasAny ? 'text-primary-900' : 'text-primary-400'}`}>
          {bucket.label}
        </span>
        {hasLate && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
            {bucket.lateEntries.length} überfällig
          </span>
        )}
      </div>

      {/* Entries */}
      {hasAny && (
        <div className="border-t border-primary-50 px-4 pb-1">
          {/* Late (overdue) entries */}
          {hasLate && (
            <div className="border-b border-red-50 pb-0.5 mb-0.5">
              {bucket.lateEntries.map((e) => (
                <IncomeEntryRow
                  key={e.id} entry={e} isLate
                  onUpdate={onUpdateIncome} onDelete={onDeleteIncome} onMarkPaid={onMarkIncomePaid}
                />
              ))}
            </div>
          )}

          {/* Unpaid entries for this month */}
          {hasUnpaid && (
            <div>
              {bucket.entries.map((e) => (
                <IncomeEntryRow
                  key={e.id} entry={e}
                  onUpdate={onUpdateIncome} onDelete={onDeleteIncome} onMarkPaid={onMarkIncomePaid}
                />
              ))}
            </div>
          )}

          {/* Expenses */}
          {hasExpenses && (
            <div className={hasUnpaid || hasLate ? 'border-t border-primary-50 pt-0.5' : ''}>
              {bucket.expenses.map((e) => <MonthExpenseRow key={e.id} expense={e} />)}
            </div>
          )}

          {/* Paid section toggle */}
          {hasPaid && (
            <div className="border-t border-primary-50 pt-1">
              <button
                onClick={() => setShowPaid((v) => !v)}
                className="flex items-center gap-1.5 py-1.5 text-xs text-primary-400 hover:text-primary-600 transition-colors"
              >
                <svg className={`h-3 w-3 transition-transform ${showPaid ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
                {bucket.paidEntries.length} bezahlt
              </button>
              {showPaid && bucket.paidEntries.map((e) => (
                <PaidIncomeRow
                  key={e.id} entry={e}
                  onUpdate={onUpdateIncome} onDelete={onDeleteIncome} onMarkUnpaid={onMarkIncomeUnpaid}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary footer — Einnahmen / Ausgaben / Netto */}
      <MonthSummaryFooter bucket={bucket} currency={balanceCurrency} />

      {/* Balance row — Saldo per Ende Monat + Ist-Saldo */}
      <BalanceRow
        bucket={bucket}
        currency={balanceCurrency}
        onUpsert={onUpsertActualBalance}
        onDelete={onDeleteActualBalance}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function LiquidityPlanningPage() {
  const {
    months, expenses,
    startsaldo, startsaldoCurrency,
    loading,
    addIncome, updateIncome, deleteIncome, markIncomePaid, markIncomeUnpaid,
    addExpense, updateExpense, deleteExpense, toggleExpenseActive,
    upsertStartsaldo, upsertActualBalance, deleteActualBalance,
  } = useNOALiquidity();

  const [showIncomeForm, setShowIncomeForm]   = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  async function handleAddIncome(data: Parameters<typeof addIncome>[0]) {
    const ok = await addIncome(data);
    if (ok) setShowIncomeForm(false);
    return ok;
  }

  async function handleAddExpense(data: Parameters<typeof addExpense>[0]) {
    const ok = await addExpense(data);
    if (ok) setShowExpenseForm(false);
    return ok;
  }

  const showingAForm = showIncomeForm || showExpenseForm;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary-900">Liquiditätsplanung</h1>
          <p className="mt-1 text-sm text-primary-500">Einnahmen und Ausgaben der nächsten 12 Monate</p>
        </div>
        {!showingAForm && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowExpenseForm(true)}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Neue Ausgabe
            </Button>
            <Button onClick={() => setShowIncomeForm(true)}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Neue Einnahme
            </Button>
          </div>
        )}
      </div>

      {showIncomeForm  && <AddIncomeForm  onSave={handleAddIncome}  onCancel={() => setShowIncomeForm(false)} />}
      {showExpenseForm && <AddExpenseForm onSave={handleAddExpense} onCancel={() => setShowExpenseForm(false)} />}

      {!showingAForm && (
        <>
          <StartsaldoCard startsaldo={startsaldo} currency={startsaldoCurrency} onSave={upsertStartsaldo} />
          <ExpenseManagementCard expenses={expenses} onUpdate={updateExpense} onDelete={deleteExpense} onToggleActive={toggleExpenseActive} />
        </>
      )}

      {/* Cashflow chart */}
      {!loading && !showingAForm && (
        <LiquidityCashFlowChart months={months} currency={startsaldoCurrency} />
      )}

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-2">
          {months.map((bucket) => {
            const key = `${bucket.year}-${String(bucket.month + 1).padStart(2, '0')}`;
            return (
              <MonthSection
                key={key}
                bucket={bucket}
                isCurrentMonth={key === currentMonthKey}
                balanceCurrency={startsaldoCurrency}
                onUpdateIncome={updateIncome}
                onDeleteIncome={deleteIncome}
                onMarkIncomePaid={markIncomePaid}
                onMarkIncomeUnpaid={markIncomeUnpaid}
                onUpsertActualBalance={upsertActualBalance}
                onDeleteActualBalance={deleteActualBalance}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
