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
import type { MonthBucket, LateExpenseInstance } from '../hooks/useNOALiquidity';
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

// Only recurring types — for the global "Neue Ausgabe" form
const RECURRING_OPTIONS = RECURRENCE_OPTIONS.filter((o) => o.value !== 'one_time');

const RECURRENCE_BADGES: Record<LiquidityExpenseType, { label: string; className: string }> = {
  one_time:    { label: 'Einmalig',     className: 'bg-primary-100 text-primary-500' },
  monthly:     { label: 'Monatlich',    className: 'bg-blue-100 text-blue-700' },
  quarterly:   { label: 'Pro Quartal',  className: 'bg-teal-100 text-teal-700' },
  semi_annual: { label: 'Pro Halbjahr', className: 'bg-indigo-100 text-indigo-700' },
  annual:      { label: 'Pro Jahr',     className: 'bg-purple-100 text-purple-700' },
};

// ---------------------------------------------------------------------------
// Provisional badge + checkbox
// ---------------------------------------------------------------------------

function ProvBadge() {
  return (
    <span
      className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
      title="Provisorisch — zählt nur zur provisorischen Liquiditätskurve"
    >
      Prov.
    </span>
  );
}

function ProvCheckbox({
  checked, onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-primary-600 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-primary-300 accent-amber-600"
      />
      Provisorisch
      <span className="text-xs text-primary-400">(nur provisorische Kurve)</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Tagessaldo card — current balance as of today
//   Startsaldo + paid income − paid expenses (across the 12-month window)
// ---------------------------------------------------------------------------

function TagessaldoCard({
  startsaldo, startsaldoDate, currency,
  correction,
  paidIncome, paidExpenses,
  effectiveBalance, effectiveBalanceDate,
  onSaveEffective, onClearEffective, onAcceptDifference,
}: {
  startsaldo: number;
  startsaldoDate: string | null;
  currency: string;
  correction: { balance: number; date: string } | null;
  paidIncome: number;
  paidExpenses: number;
  effectiveBalance: number | null;
  effectiveBalanceDate: string | null;
  onSaveEffective: (amount: number) => Promise<boolean>;
  onClearEffective: () => Promise<boolean>;
  onAcceptDifference: (balance: number, currency: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput]     = useState('');
  const [saving, setSaving]   = useState(false);

  const anchorBalance = correction?.balance ?? startsaldo;
  const saldo = anchorBalance + paidIncome - paidExpenses;
  const todayLabel = new Date().toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });

  const diff = effectiveBalance !== null ? effectiveBalance - saldo : null;

  function openEdit() {
    setInput(effectiveBalance !== null ? String(effectiveBalance) : '');
    setEditing(true);
  }

  async function handleSave() {
    const num = parseFloat(input);
    if (isNaN(num)) return;
    setSaving(true);
    const ok = await onSaveEffective(num);
    setSaving(false);
    if (ok) setEditing(false);
  }

  async function handleAccept() {
    if (effectiveBalance === null) return;
    setSaving(true);
    // The accepted bank balance becomes the new Startsaldo (per today);
    // re-anchoring resets the since-then components to zero.
    await onAcceptDifference(effectiveBalance, currency);
    setSaving(false);
  }

  async function handleClear() {
    setSaving(true);
    await onClearEffective();
    setSaving(false);
  }

  return (
    <div className="mb-4 rounded-lg border border-primary-200 bg-white px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary-500">Tagesaktueller Saldo</p>
          <p className="mt-0.5 text-xs text-primary-400">per {todayLabel}</p>
        </div>
        <span className={`text-2xl font-semibold tabular-nums ${saldo >= 0 ? 'text-primary-900' : 'text-red-600'}`}>
          {formatCurrency(saldo, currency)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-primary-400">
        {correction ? (
          <span>Saldokorrektur {formatCurrency(correction.balance, currency)} (per {formatDate(correction.date)})</span>
        ) : (
          <span>Startsaldo {formatCurrency(startsaldo, currency)}{startsaldoDate ? ` (per ${formatDate(startsaldoDate)})` : ''}</span>
        )}
        <span className="text-emerald-600">+ {formatCurrency(paidIncome, currency)} seither bezahlte Einnahmen</span>
        <span className="text-red-500">− {formatCurrency(paidExpenses, currency)} seither bezahlte Ausgaben</span>
      </div>

      {/* Effective bank balance — entry, comparison, accept */}
      <div className="mt-3 border-t border-primary-50 pt-3">
        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-primary-500">Effektiver Konto-Saldo:</span>
            <input
              type="number" step="0.01" value={input} onChange={(e) => setInput(e.target.value)} autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
              placeholder="z. B. 42500.00"
              className="w-36 rounded border border-primary-200 px-2 py-1 text-sm tabular-nums focus:border-primary-400 focus:outline-none"
            />
            <span className="text-xs text-primary-400">{currency}</span>
            <Button size="sm" onClick={handleSave} loading={saving} disabled={!input}>Speichern</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Abbrechen</Button>
          </div>
        ) : effectiveBalance === null ? (
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Effektiven Konto-Saldo eintragen (Abgleich mit Bank)
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-xs text-primary-500">
              Konto-Saldo{effectiveBalanceDate ? ` per ${formatDate(effectiveBalanceDate)}` : ''}:
              <span className="ml-1.5 text-sm font-semibold text-primary-900 tabular-nums">
                {formatCurrency(effectiveBalance, currency)}
              </span>
            </span>

            {diff === 0 ? (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Stimmt mit dem berechneten Saldo überein
              </span>
            ) : (
              <span className={`text-xs font-semibold tabular-nums ${diff !== null && diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                Differenz: {diff !== null && diff > 0 ? '+' : ''}{formatCurrency(diff ?? 0, currency)}
              </span>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {diff !== null && diff !== 0 && (
                <Button size="sm" onClick={handleAccept} loading={saving} title="Erfasst eine finale Saldokorrektur per heute; ältere Einträge werden fixiert">
                  Differenz akzeptieren
                </Button>
              )}
              <button onClick={openEdit} className="text-xs text-primary-400 hover:text-primary-700 underline underline-offset-2 transition-colors">
                Bearbeiten
              </button>
              <button onClick={handleClear} disabled={saving} className="text-xs text-primary-400 hover:text-red-500 underline underline-offset-2 transition-colors">
                Entfernen
              </button>
            </div>

            {diff !== null && diff !== 0 && (
              <p className="w-full text-xs text-primary-400">
                «Differenz akzeptieren» erfasst eine finale Saldokorrektur per heute (der Startsaldo bleibt bestehen, ältere Einträge werden fixiert) — oder Einträge unten prüfen, bis die Differenz verschwindet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Startsaldo card
// ---------------------------------------------------------------------------

function StartsaldoCard({
  startsaldo, startsaldoDate, currency, locked, onSave,
}: {
  startsaldo: number;
  startsaldoDate: string | null;
  currency: string;
  /** True once a Saldokorrektur exists — the Startsaldo is then final */
  locked: boolean;
  onSave: (amount: number, currency: string, date: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount]   = useState('');
  const [cur, setCur]         = useState('CHF');
  const [date, setDate]       = useState('');
  const [saving, setSaving]   = useState(false);

  function openEdit() {
    setAmount(startsaldo > 0 ? String(startsaldo) : '');
    setCur(currency);
    setDate(startsaldoDate ?? new Date().toISOString().slice(0, 10));
    setEditing(true);
  }

  async function handleSave() {
    const num = parseFloat(amount);
    if (isNaN(num) || !date) return;
    setSaving(true);
    const ok = await onSave(num, cur, date);
    setSaving(false);
    if (ok) setEditing(false);
  }

  if (editing) {
    return (
      <div className="mb-4 rounded-lg border border-primary-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="shrink-0 text-sm font-medium text-primary-600">Startsaldo</span>
          <Input type="number" min="0" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-40" />
          <Select options={CURRENCY_OPTIONS} value={cur} onChange={(e) => setCur(e.target.value)} className="w-28" />
          <span className="shrink-0 text-xs text-primary-400">per</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!amount || !date}>Speichern</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Abbrechen</Button>
        </div>
        <p className="mt-2 text-xs text-primary-400">
          Kontostand der Bank an diesem Datum. Bezahlte Einnahmen und Ausgaben ab diesem Datum fließen in den Tagessaldo ein.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary-100 bg-white px-4 py-3">
      <span className="text-sm text-primary-500">
        Startsaldo{startsaldoDate ? ` per ${formatDate(startsaldoDate)}` : ''}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-primary-900">{formatCurrency(startsaldo, currency)}</span>
        {locked ? (
          <span className="flex items-center gap-1 text-xs text-primary-300" title="Durch Saldokorrektur fixiert">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Fixiert
          </span>
        ) : (
          <button onClick={openEdit} className="text-xs text-primary-400 hover:text-primary-700 underline underline-offset-2 transition-colors">
            Bearbeiten
          </button>
        )}
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
  onSave: (data: { description: string; amount: number; currency: string; expected_date: string; notes?: string | null; invoice_number?: string | null; provisional?: boolean }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [currency, setCurrency]       = useState('CHF');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes]             = useState('');
  const [invoiceNo, setInvoiceNo]     = useState('');
  const [provisional, setProvisional] = useState(false);
  const [saving, setSaving]           = useState(false);

  async function handleSubmit() {
    const n = parseFloat(amount);
    if (!description.trim() || isNaN(n) || n <= 0 || !expectedDate) return;
    setSaving(true);
    const ok = await onSave({ description: description.trim(), amount: n, currency, expected_date: expectedDate, notes: notes.trim() || null, invoice_number: invoiceNo.trim() || null, provisional });
    setSaving(false);
    if (ok) { setDescription(''); setAmount(''); setExpectedDate(''); setNotes(''); setInvoiceNo(''); setProvisional(false); }
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
        <Input label="Rechnungsnr. (optional)" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="z. B. 2026-042" />
        <div className="sm:col-span-2">
          <ProvCheckbox checked={provisional} onChange={setProvisional} />
        </div>
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
  onSave: (data: { description: string; amount: number; currency: string; type: LiquidityExpenseType; due_date: string; invoice_number?: string | null; provisional?: boolean }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [currency, setCurrency]       = useState('CHF');
  const [type, setType]               = useState<LiquidityExpenseType>('monthly');
  const [dueDate, setDueDate]         = useState('');
  const [invoiceNo, setInvoiceNo]     = useState('');
  const [provisional, setProvisional] = useState(false);
  const [saving, setSaving]           = useState(false);

  async function handleSubmit() {
    const n = parseFloat(amount);
    if (!description.trim() || isNaN(n) || n <= 0 || !dueDate) return;
    setSaving(true);
    const ok = await onSave({ description: description.trim(), amount: n, currency, type, due_date: dueDate, invoice_number: invoiceNo.trim() || null, provisional });
    setSaving(false);
    if (ok) { setDescription(''); setAmount(''); setDueDate(''); setType('monthly'); setInvoiceNo(''); setProvisional(false); }
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
        <Select label="Wiederholung *" options={RECURRING_OPTIONS} value={type} onChange={(e) => setType(e.target.value as LiquidityExpenseType)} />
        <Input label={type === 'one_time' ? 'Datum *' : 'Ab Datum *'} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Input label="Rechnungsnr. (optional)" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="z. B. RE-2026-15" />
        <div className="sm:col-span-2">
          <ProvCheckbox checked={provisional} onChange={setProvisional} />
        </div>
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
  onSave: (id: string, data: { description: string; amount: number; currency: string; expected_date: string; notes?: string | null; invoice_number?: string | null; provisional?: boolean }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(entry.description);
  const [amount, setAmount]           = useState(String(entry.amount));
  const [currency, setCurrency]       = useState(entry.currency);
  const [expectedDate, setExpectedDate] = useState(entry.expected_date);
  const [notes, setNotes]             = useState(entry.notes ?? '');
  const [invoiceNo, setInvoiceNo]     = useState(entry.invoice_number ?? '');
  const [provisional, setProvisional] = useState(!!entry.provisional);
  const [saving, setSaving]           = useState(false);

  async function handleSave() {
    const n = parseFloat(amount);
    if (!description.trim() || isNaN(n) || n <= 0 || !expectedDate) return;
    setSaving(true);
    const ok = await onSave(entry.id, { description: description.trim(), amount: n, currency, expected_date: expectedDate, notes: notes.trim() || null, invoice_number: invoiceNo.trim() || null, provisional });
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
        <Input label="" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Rechnungsnr. (optional)" />
        <div className="sm:col-span-2">
          <ProvCheckbox checked={provisional} onChange={setProvisional} />
        </div>
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
  locked = false,
  onUpdate,
  onDelete,
  onMarkPaid,
}: {
  entry: NOALiquidityIncomeRow;
  isLate?: boolean;
  /** Locked by a Saldokorrektur: no edit/delete — settling (Bezahlt) stays possible */
  locked?: boolean;
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

      {entry.provisional && <ProvBadge />}

      {/* Description + notes */}
      <div className="min-w-0 flex-1">
        <span className={`text-sm ${isLate ? 'font-medium text-red-700' : 'text-primary-900'}`}>
          {entry.description}
        </span>
        {entry.notes && (
          <span className={`ml-2 text-xs ${isLate ? 'text-red-400' : 'text-primary-400'}`}>{entry.notes}</span>
        )}
        {entry.invoice_number && (
          <span className={`ml-2 text-xs tabular-nums ${isLate ? 'text-red-300' : 'text-primary-300'}`}>Rg. {entry.invoice_number}</span>
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

        {/* Edit + Delete — hidden when locked by a Saldokorrektur */}
        {!locked && (
          <>
            <button
              onClick={() => setEditing(true)}
              className="p-1 text-primary-300 hover:text-primary-600 transition-colors"
              title="Bearbeiten"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>

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
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carried rows — unpaid items shown greyed in their origin month with a note
// pointing to the month they were carried to (the current month)
// ---------------------------------------------------------------------------

function CarriedIncomeRow({
  entry, targetLabel,
}: {
  entry: NOALiquidityIncomeRow;
  targetLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-primary-50 last:border-0 opacity-60">
      <span className="w-20 shrink-0 text-xs text-primary-300 tabular-nums">{formatDate(entry.expected_date)}</span>
      {entry.provisional && <ProvBadge />}
      <div className="min-w-0 flex-1">
        <span className="text-sm text-primary-400">{entry.description}</span>
        {entry.notes && <span className="ml-2 text-xs text-primary-300">{entry.notes}</span>}
        {entry.invoice_number && <span className="ml-2 text-xs text-primary-300 tabular-nums">Rg. {entry.invoice_number}</span>}
      </div>
      <span
        className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-500"
        title={`Offen — wird in ${targetLabel} als überfällig geführt`}
      >
        → übertragen nach {targetLabel}
      </span>
      <span className="shrink-0 text-sm text-primary-400 tabular-nums">
        +{formatCurrency(entry.amount, entry.currency)}
      </span>
    </div>
  );
}

function CarriedExpenseRow({
  expense, targetLabel,
}: {
  expense: NOALiquidityExpenseRow;
  targetLabel: string;
}) {
  const badge = RECURRENCE_BADGES[expense.type];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-primary-50 last:border-0 opacity-60">
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
      {expense.provisional && <ProvBadge />}
      <span className="min-w-0 flex-1 text-sm text-primary-400">
        {expense.description}
        {expense.invoice_number && <span className="ml-2 text-xs text-primary-300 tabular-nums">Rg. {expense.invoice_number}</span>}
      </span>
      <span
        className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-500"
        title={`Offen — wird in ${targetLabel} als überfällig geführt`}
      >
        → übertragen nach {targetLabel}
      </span>
      <span className="shrink-0 text-sm text-primary-400 tabular-nums">
        -{formatCurrency(expense.amount, expense.currency)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paid income row
// ---------------------------------------------------------------------------

function PaidIncomeRow({
  entry,
  locked = false,
  onUpdate,
  onDelete,
  onMarkUnpaid,
}: {
  entry: NOALiquidityIncomeRow;
  /** Locked by a Saldokorrektur: paid state and data are final */
  locked?: boolean;
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

      {entry.provisional && <ProvBadge />}

      {/* Description */}
      <div className="min-w-0 flex-1">
        <span className="text-sm text-primary-600 line-through">{entry.description}</span>
        {entry.notes && <span className="ml-2 text-xs text-primary-300">{entry.notes}</span>}
        {entry.invoice_number && <span className="ml-2 text-xs text-primary-300 tabular-nums">Rg. {entry.invoice_number}</span>}
      </div>

      {/* Amount */}
      <span className="shrink-0 text-sm text-primary-400 tabular-nums line-through">
        +{formatCurrency(entry.amount, entry.currency)}
      </span>

      {/* Actions — hidden when locked by a Saldokorrektur */}
      {locked ? (
        <svg className="h-3.5 w-3.5 shrink-0 text-primary-200" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-label="Fixiert">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ) : (
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
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expense row inside month section — unpaid
// ---------------------------------------------------------------------------

function MonthExpenseRow({
  expense, locked = false, onMarkPaid, onUpdate, onDelete,
}: {
  expense: NOALiquidityExpenseRow;
  /** Locked by a Saldokorrektur: no edit/delete — settling (Bezahlt) stays possible */
  locked?: boolean;
  onMarkPaid: (expenseId: string) => void;
  onUpdate?: (id: string, data: { description: string; amount: number; currency: string; type: LiquidityExpenseType; due_date: string }) => Promise<boolean>;
  onDelete?: (id: string) => void;
}) {
  const [editing, setEditing]       = useState(false);
  const [confirming, setConfirming] = useState(false);
  const badge = RECURRENCE_BADGES[expense.type];
  const isOneTime = expense.type === 'one_time' && !locked;

  if (editing && onUpdate) {
    return <InlineExpenseEditForm expense={expense} onSave={onUpdate} onCancel={() => setEditing(false)} />;
  }

  return (
    <div className="flex items-center gap-3 py-2 border-b border-primary-50 last:border-0">
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
      {expense.provisional && <ProvBadge />}
      <span className="min-w-0 flex-1 text-sm text-primary-700">
        {expense.description}
        {expense.invoice_number && <span className="ml-2 text-xs text-primary-400 tabular-nums">Rg. {expense.invoice_number}</span>}
      </span>
      <span className="shrink-0 text-sm font-medium text-red-500 tabular-nums">
        -{formatCurrency(expense.amount, expense.currency)}
      </span>
      <button
        onClick={() => onMarkPaid(expense.id)}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-50 transition-colors shrink-0"
        title="Als bezahlt markieren"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Bezahlt
      </button>
      {/* Edit/Delete only for one-time expenses */}
      {isOneTime && onUpdate && (
        <button
          onClick={() => setEditing(true)}
          className="shrink-0 p-1 text-primary-300 hover:text-primary-600 transition-colors"
          title="Bearbeiten"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
        </button>
      )}
      {isOneTime && onDelete && (
        confirming ? (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => { onDelete(expense.id); setConfirming(false); }} className="text-xs text-red-600 hover:text-red-800 font-medium">Löschen</button>
            <button onClick={() => setConfirming(false)} className="text-xs text-primary-400">Nein</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="shrink-0 p-1 text-primary-300 hover:text-red-400 transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Late expense row — unpaid instance carried over from a past month
// ---------------------------------------------------------------------------

function LateExpenseRow({
  instance, onMarkPaid,
}: {
  instance: LateExpenseInstance;
  onMarkPaid: (expenseId: string, year: number, month: number) => void;
}) {
  const e = instance.expense;
  const badge = RECURRENCE_BADGES[e.type];
  const originLabel = new Date(instance.year, instance.month - 1, 1)
    .toLocaleDateString('de-CH', { month: 'long', year: 'numeric' });

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-primary-50 last:border-0">
      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
        Überfällig
      </span>
      <span className="w-28 shrink-0 text-xs text-red-400">{originLabel}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
      {e.provisional && <ProvBadge />}
      <span className="min-w-0 flex-1 text-sm font-medium text-red-700">
        {e.description}
        {e.invoice_number && <span className="ml-2 text-xs font-normal text-red-400 tabular-nums">Rg. {e.invoice_number}</span>}
      </span>
      <span className="shrink-0 text-sm font-medium text-red-600 tabular-nums">
        -{formatCurrency(e.amount, e.currency)}
      </span>
      <button
        onClick={() => onMarkPaid(e.id, instance.year, instance.month)}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-50 transition-colors shrink-0"
        title={`Als bezahlt markieren (wird ${originLabel} zugeordnet)`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Bezahlt
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expense row inside month section — paid
// ---------------------------------------------------------------------------

function PaidExpenseRow({
  expense, locked = false, onMarkUnpaid,
}: {
  expense: NOALiquidityExpenseRow;
  /** Locked by a Saldokorrektur: paid state is final */
  locked?: boolean;
  onMarkUnpaid: (expenseId: string) => void;
}) {
  const badge = RECURRENCE_BADGES[expense.type];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-primary-50 last:border-0 opacity-60">
      <svg className="h-3.5 w-3.5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
      {expense.provisional && <ProvBadge />}
      <span className="min-w-0 flex-1 text-sm text-primary-500 line-through">
        {expense.description}
        {expense.invoice_number && <span className="ml-2 text-xs text-primary-300 tabular-nums">Rg. {expense.invoice_number}</span>}
      </span>
      <span className="shrink-0 text-sm text-primary-400 tabular-nums line-through">
        -{formatCurrency(expense.amount, expense.currency)}
      </span>
      {locked ? (
        <svg className="h-3.5 w-3.5 shrink-0 text-primary-200" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-label="Fixiert">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ) : (
        <button
          onClick={() => onMarkUnpaid(expense.id)}
          className="text-xs text-primary-400 hover:text-primary-700 transition-colors shrink-0"
          title="Als unbezahlt markieren"
        >
          Rückgängig
        </button>
      )}
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
  onSave: (id: string, data: { description: string; amount: number; currency: string; type: LiquidityExpenseType; due_date: string; invoice_number?: string | null; provisional?: boolean }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount]           = useState(String(expense.amount));
  const [currency, setCurrency]       = useState(expense.currency);
  const [type, setType]               = useState<LiquidityExpenseType>(expense.type);
  const [dueDate, setDueDate]         = useState(expense.due_date ?? '');
  const [invoiceNo, setInvoiceNo]     = useState(expense.invoice_number ?? '');
  const [provisional, setProvisional] = useState(!!expense.provisional);
  const [saving, setSaving]           = useState(false);

  async function handleSave() {
    const n = parseFloat(amount);
    if (!description.trim() || isNaN(n) || n <= 0 || !dueDate) return;
    setSaving(true);
    const ok = await onSave(expense.id, { description: description.trim(), amount: n, currency, type, due_date: dueDate, invoice_number: invoiceNo.trim() || null, provisional });
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
        <Input label="" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Rechnungsnr. (optional)" />
        <div className="sm:col-span-2">
          <ProvCheckbox checked={provisional} onChange={setProvisional} />
        </div>
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
      {expense.provisional && <ProvBadge />}
      <div className="min-w-0 flex-1">
        <span className="text-sm text-primary-900">{expense.description}</span>
        {expense.invoice_number && <span className="ml-2 text-xs text-primary-300 tabular-nums">Rg. {expense.invoice_number}</span>}
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
// Inline one-time expense add form — used directly inside a MonthSection
// ---------------------------------------------------------------------------

function InlineOneTimeExpenseForm({
  defaultDate,
  onSave,
  onCancel,
}: {
  defaultDate: string; // YYYY-MM-DD, first day of the month
  onSave: (data: { description: string; amount: number; currency: string; type: LiquidityExpenseType; due_date: string; invoice_number?: string | null; provisional?: boolean }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [currency, setCurrency]       = useState('CHF');
  const [dueDate, setDueDate]         = useState(defaultDate);
  const [invoiceNo, setInvoiceNo]     = useState('');
  const [provisional, setProvisional] = useState(false);
  const [saving, setSaving]           = useState(false);

  async function handleSubmit() {
    const n = parseFloat(amount);
    if (!description.trim() || isNaN(n) || n <= 0 || !dueDate) return;
    setSaving(true);
    const ok = await onSave({ description: description.trim(), amount: n, currency, type: 'one_time', due_date: dueDate, invoice_number: invoiceNo.trim() || null, provisional });
    setSaving(false);
    if (ok) onCancel();
  }

  return (
    <div className="border-t border-red-50 bg-red-50/20 px-4 py-3">
      <p className="mb-2 text-xs font-semibold text-red-700">Einmalige Ausgabe</p>
      <div className="grid gap-2 sm:grid-cols-2 mb-2">
        <div className="sm:col-span-2">
          <Input label="" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beschreibung *" />
        </div>
        <Input label="" type="number" min="0" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Betrag *" />
        <Select label="" options={CURRENCY_OPTIONS} value={currency} onChange={(e) => setCurrency(e.target.value)} />
        <Input label="" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Input label="" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Rechnungsnr. (optional)" />
        <div className="sm:col-span-2">
          <ProvCheckbox checked={provisional} onChange={setProvisional} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSubmit} loading={saving} disabled={!description.trim() || !amount || !dueDate}>Speichern</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Abbrechen</Button>
      </div>
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
          Wiederkehrende Ausgaben
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
  bucket, currency, locked = false, onUpsert, onDelete,
}: {
  bucket: MonthBucket;
  currency: string;
  /** Locked by a Saldokorrektur: Ist-Saldo is final */
  locked?: boolean;
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
        {bucket.projectedBalanceProv !== projectedBalance && (
          <span className="text-xs text-amber-600 tabular-nums" title="Inklusive provisorischer Positionen">
            (prov. {formatCurrency(bucket.projectedBalanceProv, currency)})
          </span>
        )}
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
            {!locked && (
              <>
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
          </>
        )}
        {!editing && actualBalance === null && !locked && (
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
  const expenseTotal = bucket.expenses.reduce((s, e) => s + e.amount, 0)
                     + bucket.lateExpenses.reduce((s, le) => s + le.expense.amount, 0);
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

// Instance due date of an expense within a given month (YYYY-MM-DD)
function expenseInstanceDate(e: NOALiquidityExpenseRow, year: number, month0: number): string {
  const dueDay      = e.due_date ? Number(e.due_date.slice(8, 10)) : 1;
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  return `${year}-${String(month0 + 1).padStart(2, '0')}-${String(Math.min(dueDay, daysInMonth)).padStart(2, '0')}`;
}

function MonthSection({
  bucket,
  isCurrentMonth,
  balanceCurrency,
  lockDate,
  lockTs,
  carriedToLabel = null,
  onUpdateIncome,
  onDeleteIncome,
  onMarkIncomePaid,
  onMarkIncomeUnpaid,
  onMarkExpensePaid,
  onMarkExpenseUnpaid,
  onUpdateExpense,
  onDeleteExpense,
  onAddExpense,
  onUpsertActualBalance,
  onDeleteActualBalance,
}: {
  bucket: MonthBucket;
  isCurrentMonth: boolean;
  balanceCurrency: string;
  /** Latest Saldokorrektur date — periods before it are final */
  lockDate: string | null;
  /** Moment the latest Saldokorrektur was recorded (ms epoch) */
  lockTs: number | null;
  /**
   * Set for past months: label of the month unpaid items were carried to
   * (the current month). Unpaid rows then render greyed with a note.
   */
  carriedToLabel?: string | null;
  onUpdateIncome: (id: string, data: { description: string; amount: number; currency: string; expected_date: string; notes?: string | null }) => Promise<boolean>;
  onDeleteIncome: (id: string) => void;
  onMarkIncomePaid: (id: string) => void;
  onMarkIncomeUnpaid: (id: string) => void;
  onMarkExpensePaid: (expenseId: string, year: number, month: number) => void;
  onMarkExpenseUnpaid: (paymentId: string) => void;
  onUpdateExpense: (id: string, data: { description: string; amount: number; currency: string; type: LiquidityExpenseType; due_date: string }) => Promise<boolean>;
  onDeleteExpense: (id: string) => void;
  onAddExpense: (data: { description: string; amount: number; currency: string; type: LiquidityExpenseType; due_date: string }) => Promise<boolean>;
  onUpsertActualBalance: (year: number, month: number, balance: number, currency: string) => Promise<boolean>;
  onDeleteActualBalance: (id: string) => Promise<boolean>;
}) {
  const [showPaidIncome,        setShowPaidIncome]        = useState(false);
  const [showPaidExpenses,      setShowPaidExpenses]      = useState(false);
  const [showOneTimeForm,       setShowOneTimeForm]       = useState(false);

  // Default date = first day of this month
  const defaultDate = `${bucket.year}-${String(bucket.month + 1).padStart(2, '0')}-01`;

  const unpaidExpenses = bucket.expenses.filter((e) => !bucket.paidExpenseMap[e.id]);
  const paidExpenses   = bucket.expenses.filter((e) =>  bucket.paidExpenseMap[e.id]);

  // ---- Lock checks (Saldokorrektur) ----------------------------------------
  // The lock only covers COMPLETED months: items dated in the current month
  // stay editable even when the correction date lies after them (e.g. item
  // from 10 July, correction per 11 July).
  const now = new Date();
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const effLockDate = lockDate !== null && lockDate > currentMonthStart ? currentMonthStart : lockDate;

  const monthEnd = `${bucket.year}-${String(bucket.month + 1).padStart(2, '0')}-${String(new Date(bucket.year, bucket.month + 1, 0).getDate()).padStart(2, '0')}`;
  const monthFullyLocked = effLockDate !== null && monthEnd < effLockDate;
  const incomeLocked = (e: NOALiquidityIncomeRow) =>
    effLockDate !== null && e.expected_date < effLockDate;
  const paidIncomeLocked = (e: NOALiquidityIncomeRow) =>
    effLockDate !== null && e.expected_date < effLockDate &&
    (e.paid_at === null || lockTs === null || new Date(e.paid_at).getTime() < lockTs);
  const expenseLocked = (e: NOALiquidityExpenseRow) =>
    effLockDate !== null && expenseInstanceDate(e, bucket.year, bucket.month) < effLockDate;
  const paidExpenseLocked = (e: NOALiquidityExpenseRow) => {
    if (!expenseLocked(e)) return false;
    const paidAt = bucket.paidExpenseAtMap[e.id];
    return !paidAt || lockTs === null || new Date(paidAt).getTime() < lockTs;
  };

  const hasUnpaid        = bucket.entries.length > 0;
  const hasLate          = bucket.lateEntries.length > 0;
  const hasLateExpenses  = bucket.lateExpenses.length > 0;
  const hasPaidIncome    = bucket.paidEntries.length > 0;
  const hasUnpaidExpenses = unpaidExpenses.length > 0;
  const hasPaidExpenses  = paidExpenses.length > 0;
  const hasExpenses      = bucket.expenses.length > 0;
  const hasAny           = hasUnpaid || hasLate || hasLateExpenses || hasPaidIncome || hasExpenses;
  const lateCount        = bucket.lateEntries.length + bucket.lateExpenses.length;

  return (
    <div className={`rounded-lg border overflow-hidden ${
      isCurrentMonth ? 'border-primary-300 bg-white' : hasAny ? 'border-primary-100 bg-white' : 'border-primary-50 bg-primary-50/40'
    }`}>
      {/* Month header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {isCurrentMonth && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />}
        <span className={`text-sm font-semibold ${hasAny ? 'text-primary-900' : 'text-primary-400'}`}>
          {bucket.label}
        </span>
        {lateCount > 0 && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
            {lateCount} überfällig
          </span>
        )}
        {!monthFullyLocked && (
          <button
            onClick={() => setShowOneTimeForm((v) => !v)}
            className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs text-primary-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Einmalige Ausgabe hinzufügen"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Einmalige Ausgabe
          </button>
        )}
        {monthFullyLocked && (
          <span className="ml-auto flex items-center gap-1 text-xs text-primary-300" title="Durch Saldokorrektur fixiert">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Fixiert
          </span>
        )}
      </div>

      {/* Inline one-time expense add form — directly below header */}
      {showOneTimeForm && (
        <InlineOneTimeExpenseForm
          defaultDate={defaultDate}
          onSave={async (data) => {
            const ok = await onAddExpense(data);
            if (ok) setShowOneTimeForm(false);
            return ok;
          }}
          onCancel={() => setShowOneTimeForm(false)}
        />
      )}

      {/* Entries */}
      {hasAny && (
        <div className="border-t border-primary-50 px-4 pb-1">
          {/* Late (overdue) income entries */}
          {hasLate && (
            <div className="border-b border-red-50 pb-0.5 mb-0.5">
              {bucket.lateEntries.map((e) => (
                <IncomeEntryRow
                  key={e.id} entry={e} isLate locked={incomeLocked(e)}
                  onUpdate={onUpdateIncome} onDelete={onDeleteIncome} onMarkPaid={onMarkIncomePaid}
                />
              ))}
            </div>
          )}

          {/* Late (overdue) expense instances from past months */}
          {hasLateExpenses && (
            <div className="border-b border-red-50 pb-0.5 mb-0.5">
              {bucket.lateExpenses.map((le) => (
                <LateExpenseRow
                  key={`${le.expense.id}:${le.year}-${le.month}`}
                  instance={le}
                  onMarkPaid={onMarkExpensePaid}
                />
              ))}
            </div>
          )}

          {/* Unpaid income entries for this month */}
          {hasUnpaid && (
            <div>
              {bucket.entries.map((e) => (
                carriedToLabel !== null ? (
                  <CarriedIncomeRow key={e.id} entry={e} targetLabel={carriedToLabel} />
                ) : (
                  <IncomeEntryRow
                    key={e.id} entry={e} locked={incomeLocked(e)}
                    onUpdate={onUpdateIncome} onDelete={onDeleteIncome} onMarkPaid={onMarkIncomePaid}
                  />
                )
              ))}
            </div>
          )}

          {/* Unpaid expenses */}
          {hasUnpaidExpenses && (
            <div className={hasUnpaid || hasLate ? 'border-t border-primary-50 pt-0.5' : ''}>
              {unpaidExpenses.map((e) => (
                carriedToLabel !== null ? (
                  <CarriedExpenseRow key={e.id} expense={e} targetLabel={carriedToLabel} />
                ) : (
                  <MonthExpenseRow
                    key={e.id} expense={e} locked={expenseLocked(e)}
                    onMarkPaid={(id) => onMarkExpensePaid(id, bucket.year, bucket.month + 1)}
                    onUpdate={onUpdateExpense}
                    onDelete={onDeleteExpense}
                  />
                )
              ))}
            </div>
          )}

          {/* Paid income (collapsible) */}
          {hasPaidIncome && (
            <div className="border-t border-primary-50 pt-1">
              <button
                onClick={() => setShowPaidIncome((v) => !v)}
                className="flex items-center gap-1.5 py-1.5 text-xs text-primary-400 hover:text-primary-600 transition-colors"
              >
                <svg className={`h-3 w-3 transition-transform ${showPaidIncome ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
                {bucket.paidEntries.length} Einnahme{bucket.paidEntries.length !== 1 ? 'n' : ''} bezahlt
              </button>
              {showPaidIncome && bucket.paidEntries.map((e) => (
                <PaidIncomeRow
                  key={e.id} entry={e} locked={paidIncomeLocked(e)}
                  onUpdate={onUpdateIncome} onDelete={onDeleteIncome} onMarkUnpaid={onMarkIncomeUnpaid}
                />
              ))}
            </div>
          )}

          {/* Paid expenses (collapsible) */}
          {hasPaidExpenses && (
            <div className="border-t border-primary-50 pt-1">
              <button
                onClick={() => setShowPaidExpenses((v) => !v)}
                className="flex items-center gap-1.5 py-1.5 text-xs text-primary-400 hover:text-primary-600 transition-colors"
              >
                <svg className={`h-3 w-3 transition-transform ${showPaidExpenses ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
                {paidExpenses.length} Ausgabe{paidExpenses.length !== 1 ? 'n' : ''} bezahlt
              </button>
              {showPaidExpenses && paidExpenses.map((e) => (
                <PaidExpenseRow
                  key={e.id} expense={e} locked={paidExpenseLocked(e)}
                  onMarkUnpaid={(id) => onMarkExpenseUnpaid(bucket.paidExpenseMap[id])}
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
        locked={monthFullyLocked}
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
    months, pastMonths, expenses,
    startsaldo, startsaldoCurrency, startsaldoDate,
    paidIncomeSinceStart, paidExpensesSinceStart,
    effectiveBalance, effectiveBalanceDate,
    lastCorrection, lockDate, lockTs,
    loading,
    addIncome, updateIncome, deleteIncome, markIncomePaid, markIncomeUnpaid,
    addExpense, updateExpense, deleteExpense, toggleExpenseActive, markExpensePaid, markExpenseUnpaid,
    upsertStartsaldo, upsertEffectiveBalance, clearEffectiveBalance, acceptEffectiveBalance,
    upsertActualBalance, deleteActualBalance,
  } = useNOALiquidity();

  const [showIncomeForm, setShowIncomeForm]   = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPastMonths, setShowPastMonths]   = useState(false);

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
          {!loading && (
            <TagessaldoCard
              startsaldo={startsaldo}
              startsaldoDate={startsaldoDate}
              currency={startsaldoCurrency}
              correction={lastCorrection ? { balance: lastCorrection.balance, date: lastCorrection.correction_date } : null}
              paidIncome={paidIncomeSinceStart}
              paidExpenses={paidExpensesSinceStart}
              effectiveBalance={effectiveBalance}
              effectiveBalanceDate={effectiveBalanceDate}
              onSaveEffective={upsertEffectiveBalance}
              onClearEffective={clearEffectiveBalance}
              onAcceptDifference={acceptEffectiveBalance}
            />
          )}
          <StartsaldoCard startsaldo={startsaldo} startsaldoDate={startsaldoDate} currency={startsaldoCurrency} locked={lastCorrection !== null} onSave={upsertStartsaldo} />
          <ExpenseManagementCard
            expenses={expenses.filter((e) => e.type !== 'one_time')}
            onUpdate={updateExpense}
            onDelete={deleteExpense}
            onToggleActive={toggleExpenseActive}
          />
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
          {/* Past months — collapsed by default, newest first */}
          {pastMonths.length > 0 && (
            <div className="rounded-lg border border-primary-100 bg-primary-50/40 overflow-hidden">
              <button
                onClick={() => setShowPastMonths((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-primary-600">
                  Vergangene Monate
                  <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-500">
                    {pastMonths.length}
                  </span>
                </span>
                <svg className={`h-4 w-4 text-primary-400 transition-transform ${showPastMonths ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {showPastMonths && (
                <div className="space-y-2 border-t border-primary-100 p-2">
                  {[...pastMonths].reverse().map((bucket) => {
                    const key = `${bucket.year}-${String(bucket.month + 1).padStart(2, '0')}`;
                    return (
                      <MonthSection
                        key={key}
                        bucket={bucket}
                        isCurrentMonth={false}
                        balanceCurrency={startsaldoCurrency}
                        lockDate={lockDate}
                        lockTs={lockTs}
                        carriedToLabel={months[0]?.label ?? null}
                        onUpdateIncome={updateIncome}
                        onDeleteIncome={deleteIncome}
                        onMarkIncomePaid={markIncomePaid}
                        onMarkIncomeUnpaid={markIncomeUnpaid}
                        onMarkExpensePaid={markExpensePaid}
                        onMarkExpenseUnpaid={markExpenseUnpaid}
                        onUpdateExpense={updateExpense}
                        onDeleteExpense={deleteExpense}
                        onAddExpense={addExpense}
                        onUpsertActualBalance={upsertActualBalance}
                        onDeleteActualBalance={deleteActualBalance}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {months.map((bucket) => {
            const key = `${bucket.year}-${String(bucket.month + 1).padStart(2, '0')}`;
            return (
              <MonthSection
                key={key}
                bucket={bucket}
                isCurrentMonth={key === currentMonthKey}
                balanceCurrency={startsaldoCurrency}
                lockDate={lockDate}
                lockTs={lockTs}
                onUpdateIncome={updateIncome}
                onDeleteIncome={deleteIncome}
                onMarkIncomePaid={markIncomePaid}
                onMarkIncomeUnpaid={markIncomeUnpaid}
                onMarkExpensePaid={markExpensePaid}
                onMarkExpenseUnpaid={markExpenseUnpaid}
                onUpdateExpense={updateExpense}
                onDeleteExpense={deleteExpense}
                onAddExpense={addExpense}
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
