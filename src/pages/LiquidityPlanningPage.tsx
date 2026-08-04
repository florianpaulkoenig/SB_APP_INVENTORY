// ---------------------------------------------------------------------------
// Liquidity Planning — income, expenses, 12-month view with Saldo
// ---------------------------------------------------------------------------

import { useState, createContext, useContext } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '../lib/utils';
import { CURRENCIES } from '../lib/constants';
import { useNOALiquidity } from '../hooks/useNOALiquidity';
import type { MonthBucket, LateExpenseInstance } from '../hooks/useNOALiquidity';
import type { NOALiquidityIncomeRow, NOALiquidityExpenseRow, NOALiquidityExpensePaymentRow, NOALiquidityProjectRow, LiquidityExpenseType } from '../types/database';
import { LiquidityCashFlowChart } from '../components/liquidity/LiquidityCashFlowChart';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { exportLiquidityToExcel } from '../lib/liquidityExport';

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

// ---------------------------------------------------------------------------
// Project badge — prominent marker on every row that belongs to a project.
// Clicking it filters the month lists to that project (via context).
// ---------------------------------------------------------------------------

const ProjectFilterContext = createContext<(name: string) => void>(() => {});

function ProjectBadge({ name }: { name: string }) {
  const setFilter = useContext(ProjectFilterContext);
  return (
    <button
      type="button"
      onClick={() => setFilter(name)}
      className="inline-flex max-w-56 shrink-0 items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-200 transition-colors cursor-pointer"
      title={`Projekt: ${name} — klicken zum Filtern`}
    >
      <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
      <span className="truncate">{name}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Duplicate detection — warns while capturing when a similar OPEN entry exists
// ---------------------------------------------------------------------------

const DUP_STOPWORDS = new Set(['eine', 'einer', 'eines', 'für', 'from', 'nach', 'ohne', 'zahlung', 'rechnung']);

function significantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-zà-ÿäöü0-9]+/i)
    .filter((t) => t.length >= 4 && !DUP_STOPWORDS.has(t));
}

/** A similar open item: shares a significant word OR same amount in the same month */
function findSimilarOpen(
  description: string,
  amount: number,
  dateStr: string,
  candidates: { description: string; amount: number; date: string }[],
): { description: string; amount: number; date: string } | null {
  const tokens = new Set(significantTokens(description));
  const month = dateStr.slice(0, 7);
  for (const c of candidates) {
    const sharesToken = tokens.size > 0 && significantTokens(c.description).some((t) => tokens.has(t));
    const sameAmountMonth = amount > 0 && c.amount === amount && month.length === 7 && c.date.startsWith(month);
    if (sharesToken || sameAmountMonth) return c;
  }
  return null;
}

function DuplicateWarning({ match }: { match: { description: string; amount: number; date: string } | null }) {
  if (!match) return null;
  return (
    <div className="sm:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
      ⚠ Ähnlicher offener Eintrag existiert bereits: «{match.description}» ({match.amount.toLocaleString('de-CH')}, {formatDate(match.date)}) — bitte prüfen, ob es sich um eine Doppelerfassung handelt.
    </div>
  );
}

/** Positions are saved as "Projektname — Beschreibung"; with the badge shown,
 *  the prefix is redundant — strip it for display. */
function stripProjectPrefix(description: string, projectName?: string | null): string {
  if (projectName && description.startsWith(`${projectName} — `)) {
    return description.slice(projectName.length + 3);
  }
  return description;
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

const INCOME_REPEAT_OPTIONS = [
  { value: 'once',        label: 'Einmalig' },
  { value: 'monthly',     label: 'Monatlich' },
  { value: 'quarterly',   label: 'Pro Quartal' },
  { value: 'semi_annual', label: 'Pro Halbjahr' },
  { value: 'annual',      label: 'Pro Jahr' },
];

function AddIncomeForm({
  onSave, onCancel, existingOpen = [],
}: {
  onSave: (data: { description: string; amount: number; currency: string; expected_date: string; notes?: string | null; invoice_number?: string | null; provisional?: boolean; repeat?: { interval: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'; count: number } }) => Promise<boolean>;
  onCancel: () => void;
  /** Open entries for duplicate detection */
  existingOpen?: { description: string; amount: number; date: string }[];
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [currency, setCurrency]       = useState('CHF');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes]             = useState('');
  const [invoiceNo, setInvoiceNo]     = useState('');
  const [provisional, setProvisional] = useState(false);
  const [repeat, setRepeat]           = useState('once');
  const [repeatCount, setRepeatCount] = useState('12');
  const [saving, setSaving]           = useState(false);

  const dupMatch = description.trim().length >= 4 || amount
    ? findSimilarOpen(description, parseFloat(amount) || 0, expectedDate, existingOpen)
    : null;

  async function handleSubmit() {
    const n = parseFloat(amount);
    if (!description.trim() || isNaN(n) || n <= 0 || !expectedDate) return;
    const cnt = parseInt(repeatCount, 10);
    setSaving(true);
    const ok = await onSave({
      description: description.trim(), amount: n, currency, expected_date: expectedDate,
      notes: notes.trim() || null, invoice_number: invoiceNo.trim() || null, provisional,
      repeat: repeat !== 'once' && cnt > 1
        ? { interval: repeat as 'monthly' | 'quarterly' | 'semi_annual' | 'annual', count: cnt }
        : undefined,
    });
    setSaving(false);
    if (ok) { setDescription(''); setAmount(''); setExpectedDate(''); setNotes(''); setInvoiceNo(''); setProvisional(false); setRepeat('once'); setRepeatCount('12'); }
  }

  return (
    <div className="mb-6 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
      <h3 className="mb-4 text-sm font-semibold text-emerald-800">Neue Einnahme</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Beschreibung *" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="z. B. Provision Gallery X …" />
        </div>
        <DuplicateWarning match={dupMatch} />
        <Input label="Betrag *" type="number" min="0" step="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="z. B. 25000" />
        <Select label="Währung" options={CURRENCY_OPTIONS} value={currency} onChange={(e) => setCurrency(e.target.value)} />
        <Input label={repeat !== 'once' ? 'Erstes Datum *' : 'Erwartetes Datum *'} type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Wiederholung" options={INCOME_REPEAT_OPTIONS} value={repeat} onChange={(e) => setRepeat(e.target.value)} />
          {repeat !== 'once' && (
            <Input label="Anzahl Termine" type="number" min="2" max="36" value={repeatCount} onChange={(e) => setRepeatCount(e.target.value)} />
          )}
        </div>
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
  onSave, onCancel, existingOpen = [],
}: {
  onSave: (data: { description: string; amount: number; currency: string; type: LiquidityExpenseType; due_date: string; invoice_number?: string | null; provisional?: boolean }) => Promise<boolean>;
  onCancel: () => void;
  /** Open entries for duplicate detection */
  existingOpen?: { description: string; amount: number; date: string }[];
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
        <DuplicateWarning match={description.trim().length >= 4 || amount
          ? findSimilarOpen(description, parseFloat(amount) || 0, dueDate, existingOpen)
          : null} />
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
// Project form — capture a group of income & expense positions in one go
// ---------------------------------------------------------------------------

interface ProjectPositionDraft {
  kind: 'income' | 'expense';
  description: string;
  amount: string;
  currency: string;
  date: string;
  provisional: boolean;
}

const emptyPosition = (kind: 'income' | 'expense' = 'income'): ProjectPositionDraft =>
  ({ kind, description: '', amount: '', currency: 'CHF', date: '', provisional: false });

// Typical positions when an artwork is commissioned
const WERKBESTELLUNG_TEMPLATE: ProjectPositionDraft[] = [
  { ...emptyPosition('income'),  description: 'Anzahlung' },
  { ...emptyPosition('income'),  description: 'Abschlusszahlung' },
  { ...emptyPosition('income'),  description: 'Transporteinnahme' },
  { ...emptyPosition('expense'), description: 'Transportkosten' },
  { ...emptyPosition('expense'), description: 'Zahlung Künstler' },
];

const KIND_OPTIONS = [
  { value: 'income',  label: 'Einnahme' },
  { value: 'expense', label: 'Ausgabe' },
];

// Saved project templates — per browser (localStorage)
type SavedTemplate = { name: string; positions: ProjectPositionDraft[] };
const TEMPLATES_KEY = 'noa_liquidity_project_templates';

function loadTemplates(): SavedTemplate[] {
  try {
    const raw = JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function persistTemplates(templates: SavedTemplate[]) {
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates)); } catch { /* quota — ignore */ }
}

function AddProjectForm({
  onSave, onCancel, existingOpen = [],
}: {
  onSave: (data: {
    name: string;
    incomes:  { description: string; amount: number; currency: string; expected_date: string; provisional?: boolean }[];
    expenses: { description: string; amount: number; currency: string; due_date: string; provisional?: boolean }[];
  }) => Promise<boolean>;
  onCancel: () => void;
  /** Open entries for duplicate detection against the project name */
  existingOpen?: { description: string; amount: number; date: string }[];
}) {
  const [name, setName]           = useState('');
  const [positions, setPositions] = useState<ProjectPositionDraft[]>([emptyPosition()]);
  const [saving, setSaving]       = useState(false);
  const [templates, setTemplates] = useState<SavedTemplate[]>(loadTemplates);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName]     = useState('');

  const dupMatch = name.trim().length >= 4 ? findSimilarOpen(name, 0, '', existingOpen) : null;

  function saveAsTemplate() {
    const tName = templateName.trim();
    if (!tName) return;
    const next = [
      ...templates.filter((t) => t.name !== tName),
      { name: tName, positions: positions.map((p) => ({ ...p, amount: p.amount, date: '' })) },
    ];
    setTemplates(next);
    persistTemplates(next);
    setSavingTemplate(false);
    setTemplateName('');
  }

  function deleteTemplate(tName: string) {
    const next = templates.filter((t) => t.name !== tName);
    setTemplates(next);
    persistTemplates(next);
  }

  const setPos = (i: number, patch: Partial<ProjectPositionDraft>) =>
    setPositions((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const removePos = (i: number) => setPositions((ps) => ps.filter((_, j) => j !== i));

  // Rows the user actually filled in (empty leftover rows are ignored)
  const filled  = positions.filter((p) => p.description.trim() || p.amount || p.date);
  const invalid = filled.filter((p) => {
    const n = parseFloat(p.amount);
    return isNaN(n) || n <= 0 || !p.date;
  });
  const canSave = name.trim().length > 0 && filled.length > 0 && invalid.length === 0;

  async function handleSubmit() {
    if (!canSave) return;
    setSaving(true);
    const ok = await onSave({
      name: name.trim(),
      incomes: filled.filter((p) => p.kind === 'income').map((p) => ({
        description:   p.description,
        amount:        parseFloat(p.amount),
        currency:      p.currency,
        expected_date: p.date,
        provisional:   p.provisional,
      })),
      expenses: filled.filter((p) => p.kind === 'expense').map((p) => ({
        description: p.description,
        amount:      parseFloat(p.amount),
        currency:    p.currency,
        due_date:    p.date,
        provisional: p.provisional,
      })),
    });
    setSaving(false);
    if (ok) { setName(''); setPositions([emptyPosition()]); }
  }

  return (
    <div className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-indigo-800">Neues Projekt</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setPositions(WERKBESTELLUNG_TEMPLATE.map((p) => ({ ...p })))}
            className="rounded border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
            title="Anzahlung, Abschlusszahlung, Transporteinnahme, Transportkosten, Zahlung Künstler"
          >
            Vorlage Werkbestellung
          </button>
          {templates.map((t) => (
            <span key={t.name} className="inline-flex items-center rounded border border-indigo-200 text-xs font-medium text-indigo-600">
              <button
                onClick={() => setPositions(t.positions.map((p) => ({ ...p })))}
                className="px-2 py-1 hover:bg-indigo-100 transition-colors"
                title={`Vorlage «${t.name}» laden (${t.positions.length} Positionen)`}
              >
                {t.name}
              </button>
              <button
                onClick={() => deleteTemplate(t.name)}
                className="px-1 py-1 text-indigo-300 hover:text-red-500 transition-colors"
                aria-label={`Vorlage ${t.name} löschen`}
                title="Vorlage löschen"
              >
                ✕
              </button>
            </span>
          ))}
          {savingTemplate ? (
            <span className="inline-flex items-center gap-1">
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveAsTemplate(); if (e.key === 'Escape') setSavingTemplate(false); }}
                placeholder="Vorlagenname"
                autoFocus
                className="w-36 rounded border border-indigo-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"
              />
              <button onClick={saveAsTemplate} disabled={!templateName.trim()} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40">Speichern</button>
              <button onClick={() => setSavingTemplate(false)} className="text-xs text-primary-400 hover:text-primary-600">✕</button>
            </span>
          ) : (
            <button
              onClick={() => setSavingTemplate(true)}
              className="rounded px-2 py-1 text-xs text-indigo-400 hover:text-indigo-700 transition-colors"
              title="Aktuelle Positionen (ohne Daten) als eigene Vorlage speichern — pro Gerät gespeichert"
            >
              + Als Vorlage speichern
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <Input
          label="Projektname *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. David Cerdy — Comm. Selbstportrait 150/150 cm"
        />
        <p className="mt-1 text-xs text-primary-400">
          Der Projektname wird jeder Position vorangestellt. Positionen erscheinen einzeln
          in den Monaten und können einzeln bezahlt werden; das Projekt lässt sich als
          Ganzes löschen.
        </p>
        {dupMatch && (
          <div className="mt-2">
            <DuplicateWarning match={dupMatch} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        {positions.map((p, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 rounded border border-indigo-100/80 bg-white p-2">
            <div className="w-28">
              <Select label="Art" options={KIND_OPTIONS} value={p.kind} onChange={(e) => setPos(i, { kind: e.target.value as 'income' | 'expense' })} />
            </div>
            <div className="min-w-40 flex-1">
              <Input label="Beschreibung" value={p.description} onChange={(e) => setPos(i, { description: e.target.value })} placeholder="z. B. Anzahlung" />
            </div>
            <div className="w-28">
              <Input label="Betrag *" type="number" min="0" step="100" value={p.amount} onChange={(e) => setPos(i, { amount: e.target.value })} />
            </div>
            <div className="w-24">
              <Select label="Währung" options={CURRENCY_OPTIONS} value={p.currency} onChange={(e) => setPos(i, { currency: e.target.value })} />
            </div>
            <div className="w-36">
              <Input label="Datum *" type="date" value={p.date} onChange={(e) => setPos(i, { date: e.target.value })} />
            </div>
            <label className="mb-2 flex items-center gap-1.5 text-xs text-primary-600 cursor-pointer select-none" title="Provisorisch — zählt nur zur provisorischen Kurve">
              <input
                type="checkbox"
                checked={p.provisional}
                onChange={(e) => setPos(i, { provisional: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-primary-300 accent-amber-600"
              />
              Prov.
            </label>
            <button
              onClick={() => removePos(i)}
              className="mb-1.5 p-1 text-primary-300 hover:text-red-400 transition-colors"
              aria-label="Position entfernen"
              title="Position entfernen"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setPositions((ps) => [...ps, emptyPosition()])}
        className="mt-2 flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Position hinzufügen
      </button>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={handleSubmit} loading={saving} disabled={!canSave}>Projekt speichern</Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Abbrechen</Button>
        {invalid.length > 0 && (
          <span className="text-xs text-red-500">Jede Position braucht Betrag und Datum.</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Projects panel — grouped view of all project positions with paid status
// ---------------------------------------------------------------------------

function ProjectPositionForm({
  onSave, onCancel,
}: {
  onSave: (position: { kind: 'income' | 'expense'; description: string; amount: number; currency: string; date: string; provisional?: boolean }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [pos, setPos]       = useState<ProjectPositionDraft>(emptyPosition());
  const [saving, setSaving] = useState(false);

  const n = parseFloat(pos.amount);
  const canSave = !isNaN(n) && n > 0 && !!pos.date;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const ok = await onSave({
      kind: pos.kind, description: pos.description, amount: n,
      currency: pos.currency, date: pos.date, provisional: pos.provisional,
    });
    setSaving(false);
    if (ok) onCancel();
  }

  return (
    <div className="flex flex-wrap items-end gap-2 border-t border-primary-50 bg-indigo-50/40 px-3 py-2">
      <div className="w-28">
        <Select label="Art" options={KIND_OPTIONS} value={pos.kind} onChange={(e) => setPos({ ...pos, kind: e.target.value as 'income' | 'expense' })} />
      </div>
      <div className="min-w-36 flex-1">
        <Input label="Beschreibung" value={pos.description} onChange={(e) => setPos({ ...pos, description: e.target.value })} placeholder="z. B. Nachlieferung" />
      </div>
      <div className="w-28">
        <Input label="Betrag *" type="number" min="0" step="100" value={pos.amount} onChange={(e) => setPos({ ...pos, amount: e.target.value })} />
      </div>
      <div className="w-24">
        <Select label="Währung" options={CURRENCY_OPTIONS} value={pos.currency} onChange={(e) => setPos({ ...pos, currency: e.target.value })} />
      </div>
      <div className="w-36">
        <Input label="Datum *" type="date" value={pos.date} onChange={(e) => setPos({ ...pos, date: e.target.value })} />
      </div>
      <label className="mb-2 flex items-center gap-1.5 text-xs text-primary-600 cursor-pointer select-none">
        <input type="checkbox" checked={pos.provisional} onChange={(e) => setPos({ ...pos, provisional: e.target.checked })} className="h-3.5 w-3.5 rounded border-primary-300 accent-amber-600" />
        Prov.
      </label>
      <div className="mb-1 flex items-center gap-2">
        <Button size="sm" onClick={handleSave} loading={saving} disabled={!canSave}>Hinzufügen</Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function ProjectsPanel({
  projects, incomes, expenses, expensePayments, onDeleteProject, onRenameProject, onAddPosition,
}: {
  projects: NOALiquidityProjectRow[];
  incomes: NOALiquidityIncomeRow[];
  expenses: NOALiquidityExpenseRow[];
  expensePayments: NOALiquidityExpensePaymentRow[];
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => Promise<boolean>;
  onAddPosition: (project: NOALiquidityProjectRow, position: { kind: 'income' | 'expense'; description: string; amount: number; currency: string; date: string; provisional?: boolean }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [renamingId, setRenamingId]     = useState<string | null>(null);
  const [renameValue, setRenameValue]   = useState('');
  const [addingToId, setAddingToId]     = useState<string | null>(null);
  const { toCHF } = useExchangeRates();

  if (projects.length === 0) return null;

  const expensePaid = (expenseId: string) =>
    expensePayments.some((p) => p.expense_id === expenseId && !p.skipped);

  return (
    <div className="mb-6 rounded-lg border border-primary-100 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-primary-50/60 transition-colors"
      >
        <span className="text-sm font-semibold text-primary-600">
          Projekte
          <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-500">
            {projects.length}
          </span>
        </span>
        <svg className={`h-4 w-4 text-primary-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="space-y-3 border-t border-primary-100 p-3">
          {projects.map((project) => {
            const projIncomes  = incomes.filter((e) => e.project_id === project.id);
            const projExpenses = expenses.filter((e) => e.project_id === project.id);
            const items = [
              ...projIncomes.map((e) => ({
                key:  `i:${e.id}`,
                kind: 'income' as const,
                description: e.description,
                amount: e.amount,
                currency: e.currency,
                date: e.expected_date,
                provisional: !!e.provisional,
                paid: e.paid_at !== null,
              })),
              ...projExpenses.map((e) => ({
                key:  `e:${e.id}`,
                kind: 'expense' as const,
                description: e.description,
                amount: e.amount,
                currency: e.currency,
                date: e.due_date ?? '',
                provisional: !!e.provisional,
                paid: expensePaid(e.id),
              })),
            ].sort((a, b) => a.date.localeCompare(b.date));

            const openIncome  = projIncomes.filter((e) => !e.paid_at).reduce((s, e) => s + toCHF(e.amount, e.currency), 0);
            const openExpense = projExpenses.filter((e) => !expensePaid(e.id)).reduce((s, e) => s + toCHF(e.amount, e.currency), 0);

            return (
              <div key={project.id} className="rounded-lg border border-primary-100">
                <div className="flex items-center gap-3 border-b border-primary-50 px-3 py-2.5">
                  {renamingId === project.id ? (
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && renameValue.trim()) {
                            const ok = await onRenameProject(project.id, renameValue);
                            if (ok) setRenamingId(null);
                          }
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        autoFocus
                        className="min-w-0 flex-1 rounded border border-primary-200 px-2 py-1 text-sm focus:border-primary-400 focus:outline-none"
                      />
                      <button
                        onClick={async () => { const ok = await onRenameProject(project.id, renameValue); if (ok) setRenamingId(null); }}
                        disabled={!renameValue.trim()}
                        className="text-xs font-medium text-primary-600 hover:text-primary-900 disabled:opacity-40"
                      >
                        Speichern
                      </button>
                      <button onClick={() => setRenamingId(null)} className="text-xs text-primary-400 hover:text-primary-600">✕</button>
                    </span>
                  ) : (
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span className="min-w-0 truncate text-sm font-semibold text-primary-900">{project.name}</span>
                      <button
                        onClick={() => { setRenamingId(project.id); setRenameValue(project.name); }}
                        className="shrink-0 p-0.5 text-primary-300 hover:text-primary-600 transition-colors"
                        aria-label="Projekt umbenennen"
                        title="Projekt umbenennen (Präfix aller Positionen wird angepasst)"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-primary-400 tabular-nums" title="Noch offene Einnahmen / Ausgaben (in CHF)">
                    offen +{formatCurrency(openIncome, 'CHF')} / -{formatCurrency(openExpense, 'CHF')}
                  </span>
                  <button
                    onClick={() => setAddingToId(addingToId === project.id ? null : project.id)}
                    className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    title="Position zu diesem Projekt hinzufügen"
                  >
                    + Position
                  </button>
                  {confirmingId === project.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { onDeleteProject(project.id); setConfirmingId(null); }}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        {items.length} Position{items.length !== 1 ? 'en' : ''} löschen
                      </button>
                      <button onClick={() => setConfirmingId(null)} className="text-xs text-primary-400 hover:text-primary-600">Nein</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingId(project.id)}
                      className="p-1 text-primary-300 hover:text-red-400 transition-colors shrink-0"
                      aria-label="Projekt löschen"
                      title="Projekt inkl. aller Positionen löschen"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>

                {addingToId === project.id && (
                  <ProjectPositionForm
                    onSave={(position) => onAddPosition(project, position)}
                    onCancel={() => setAddingToId(null)}
                  />
                )}

                <div className="px-3 py-1">
                  {items.map((item) => (
                    <div key={item.key} className={`flex items-center gap-2 py-1.5 border-b border-primary-50 last:border-0 ${item.paid ? 'opacity-60' : ''}`}>
                      {item.paid ? (
                        <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" aria-label="Bezahlt">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-primary-200" title="Offen" />
                      )}
                      <span className="w-20 shrink-0 text-xs text-primary-400 tabular-nums">
                        {item.date ? formatDate(item.date) : '—'}
                      </span>
                      {item.provisional && <ProvBadge />}
                      <span className={`min-w-0 flex-1 truncate text-sm ${item.paid ? 'text-primary-400 line-through' : 'text-primary-800'}`}>
                        {stripProjectPrefix(item.description, project.name)}
                      </span>
                      <span className={`shrink-0 text-sm font-medium tabular-nums ${item.kind === 'income' ? 'text-emerald-700' : 'text-red-500'}`}>
                        {item.kind === 'income' ? '+' : '-'}{formatCurrency(item.amount, item.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
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
  fromPastMonth = false,
  locked = false,
  projectName = null,
  onUpdate,
  onDelete,
  onMarkPaid,
  onPartialPaid,
}: {
  entry: NOALiquidityIncomeRow;
  isLate?: boolean;
  /** Provisional entry carried over from a past month (not überfällig) */
  fromPastMonth?: boolean;
  /** Name of the project this entry belongs to (renders a badge) */
  projectName?: string | null;
  /** Locked by a Saldokorrektur: no edit/delete — settling (Bezahlt) stays possible */
  locked?: boolean;
  onUpdate: (id: string, data: { description: string; amount: number; currency: string; expected_date: string; notes?: string | null }) => Promise<boolean>;
  onDelete: (id: string) => void;
  onMarkPaid: (id: string) => void;
  /** Enables the Teilzahlung action: books part of the amount as paid */
  onPartialPaid?: (id: string, amount: number) => void;
}) {
  const [editing, setEditing]       = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [partialMode, setPartialMode]     = useState(false);
  const [partialAmount, setPartialAmount] = useState('');

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

      {/* Carried-from-past badge — provisional items are never überfällig */}
      {fromPastMonth && (
        <span
          className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-500"
          title="Provisorisch — aus Vormonat übertragen"
        >
          aus Vormonat
        </span>
      )}

      {/* Date */}
      <span className={`w-20 shrink-0 text-xs tabular-nums ${isLate ? 'text-red-400' : 'text-primary-400'}`}>
        {formatDate(entry.expected_date)}
      </span>

      {projectName && <ProjectBadge name={projectName} />}
      {entry.provisional && <ProvBadge />}

      {/* Description + notes */}
      <div className="min-w-0 flex-1">
        <span className={`text-sm ${isLate ? 'font-medium text-red-700' : 'text-primary-900'}`}>
          {stripProjectPrefix(entry.description, projectName)}
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

        {/* Partial payment */}
        {onPartialPaid && (
          partialMode ? (
            <span className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max={entry.amount}
                step="100"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                onKeyDown={(e) => {
                  const n = parseFloat(partialAmount);
                  if (e.key === 'Enter' && n > 0 && n < entry.amount) { onPartialPaid(entry.id, n); setPartialMode(false); setPartialAmount(''); }
                  if (e.key === 'Escape') setPartialMode(false);
                }}
                placeholder="Betrag"
                autoFocus
                className="w-24 rounded border border-emerald-200 px-2 py-1 text-xs tabular-nums focus:border-emerald-400 focus:outline-none"
              />
              <button
                onClick={() => {
                  const n = parseFloat(partialAmount);
                  if (n > 0 && n < entry.amount) { onPartialPaid(entry.id, n); setPartialMode(false); setPartialAmount(''); }
                }}
                disabled={!(parseFloat(partialAmount) > 0 && parseFloat(partialAmount) < entry.amount)}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-40"
              >
                OK
              </button>
              <button onClick={() => setPartialMode(false)} className="text-xs text-primary-400 hover:text-primary-600">✕</button>
            </span>
          ) : (
            <button
              onClick={() => setPartialMode(true)}
              className="rounded px-1.5 py-1 text-xs text-emerald-600/70 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
              title="Teilzahlung erfassen — Teilbetrag wird bezahlt, Rest bleibt offen"
            >
              Teilz.
            </button>
          )
        )}

        {/* Edit — hidden when locked by a Saldokorrektur */}
        {!locked && (
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-primary-300 hover:text-primary-600 transition-colors"
            title="Bearbeiten"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </button>
        )}

        {/* Delete/Storno — locked entries stay deletable while überfällig or
            carried over: cancelling an open item never moves booked money */}
        {(!locked || isLate || fromPastMonth) && (
          confirming ? (
            <div className="flex items-center gap-1">
              <button onClick={() => onDelete(entry.id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Löschen</button>
              <button onClick={() => setConfirming(false)} className="text-xs text-primary-400 hover:text-primary-600">Nein</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="p-1 text-primary-300 hover:text-red-400 transition-colors"
              aria-label="Löschen"
              title="Stornieren / löschen"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )
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
  entry, targetLabel, projectName = null,
}: {
  entry: NOALiquidityIncomeRow;
  targetLabel: string;
  projectName?: string | null;
}) {
  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-primary-50 last:border-0 opacity-60">
      <span className="w-20 shrink-0 text-xs text-primary-300 tabular-nums">{formatDate(entry.expected_date)}</span>
      {projectName && <ProjectBadge name={projectName} />}
      {entry.provisional && <ProvBadge />}
      <div className="min-w-0 flex-1">
        <span className="text-sm text-primary-400">{stripProjectPrefix(entry.description, projectName)}</span>
        {entry.notes && <span className="ml-2 text-xs text-primary-300">{entry.notes}</span>}
        {entry.invoice_number && <span className="ml-2 text-xs text-primary-300 tabular-nums">Rg. {entry.invoice_number}</span>}
      </div>
      <span
        className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-500"
        title={entry.provisional
          ? `Provisorisch — wird in ${targetLabel} provisorisch weitergeführt`
          : `Offen — wird in ${targetLabel} als überfällig geführt`}
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
  expense, targetLabel, projectName = null,
}: {
  expense: NOALiquidityExpenseRow;
  targetLabel: string;
  projectName?: string | null;
}) {
  const badge = RECURRENCE_BADGES[expense.type];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-primary-50 last:border-0 opacity-60">
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
      {projectName && <ProjectBadge name={projectName} />}
      {expense.provisional && <ProvBadge />}
      <span className="min-w-0 flex-1 text-sm text-primary-400">
        {stripProjectPrefix(expense.description, projectName)}
        {expense.invoice_number && <span className="ml-2 text-xs text-primary-300 tabular-nums">Rg. {expense.invoice_number}</span>}
      </span>
      <span
        className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-500"
        title={expense.provisional
          ? `Provisorisch — wird in ${targetLabel} provisorisch weitergeführt`
          : `Offen — wird in ${targetLabel} als überfällig geführt`}
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
  projectName = null,
  onUpdate,
  onDelete,
  onMarkUnpaid,
}: {
  entry: NOALiquidityIncomeRow;
  /** Locked by a Saldokorrektur: paid state and data are final */
  locked?: boolean;
  projectName?: string | null;
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

      {projectName && <ProjectBadge name={projectName} />}
      {entry.provisional && <ProvBadge />}

      {/* Description */}
      <div className="min-w-0 flex-1">
        <span className="text-sm text-primary-600 line-through">{stripProjectPrefix(entry.description, projectName)}</span>
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
  expense, locked = false, projectName = null, onMarkPaid, onUpdate, onDelete,
}: {
  expense: NOALiquidityExpenseRow;
  /** Locked by a Saldokorrektur: no edit/delete — settling (Bezahlt) stays possible */
  locked?: boolean;
  projectName?: string | null;
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
      {projectName && <ProjectBadge name={projectName} />}
      {expense.provisional && <ProvBadge />}
      <span className="min-w-0 flex-1 text-sm text-primary-700">
        {stripProjectPrefix(expense.description, projectName)}
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
  instance, projectName = null, onMarkPaid, onCancel,
}: {
  instance: LateExpenseInstance;
  projectName?: string | null;
  onMarkPaid: (expenseId: string, year: number, month: number) => void;
  /** Storno: one_time → delete the expense, recurring → skip this instance */
  onCancel: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
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
      {projectName && <ProjectBadge name={projectName} />}
      {e.provisional && <ProvBadge />}
      <span className="min-w-0 flex-1 text-sm font-medium text-red-700">
        {stripProjectPrefix(e.description, projectName)}
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
      {confirming ? (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onCancel} className="text-xs text-red-600 hover:text-red-800 font-medium">Stornieren</button>
          <button onClick={() => setConfirming(false)} className="text-xs text-primary-400 hover:text-primary-600">Nein</button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="p-1 text-primary-300 hover:text-red-400 transition-colors shrink-0"
          aria-label="Stornieren"
          title={e.type === 'one_time'
            ? 'Stornieren — Ausgabe wird gelöscht'
            : `Stornieren — nur die Fälligkeit ${originLabel} entfällt`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provisional carry expense row — provisional unpaid instance from a past
// month, carried into the current month (stays provisional, not überfällig)
// ---------------------------------------------------------------------------

function ProvCarryExpenseRow({
  instance, projectName = null, onMarkPaid, onCancel,
}: {
  instance: LateExpenseInstance;
  projectName?: string | null;
  onMarkPaid: (expenseId: string, year: number, month: number) => void;
  /** Storno: one_time → delete the expense, recurring → skip this instance */
  onCancel: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const e = instance.expense;
  const badge = RECURRENCE_BADGES[e.type];
  const originLabel = new Date(instance.year, instance.month - 1, 1)
    .toLocaleDateString('de-CH', { month: 'long', year: 'numeric' });

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-primary-50 last:border-0">
      <span
        className="shrink-0 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-500"
        title="Provisorisch — aus Vormonat übertragen"
      >
        aus Vormonat
      </span>
      <span className="w-28 shrink-0 text-xs text-primary-400">{originLabel}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
      {projectName && <ProjectBadge name={projectName} />}
      <ProvBadge />
      <span className="min-w-0 flex-1 text-sm text-primary-900">
        {stripProjectPrefix(e.description, projectName)}
        {e.invoice_number && <span className="ml-2 text-xs font-normal text-primary-400 tabular-nums">Rg. {e.invoice_number}</span>}
      </span>
      <span className="shrink-0 text-sm font-medium text-red-500 tabular-nums">
        -{formatCurrency(e.amount, e.currency)}
      </span>
      <button
        onClick={() => onMarkPaid(e.id, instance.year, instance.month)}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary-400 hover:bg-primary-50 hover:text-primary-700 transition-colors shrink-0"
        title={`Als bezahlt markieren (wird ${originLabel} zugeordnet)`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Bezahlt
      </button>
      {confirming ? (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onCancel} className="text-xs text-red-600 hover:text-red-800 font-medium">Stornieren</button>
          <button onClick={() => setConfirming(false)} className="text-xs text-primary-400 hover:text-primary-600">Nein</button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="p-1 text-primary-300 hover:text-red-400 transition-colors shrink-0"
          aria-label="Stornieren"
          title={e.type === 'one_time'
            ? 'Stornieren — Ausgabe wird gelöscht'
            : `Stornieren — nur die Fälligkeit ${originLabel} entfällt`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expense row inside month section — paid
// ---------------------------------------------------------------------------

function PaidExpenseRow({
  expense, locked = false, projectName = null, onMarkUnpaid,
}: {
  expense: NOALiquidityExpenseRow;
  /** Locked by a Saldokorrektur: paid state is final */
  locked?: boolean;
  projectName?: string | null;
  onMarkUnpaid: (expenseId: string) => void;
}) {
  const badge = RECURRENCE_BADGES[expense.type];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-primary-50 last:border-0 opacity-60">
      <svg className="h-3.5 w-3.5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
      {projectName && <ProjectBadge name={projectName} />}
      {expense.provisional && <ProvBadge />}
      <span className="min-w-0 flex-1 text-sm text-primary-500 line-through">
        {stripProjectPrefix(expense.description, projectName)}
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
  const { toCHF } = useExchangeRates();

  // Sum ALL income (unpaid + late + paid) in CHF — split into definitive
  // (without provisional items) and incl.-provisional totals
  const allIncome = [...bucket.entries, ...bucket.lateEntries, ...bucket.provCarryIncome, ...bucket.paidEntries];
  const chfSum = (arr: { amount: number; currency: string }[]) =>
    arr.reduce((s, e) => s + toCHF(e.amount, e.currency), 0);
  const incomeProv  = chfSum(allIncome);
  const incomeDef   = chfSum(allIncome.filter((e) => !e.provisional));
  const expenseProv = chfSum(bucket.expenses)
                    + chfSum(bucket.lateExpenses.map((le) => le.expense))
                    + chfSum(bucket.provCarryExpenses.map((le) => le.expense));
  const expenseDef  = chfSum(bucket.expenses.filter((e) => !e.provisional))
                    + chfSum(bucket.lateExpenses.map((le) => le.expense).filter((e) => !e.provisional));
  const netDef  = incomeDef - expenseDef;
  const netProv = incomeProv - expenseProv;

  return (
    <div className="grid grid-cols-3 divide-x divide-primary-100 border-t border-primary-100 bg-primary-50/60">
      {/* Einnahmen */}
      <div className="px-4 py-3">
        <p className="text-xs text-primary-400 mb-1">Einnahmen</p>
        <p className={`text-base font-semibold tabular-nums ${incomeDef > 0 ? 'text-emerald-700' : 'text-primary-300'}`}>
          {incomeDef > 0 ? '+' : ''}{formatCurrency(incomeDef, currency)}
        </p>
        {incomeProv !== incomeDef && (
          <p className="text-xs text-amber-600 tabular-nums" title="Inklusive provisorischer Positionen">
            prov. {incomeProv > 0 ? '+' : ''}{formatCurrency(incomeProv, currency)}
          </p>
        )}
      </div>

      {/* Ausgaben */}
      <div className="px-4 py-3">
        <p className="text-xs text-primary-400 mb-1">Ausgaben</p>
        <p className={`text-base font-semibold tabular-nums ${expenseDef > 0 ? 'text-red-500' : 'text-primary-300'}`}>
          {expenseDef > 0 ? '-' : ''}{formatCurrency(expenseDef, currency)}
        </p>
        {expenseProv !== expenseDef && (
          <p className="text-xs text-amber-600 tabular-nums" title="Inklusive provisorischer Positionen">
            prov. -{formatCurrency(expenseProv, currency)}
          </p>
        )}
      </div>

      {/* Netto */}
      <div className="px-4 py-3">
        <p className="text-xs text-primary-400 mb-1">Netto</p>
        <p className={`text-base font-semibold tabular-nums ${netDef > 0 ? 'text-primary-800' : netDef < 0 ? 'text-red-600' : 'text-primary-300'}`}>
          {netDef !== 0 ? (netDef > 0 ? '+' : '') : ''}{formatCurrency(netDef, currency)}
        </p>
        {netProv !== netDef && (
          <p className="text-xs text-amber-600 tabular-nums" title="Inklusive provisorischer Positionen">
            prov. {netProv > 0 ? '+' : ''}{formatCurrency(netProv, currency)}
          </p>
        )}
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
  projectNames = {},
  onUpdateIncome,
  onDeleteIncome,
  onMarkIncomePaid,
  onPartialIncomePaid,
  onMarkIncomeUnpaid,
  onMarkExpensePaid,
  onMarkExpenseUnpaid,
  onCancelExpenseInstance,
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
  /** project_id → project name, for the project badges on rows */
  projectNames?: Record<string, string>;
  onUpdateIncome: (id: string, data: { description: string; amount: number; currency: string; expected_date: string; notes?: string | null }) => Promise<boolean>;
  onDeleteIncome: (id: string) => void;
  onMarkIncomePaid: (id: string) => void;
  onPartialIncomePaid?: (id: string, amount: number) => void;
  onMarkIncomeUnpaid: (id: string) => void;
  onMarkExpensePaid: (expenseId: string, year: number, month: number) => void;
  onMarkExpenseUnpaid: (paymentId: string) => void;
  /** Storno an overdue/carried expense instance (one_time → delete, recurring → skip) */
  onCancelExpenseInstance: (expense: NOALiquidityExpenseRow, year: number, month: number) => void;
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

  const projName = (pid?: string | null) => (pid ? projectNames[pid] ?? null : null);

  const hasUnpaid        = bucket.entries.length > 0;
  const hasLate          = bucket.lateEntries.length > 0;
  const hasLateExpenses  = bucket.lateExpenses.length > 0;
  const hasProvCarryInc  = bucket.provCarryIncome.length > 0;
  const hasProvCarryExp  = bucket.provCarryExpenses.length > 0;
  const hasPaidIncome    = bucket.paidEntries.length > 0;
  const hasPaidExpenses  = paidExpenses.length > 0;
  const hasExpenses      = bucket.expenses.length > 0;
  const hasAny           = hasUnpaid || hasLate || hasLateExpenses || hasProvCarryInc || hasProvCarryExp || hasPaidIncome || hasExpenses;
  const lateCount        = bucket.lateEntries.length + bucket.lateExpenses.length;

  // ---- Definitiv/Provisorisch split of the month's open positions ----------
  const defIncome     = bucket.entries.filter((e) => !e.provisional);
  const provIncome    = bucket.entries.filter((e) =>  e.provisional);
  const defExpenses   = unpaidExpenses.filter((e) => !e.provisional);
  const provExpenses  = unpaidExpenses.filter((e) =>  e.provisional);
  const hasDefSection  = defIncome.length > 0 || defExpenses.length > 0;
  const hasProvSection = provIncome.length > 0 || provExpenses.length > 0 || hasProvCarryInc || hasProvCarryExp;

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
                  key={e.id} entry={e} isLate locked={incomeLocked(e)} projectName={projName(e.project_id)}
                  onUpdate={onUpdateIncome} onDelete={onDeleteIncome} onMarkPaid={onMarkIncomePaid}
                  onPartialPaid={onPartialIncomePaid}
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
                  projectName={projName(le.expense.project_id)}
                  onMarkPaid={onMarkExpensePaid}
                  onCancel={() => onCancelExpenseInstance(le.expense, le.year, le.month)}
                />
              ))}
            </div>
          )}

          {/* Definitive Positionen des Monats */}
          {hasDefSection && (
            <div className={hasLate || hasLateExpenses ? 'border-t border-primary-50 pt-0.5' : ''}>
              {hasProvSection && (
                <p className="pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-400">
                  Definitiv
                </p>
              )}
              {defIncome.map((e) => (
                carriedToLabel !== null ? (
                  <CarriedIncomeRow key={e.id} entry={e} targetLabel={carriedToLabel} projectName={projName(e.project_id)} />
                ) : (
                  <IncomeEntryRow
                    key={e.id} entry={e} locked={incomeLocked(e)} projectName={projName(e.project_id)}
                    onUpdate={onUpdateIncome} onDelete={onDeleteIncome} onMarkPaid={onMarkIncomePaid}
                    onPartialPaid={onPartialIncomePaid}
                  />
                )
              ))}
              {defExpenses.map((e) => (
                carriedToLabel !== null ? (
                  <CarriedExpenseRow key={e.id} expense={e} targetLabel={carriedToLabel} projectName={projName(e.project_id)} />
                ) : (
                  <MonthExpenseRow
                    key={e.id} expense={e} locked={expenseLocked(e)} projectName={projName(e.project_id)}
                    onMarkPaid={(id) => onMarkExpensePaid(id, bucket.year, bucket.month + 1)}
                    onUpdate={onUpdateExpense}
                    onDelete={onDeleteExpense}
                  />
                )
              ))}
            </div>
          )}

          {/* Provisorische Positionen — inkl. Überträge aus Vormonaten */}
          {hasProvSection && (
            <div className="my-1.5 rounded-md bg-amber-50/60 px-2">
              <p className="pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                Provisorisch
              </p>
              {bucket.provCarryIncome.map((e) => (
                <IncomeEntryRow
                  key={e.id} entry={e} fromPastMonth locked={incomeLocked(e)} projectName={projName(e.project_id)}
                  onUpdate={onUpdateIncome} onDelete={onDeleteIncome} onMarkPaid={onMarkIncomePaid}
                  onPartialPaid={onPartialIncomePaid}
                />
              ))}
              {bucket.provCarryExpenses.map((le) => (
                <ProvCarryExpenseRow
                  key={`${le.expense.id}:${le.year}-${le.month}`}
                  instance={le}
                  projectName={projName(le.expense.project_id)}
                  onMarkPaid={onMarkExpensePaid}
                  onCancel={() => onCancelExpenseInstance(le.expense, le.year, le.month)}
                />
              ))}
              {provIncome.map((e) => (
                carriedToLabel !== null ? (
                  <CarriedIncomeRow key={e.id} entry={e} targetLabel={carriedToLabel} projectName={projName(e.project_id)} />
                ) : (
                  <IncomeEntryRow
                    key={e.id} entry={e} locked={incomeLocked(e)} projectName={projName(e.project_id)}
                    onUpdate={onUpdateIncome} onDelete={onDeleteIncome} onMarkPaid={onMarkIncomePaid}
                    onPartialPaid={onPartialIncomePaid}
                  />
                )
              ))}
              {provExpenses.map((e) => (
                carriedToLabel !== null ? (
                  <CarriedExpenseRow key={e.id} expense={e} targetLabel={carriedToLabel} projectName={projName(e.project_id)} />
                ) : (
                  <MonthExpenseRow
                    key={e.id} expense={e} locked={expenseLocked(e)} projectName={projName(e.project_id)}
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
                  key={e.id} entry={e} locked={paidIncomeLocked(e)} projectName={projName(e.project_id)}
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
                  key={e.id} expense={e} locked={paidExpenseLocked(e)} projectName={projName(e.project_id)}
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
    months, pastMonths, expenses, incomes, expensePayments, projects,
    startsaldo, startsaldoCurrency, startsaldoDate,
    paidIncomeSinceStart, paidExpensesSinceStart,
    effectiveBalance, effectiveBalanceDate,
    lastCorrection, lockDate, lockTs,
    loading,
    addIncome, updateIncome, deleteIncome, markIncomePaid, markIncomeUnpaid, recordPartialIncomePayment,
    addExpense, updateExpense, deleteExpense, toggleExpenseActive, markExpensePaid, markExpenseUnpaid,
    skipExpenseInstance,
    addProject, deleteProject, renameProject, addProjectPosition,
    upsertStartsaldo, upsertEffectiveBalance, clearEffectiveBalance, acceptEffectiveBalance,
    upsertActualBalance, deleteActualBalance,
  } = useNOALiquidity();

  // Storno of an overdue/carried expense instance: a one_time expense IS its
  // single instance (delete it); for recurring ones only this Fälligkeit
  // is skipped — future instances stay planned.
  const cancelExpenseInstance = (expense: NOALiquidityExpenseRow, year: number, month: number) => {
    if (expense.type === 'one_time') {
      deleteExpense(expense.id);
    } else {
      skipExpenseInstance(expense.id, year, month);
    }
  };

  const [showIncomeForm, setShowIncomeForm]   = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showPastMonths, setShowPastMonths]   = useState(false);

  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // project_id → name, for the project badges on all rows
  const projectNames: Record<string, string> = {};
  for (const p of projects) projectNames[p.id] = p.name;

  // ---- Project filter (set by clicking a project badge) --------------------
  const [projectFilter, setProjectFilter] = useState<string | null>(null); // project id
  const filterProjectName = projectFilter ? projectNames[projectFilter] ?? null : null;
  const setFilterByName = (name: string) => {
    const p = projects.find((pp) => pp.name === name);
    if (p) setProjectFilter(p.id);
  };

  const filterBucket = (b: MonthBucket): MonthBucket => (projectFilter === null ? b : {
    ...b,
    entries:           b.entries.filter((e) => e.project_id === projectFilter),
    paidEntries:       b.paidEntries.filter((e) => e.project_id === projectFilter),
    lateEntries:       b.lateEntries.filter((e) => e.project_id === projectFilter),
    provCarryIncome:   b.provCarryIncome.filter((e) => e.project_id === projectFilter),
    expenses:          b.expenses.filter((e) => e.project_id === projectFilter),
    lateExpenses:      b.lateExpenses.filter((le) => le.expense.project_id === projectFilter),
    provCarryExpenses: b.provCarryExpenses.filter((le) => le.expense.project_id === projectFilter),
  });
  const bucketHasItems = (b: MonthBucket) =>
    b.entries.length + b.paidEntries.length + b.lateEntries.length + b.provCarryIncome.length +
    b.expenses.length + b.lateExpenses.length + b.provCarryExpenses.length > 0;

  const displayMonths = projectFilter ? months.map(filterBucket).filter(bucketHasItems) : months;
  const displayPastMonths = projectFilter ? pastMonths.map(filterBucket).filter(bucketHasItems) : pastMonths;

  // ---- Prognosegüte: Ist-Saldo vs. berechneter Saldo in der Vergangenheit --
  const accuracySamples = pastMonths.filter((b) => b.actualBalance !== null);
  const avgDeviation = accuracySamples.length >= 2
    ? accuracySamples.reduce((s, b) => s + ((b.actualBalance as number) - b.projectedBalance), 0) / accuracySamples.length
    : null;

  // Open entries for duplicate detection in the capture forms
  const openIncomeCandidates = incomes
    .filter((e) => !e.paid_at)
    .map((e) => ({ description: e.description, amount: e.amount, date: e.expected_date }));
  const openExpenseCandidates = expenses
    .filter((e) => e.active)
    .map((e) => ({ description: e.description, amount: e.amount, date: e.due_date ?? '' }));

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

  async function handleAddProject(data: Parameters<typeof addProject>[0]) {
    const ok = await addProject(data);
    if (ok) setShowProjectForm(false);
    return ok;
  }

  const showingAForm = showIncomeForm || showExpenseForm || showProjectForm;

  return (
    <ProjectFilterContext.Provider value={setFilterByName}>
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary-900">Liquiditätsplanung</h1>
          <p className="mt-1 text-sm text-primary-500">Einnahmen und Ausgaben der nächsten 12 Monate</p>
        </div>
        {!showingAForm && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportLiquidityToExcel(months, pastMonths, projectNames)}
              title="Planung inkl. Vergangenheit als Excel exportieren"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowProjectForm(true)}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Neues Projekt
            </Button>
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

      {showIncomeForm  && <AddIncomeForm  onSave={handleAddIncome}  onCancel={() => setShowIncomeForm(false)} existingOpen={openIncomeCandidates} />}
      {showExpenseForm && <AddExpenseForm onSave={handleAddExpense} onCancel={() => setShowExpenseForm(false)} existingOpen={openExpenseCandidates} />}
      {showProjectForm && <AddProjectForm onSave={handleAddProject} onCancel={() => setShowProjectForm(false)} existingOpen={[...openIncomeCandidates, ...openExpenseCandidates]} />}

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
        <>
          <LiquidityCashFlowChart months={months} pastMonths={pastMonths} currency={startsaldoCurrency} />
          {avgDeviation !== null && (
            <p className="-mt-4 mb-6 px-1 text-right text-[10px] text-primary-400">
              Prognosegüte: Ist-Saldo lag im Ø {formatCurrency(Math.abs(avgDeviation), 'CHF')}{' '}
              {avgDeviation >= 0 ? 'über' : 'unter'} dem berechneten Saldo
              ({accuracySamples.length} Monate mit Ist-Saldo{avgDeviation < 0 ? ' — Planung tendenziell zu optimistisch' : ''})
            </p>
          )}
        </>
      )}

      {/* Projekte — grouped positions with paid status + delete-all */}
      {!loading && !showingAForm && (
        <ProjectsPanel
          projects={projects}
          incomes={incomes}
          expenses={expenses}
          expensePayments={expensePayments}
          onDeleteProject={deleteProject}
          onRenameProject={renameProject}
          onAddPosition={addProjectPosition}
        />
      )}

      {/* Active project filter banner */}
      {!loading && !showingAForm && filterProjectName && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          <span className="min-w-0 flex-1 truncate">
            Gefiltert nach Projekt <strong>{filterProjectName}</strong> — leere Monate sind ausgeblendet, Saldozeilen zeigen weiterhin Gesamtwerte.
          </span>
          <button
            onClick={() => setProjectFilter(null)}
            className="shrink-0 rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
          >
            Filter aufheben ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-2">
          {/* Past months — collapsed by default, newest first */}
          {displayPastMonths.length > 0 && (
            <div className="rounded-lg border border-primary-100 bg-primary-50/40 overflow-hidden">
              <button
                onClick={() => setShowPastMonths((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-primary-600">
                  Vergangene Monate
                  <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-500">
                    {displayPastMonths.length}
                  </span>
                </span>
                <svg className={`h-4 w-4 text-primary-400 transition-transform ${showPastMonths ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {showPastMonths && (
                <div className="space-y-2 border-t border-primary-100 p-2">
                  {[...displayPastMonths].reverse().map((bucket) => {
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
                        projectNames={projectNames}
                        onUpdateIncome={updateIncome}
                        onDeleteIncome={deleteIncome}
                        onMarkIncomePaid={markIncomePaid}
                        onPartialIncomePaid={recordPartialIncomePayment}
                        onMarkIncomeUnpaid={markIncomeUnpaid}
                        onMarkExpensePaid={markExpensePaid}
                        onMarkExpenseUnpaid={markExpenseUnpaid}
                        onCancelExpenseInstance={cancelExpenseInstance}
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

          {displayMonths.map((bucket) => {
            const key = `${bucket.year}-${String(bucket.month + 1).padStart(2, '0')}`;
            return (
              <MonthSection
                key={key}
                bucket={bucket}
                isCurrentMonth={key === currentMonthKey}
                balanceCurrency={startsaldoCurrency}
                lockDate={lockDate}
                lockTs={lockTs}
                projectNames={projectNames}
                onUpdateIncome={updateIncome}
                onDeleteIncome={deleteIncome}
                onMarkIncomePaid={markIncomePaid}
                onPartialIncomePaid={recordPartialIncomePayment}
                onMarkIncomeUnpaid={markIncomeUnpaid}
                onMarkExpensePaid={markExpensePaid}
                onMarkExpenseUnpaid={markExpenseUnpaid}
                onCancelExpenseInstance={cancelExpenseInstance}
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
    </ProjectFilterContext.Provider>
  );
}
