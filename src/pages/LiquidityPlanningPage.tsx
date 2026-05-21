// ---------------------------------------------------------------------------
// NOA Liquidity Planning — rolling 12-month cash-flow & balance projection
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../lib/utils';
import { useNOALiquidity } from '../hooks/useNOALiquidity';
import type {
  MonthProjection,
  LiquidityIncomeItem,
  LiquidityExpenseItem,
} from '../hooks/useNOALiquidity';
import type { NOALiquidityExpenseRow, NOALiquidityIncomeRow } from '../types/database';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function fmt(amount: number) {
  return formatCurrency(Math.round(amount), 'CHF');
}

function BalancePill({ amount }: { amount: number }) {
  const positive = amount >= 0;
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-sm font-semibold ${
        positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {fmt(amount)}
    </span>
  );
}

function TypeBadge({ type }: { type: LiquidityIncomeItem['type'] }) {
  const map = {
    sale: { label: 'Verkauf', cls: 'bg-blue-100 text-blue-700' },
    pre_sold: { label: 'Pre-sold', cls: 'bg-violet-100 text-violet-700' },
    special: { label: 'Sonder', cls: 'bg-amber-100 text-amber-700' },
  };
  const { label, cls } = map[type];
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
  );
}

// ---------------------------------------------------------------------------
// Month accordion row
// ---------------------------------------------------------------------------

function MonthRow({
  month,
  isCurrentMonth,
}: {
  month: MonthProjection;
  isCurrentMonth: boolean;
}) {
  const [open, setOpen] = useState(isCurrentMonth);

  return (
    <div className={`border-b border-gray-100 last:border-0 ${isCurrentMonth ? 'bg-blue-50/40' : ''}`}>
      {/* Summary row */}
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-5 text-primary-400 text-sm">{open ? '▾' : '▸'}</span>
          <span className="font-semibold text-primary-900 text-sm">{month.label}</span>
          {isCurrentMonth && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-600 font-medium">
              aktuell
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm shrink-0">
          <span className="hidden sm:block text-emerald-600 font-medium">
            +{fmt(month.totalIncome)}
          </span>
          <span className="hidden sm:block text-red-600 font-medium">
            −{fmt(month.totalExpenses)}
          </span>
          <BalancePill amount={month.endBalance} />
        </div>
      </button>

      {/* Detail */}
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Income column */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Einnahmen &nbsp;
                <span className="font-bold">{fmt(month.totalIncome)}</span>
              </p>
              {month.incomeItems.length === 0 ? (
                <p className="text-xs text-primary-400 italic">Keine Einnahmen</p>
              ) : (
                <ul className="space-y-2">
                  {month.incomeItems.map((item) => (
                    <IncomeItemRow key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </div>

            {/* Expense column */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-500">
                Ausgaben &nbsp;
                <span className="font-bold">{fmt(month.totalExpenses)}</span>
              </p>
              {month.expenseItems.length === 0 ? (
                <p className="text-xs text-primary-400 italic">Keine Ausgaben</p>
              ) : (
                <ul className="space-y-2">
                  {month.expenseItems.map((item) => (
                    <ExpenseItemRow key={`${item.id}-${item.type}`} item={item} />
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-gray-100 pt-2 text-sm">
            <span className="text-primary-600">Netto diesen Monat</span>
            <span className={`font-semibold ${month.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {month.net >= 0 ? '+' : ''}{fmt(month.net)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function IncomeItemRow({ item }: { item: LiquidityIncomeItem }) {
  return (
    <li className="flex items-start justify-between gap-2 text-xs">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <TypeBadge type={item.type} />
          <span className="text-primary-800 font-medium truncate">{item.description}</span>
        </div>
        <div className="mt-0.5 text-primary-400">
          {item.galleryName && <span>{item.galleryName} · </span>}
          <span>{item.expectedDate}</span>
        </div>
      </div>
      <span className="shrink-0 font-semibold text-emerald-600">{fmt(item.amount)}</span>
    </li>
  );
}

function ExpenseItemRow({ item }: { item: LiquidityExpenseItem }) {
  return (
    <li className="flex items-start justify-between gap-2 text-xs">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${item.type === 'fixed' ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'}`}>
            {item.type === 'fixed' ? 'Fix' : 'Einmalig'}
          </span>
          <span className="text-primary-800 font-medium truncate">{item.description}</span>
        </div>
        {item.dueDate && (
          <div className="mt-0.5 text-primary-400">{item.dueDate}</div>
        )}
      </div>
      <span className="shrink-0 font-semibold text-red-500">−{fmt(item.amount)}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Add Expense Modal
// ---------------------------------------------------------------------------

type ExpenseForm = {
  description: string;
  amount: string;
  type: 'fixed' | 'one_time';
  due_date: string;
};

function ExpenseModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: NOALiquidityExpenseRow | null;
  onSave: (data: ExpenseForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ExpenseForm>({
    description: initial?.description ?? '',
    amount: initial?.amount.toString() ?? '',
    type: initial?.type ?? 'fixed',
    due_date: initial?.due_date ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof ExpenseForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.description.trim() || !form.amount || parseFloat(form.amount) <= 0) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <Input
        label="Bezeichnung"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        placeholder="z.B. Miete Atelier"
      />
      <Input
        label="Betrag (CHF)"
        type="number"
        min="0"
        step="0.01"
        value={form.amount}
        onChange={(e) => set('amount', e.target.value)}
      />
      <div>
        <label className="block text-xs font-medium text-primary-700 mb-1">Typ</label>
        <div className="flex gap-2">
          {(['fixed', 'one_time'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('type', t)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                form.type === t
                  ? 'border-primary-900 bg-primary-900 text-white'
                  : 'border-gray-200 text-primary-600 hover:border-primary-300'
              }`}
            >
              {t === 'fixed' ? 'Monatlich fix' : 'Einmalig'}
            </button>
          ))}
        </div>
      </div>
      {form.type === 'one_time' && (
        <Input
          label="Fällig am"
          type="date"
          value={form.due_date}
          onChange={(e) => set('due_date', e.target.value)}
        />
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!form.description.trim() || !form.amount || parseFloat(form.amount) <= 0 || (form.type === 'one_time' && !form.due_date)}
        >
          Speichern
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Special Income Modal
// ---------------------------------------------------------------------------

type IncomeForm = {
  description: string;
  amount: string;
  expected_date: string;
  notes: string;
};

function IncomeModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: NOALiquidityIncomeRow | null;
  onSave: (data: IncomeForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<IncomeForm>({
    description: initial?.description ?? '',
    amount: initial?.amount.toString() ?? '',
    expected_date: initial?.expected_date ?? new Date().toISOString().slice(0, 10),
    notes: initial?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof IncomeForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.description.trim() || !form.amount || parseFloat(form.amount) <= 0 || !form.expected_date) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <Input
        label="Bezeichnung"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        placeholder="z.B. Förderung Kanton Zürich"
      />
      <Input
        label="Betrag (CHF)"
        type="number"
        min="0"
        step="0.01"
        value={form.amount}
        onChange={(e) => set('amount', e.target.value)}
      />
      <Input
        label="Zahlungseingang erwartet"
        type="date"
        value={form.expected_date}
        onChange={(e) => set('expected_date', e.target.value)}
      />
      <Input
        label="Notizen (optional)"
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
        placeholder="Freitext"
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onClose}>Abbrechen</Button>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={!form.description.trim() || !form.amount || parseFloat(form.amount) <= 0 || !form.expected_date}
        >
          Speichern
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Starting balance editor
// ---------------------------------------------------------------------------

function BalanceEditor({
  current,
  onSave,
}: {
  current: { balance: number; date: string } | null;
  onSave: (balance: number, date: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [balanceStr, setBalanceStr] = useState(current?.balance.toString() ?? '0');
  const [dateStr, setDateStr] = useState(current?.date ?? new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const b = parseFloat(balanceStr);
    if (isNaN(b) || !dateStr) return;
    setSaving(true);
    await onSave(b, dateStr);
    setSaving(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs text-primary-500 font-medium uppercase tracking-wider">Startkontostand</p>
          <p className="text-2xl font-bold text-primary-900">{fmt(current?.balance ?? 0)}</p>
          {current?.date && (
            <p className="text-xs text-primary-400">Stand: {current.date}</p>
          )}
        </div>
        <button
          onClick={() => {
            setBalanceStr(current?.balance.toString() ?? '0');
            setDateStr(current?.date ?? new Date().toISOString().slice(0, 10));
            setEditing(true);
          }}
          className="rounded-full p-1.5 text-primary-400 hover:bg-gray-100 hover:text-primary-700 transition-colors"
          title="Bearbeiten"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <Input
        label="Kontostand (CHF)"
        type="number"
        step="0.01"
        value={balanceStr}
        onChange={(e) => setBalanceStr(e.target.value)}
        className="w-40"
      />
      <Input
        label="Stand per"
        type="date"
        value={dateStr}
        onChange={(e) => setDateStr(e.target.value)}
        className="w-44"
      />
      <div className="flex gap-2 pb-1">
        <Button variant="outline" onClick={() => setEditing(false)}>Abbrechen</Button>
        <Button onClick={handleSave} loading={saving}>Speichern</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expenses management panel
// ---------------------------------------------------------------------------

function ExpensesPanel({
  expenses,
  onAdd,
  onUpdate,
  onDelete,
}: {
  expenses: NOALiquidityExpenseRow[];
  onAdd: (data: ExpenseForm) => Promise<void>;
  onUpdate: (id: string, data: ExpenseForm) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<NOALiquidityExpenseRow | null>(null);

  const fixed = expenses.filter((e) => e.type === 'fixed');
  const oneTime = expenses.filter((e) => e.type === 'one_time');

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-primary-700">Ausgaben verwalten</h2>
        <Button variant="outline" onClick={() => setShowAdd(true)}>
          + Ausgabe
        </Button>
      </div>

      {expenses.length === 0 && (
        <p className="text-sm text-primary-400 italic">Noch keine Ausgaben erfasst.</p>
      )}

      {fixed.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-500 mb-2">Monatlich fix</p>
          <ul className="divide-y divide-gray-100">
            {fixed.map((exp) => (
              <ExpenseManageRow
                key={exp.id}
                exp={exp}
                onEdit={() => setEditing(exp)}
                onDelete={() => onDelete(exp.id)}
                onToggle={() => onUpdate(exp.id, {
                  description: exp.description,
                  amount: exp.amount.toString(),
                  type: exp.type,
                  due_date: exp.due_date ?? '',
                  ...(({ active: !exp.active } as unknown as Partial<ExpenseForm>)),
                })}
              />
            ))}
          </ul>
        </div>
      )}

      {oneTime.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-500 mb-2">Einmalig</p>
          <ul className="divide-y divide-gray-100">
            {oneTime.map((exp) => (
              <ExpenseManageRow
                key={exp.id}
                exp={exp}
                onEdit={() => setEditing(exp)}
                onDelete={() => onDelete(exp.id)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Add modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Ausgabe hinzufügen" size="md">
        <ExpenseModal
          onSave={async (data) => { await onAdd(data); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Ausgabe bearbeiten" size="md">
        {editing && (
          <ExpenseModal
            initial={editing}
            onSave={async (data) => { await onUpdate(editing.id, data); setEditing(null); }}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </Card>
  );
}

function ExpenseManageRow({
  exp,
  onEdit,
  onDelete,
  onToggle,
}: {
  exp: NOALiquidityExpenseRow;
  onEdit: () => void;
  onDelete: () => void;
  onToggle?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="flex items-center justify-between py-2 gap-2">
      <div className="min-w-0">
        <p className={`text-sm font-medium truncate ${exp.type === 'fixed' && !exp.active ? 'text-primary-400 line-through' : 'text-primary-800'}`}>
          {exp.description}
        </p>
        <p className="text-xs text-primary-400">
          {fmt(exp.amount)}
          {exp.due_date && ` · ${exp.due_date}`}
          {exp.type === 'fixed' && !exp.active && ' · inaktiv'}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onToggle && (
          <button
            onClick={onToggle}
            className="rounded p-1 text-xs text-primary-400 hover:text-primary-600 hover:bg-gray-100"
            title={exp.active ? 'Deaktivieren' : 'Aktivieren'}
          >
            {exp.active ? '⏸' : '▶'}
          </button>
        )}
        <button onClick={onEdit} className="rounded p-1 text-primary-400 hover:text-primary-600 hover:bg-gray-100">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
          </svg>
        </button>
        {confirming ? (
          <button onClick={() => { onDelete(); setConfirming(false); }} className="rounded px-2 py-0.5 text-xs bg-red-100 text-red-600 hover:bg-red-200">
            Löschen?
          </button>
        ) : (
          <button onClick={() => setConfirming(true)} className="rounded p-1 text-primary-400 hover:text-red-500 hover:bg-gray-100">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Special income management panel
// ---------------------------------------------------------------------------

function SpecialIncomePanel({
  income,
  onAdd,
  onUpdate,
  onDelete,
}: {
  income: NOALiquidityIncomeRow[];
  onAdd: (data: IncomeForm) => Promise<void>;
  onUpdate: (id: string, data: IncomeForm) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<NOALiquidityIncomeRow | null>(null);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-primary-700">Sondereinnahmen</h2>
        <Button variant="outline" onClick={() => setShowAdd(true)}>
          + Einnahme
        </Button>
      </div>

      {income.length === 0 ? (
        <p className="text-sm text-primary-400 italic">Keine Sondereinnahmen im Zeitraum.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {income.map((inc) => (
            <li key={inc.id} className="flex items-center justify-between py-2 gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary-800 truncate">{inc.description}</p>
                <p className="text-xs text-primary-400">{fmt(inc.amount)} · {inc.expected_date}</p>
                {inc.notes && <p className="text-xs text-primary-400 italic">{inc.notes}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditing(inc)} className="rounded p-1 text-primary-400 hover:text-primary-600 hover:bg-gray-100">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                  </svg>
                </button>
                <button onClick={() => onDelete(inc.id)} className="rounded p-1 text-primary-400 hover:text-red-500 hover:bg-gray-100">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Sondereinnahme hinzufügen" size="md">
        <IncomeModal
          onSave={async (data) => { await onAdd(data); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Sondereinnahme bearbeiten" size="md">
        {editing && (
          <IncomeModal
            initial={editing}
            onSave={async (data) => { await onUpdate(editing.id, data); setEditing(null); }}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Balance bar chart (simple SVG sparkline across 12 months)
// ---------------------------------------------------------------------------

function BalanceChart({ months }: { months: MonthProjection[] }) {
  if (months.length === 0) return null;

  const values = months.map((m) => m.endBalance);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;

  const W = 600;
  const H = 120;
  const PAD_X = 4;
  const PAD_Y = 12;

  const x = (i: number) => PAD_X + (i / (months.length - 1 || 1)) * (W - PAD_X * 2);
  const y = (v: number) => PAD_Y + (1 - (v - min) / range) * (H - PAD_Y * 2);

  const zeroY = y(0);

  const pointsStr = months.map((m, i) => `${x(i)},${y(m.endBalance)}`).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 280 }}>
        {/* Zero line */}
        <line x1={PAD_X} y1={zeroY} x2={W - PAD_X} y2={zeroY} stroke="#e5e7eb" strokeWidth="1" />

        {/* Area fill */}
        <defs>
          <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polyline
          points={`${x(0)},${H - PAD_Y} ${pointsStr} ${x(months.length - 1)},${H - PAD_Y}`}
          fill="url(#balGrad)"
          stroke="none"
        />

        {/* Line */}
        <polyline points={pointsStr} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />

        {/* Dots + month labels */}
        {months.map((m, i) => (
          <g key={m.label}>
            <circle cx={x(i)} cy={y(m.endBalance)} r="3" fill="#10b981" />
            {(i === 0 || i === months.length - 1 || i % 3 === 0) && (
              <text x={x(i)} y={H - 2} textAnchor="middle" fontSize="8" fill="#9ca3af">
                {m.label.slice(0, 3)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function LiquidityPlanningPage() {
  const {
    months,
    settings,
    expenses,
    specialIncome,
    loading,
    saveSettings,
    addExpense,
    updateExpense,
    deleteExpense,
    addSpecialIncome,
    updateSpecialIncome,
    deleteSpecialIncome,
  } = useNOALiquidity();

  const [activeTab, setActiveTab] = useState<'overview' | 'manage'>('overview');

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const handleAddExpense = useCallback(async (data: ExpenseForm) => {
    await addExpense({
      description: data.description.trim(),
      amount: parseFloat(data.amount),
      type: data.type,
      active: true,
      due_date: data.type === 'one_time' ? (data.due_date || null) : null,
    });
  }, [addExpense]);

  const handleUpdateExpense = useCallback(async (id: string, data: ExpenseForm) => {
    await updateExpense(id, {
      description: data.description.trim(),
      amount: parseFloat(data.amount),
      type: data.type,
      due_date: data.type === 'one_time' ? (data.due_date || null) : null,
    });
  }, [updateExpense]);

  const handleAddIncome = useCallback(async (data: IncomeForm) => {
    await addSpecialIncome({
      description: data.description.trim(),
      amount: parseFloat(data.amount),
      expected_date: data.expected_date,
      notes: data.notes.trim() || null,
    });
  }, [addSpecialIncome]);

  const handleUpdateIncome = useCallback(async (id: string, data: IncomeForm) => {
    await updateSpecialIncome(id, {
      description: data.description.trim(),
      amount: parseFloat(data.amount),
      expected_date: data.expected_date,
      notes: data.notes.trim() || null,
    });
  }, [updateSpecialIncome]);

  if (loading) return <LoadingSpinner />;

  // Summary KPIs
  const totalProjectedIncome = months.reduce((s, m) => s + m.totalIncome, 0);
  const totalProjectedExpenses = months.reduce((s, m) => s + m.totalExpenses, 0);
  const finalBalance = months[months.length - 1]?.endBalance ?? settings?.starting_balance ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NOA Liquidität</h1>
          <p className="text-sm text-primary-500 mt-0.5">
            Rollierende 12-Monats-Prognose · {months[0]?.label ?? ''} – {months[months.length - 1]?.label ?? ''}
          </p>
        </div>
        <div className="flex gap-2">
          {(['overview', 'manage'] as const).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'primary' : 'outline'}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' ? 'Übersicht' : 'Verwalten'}
            </Button>
          ))}
        </div>
      </div>

      {/* Starting balance + KPI strip */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start gap-6">
          <BalanceEditor
            current={settings ? { balance: settings.starting_balance, date: settings.starting_balance_date } : null}
            onSave={saveSettings}
          />
          <div className="flex gap-6 flex-wrap">
            <div>
              <p className="text-xs text-primary-500 font-medium uppercase tracking-wider">Erwartete Einnahmen (12M)</p>
              <p className="text-lg font-bold text-emerald-600">{fmt(totalProjectedIncome)}</p>
            </div>
            <div>
              <p className="text-xs text-primary-500 font-medium uppercase tracking-wider">Geplante Ausgaben (12M)</p>
              <p className="text-lg font-bold text-red-500">{fmt(totalProjectedExpenses)}</p>
            </div>
            <div>
              <p className="text-xs text-primary-500 font-medium uppercase tracking-wider">Kontostand in 12M</p>
              <p className={`text-lg font-bold ${finalBalance >= 0 ? 'text-primary-900' : 'text-red-600'}`}>{fmt(finalBalance)}</p>
            </div>
          </div>
        </div>
      </Card>

      {activeTab === 'overview' ? (
        <>
          {/* Chart */}
          {months.length > 1 && (
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-primary-700 mb-3">Kontosaldoverlauf</h2>
              <BalanceChart months={months} />
            </Card>
          )}

          {/* Monthly accordion */}
          <Card>
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-primary-700">Monatsübersicht</h2>
            </div>
            {months.map((month) => (
              <MonthRow
                key={`${month.year}-${month.month}`}
                month={month}
                isCurrentMonth={month.year === currentYear && month.month === currentMonth}
              />
            ))}
          </Card>
        </>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ExpensesPanel
            expenses={expenses}
            onAdd={handleAddExpense}
            onUpdate={handleUpdateExpense}
            onDelete={deleteExpense}
          />
          <SpecialIncomePanel
            income={specialIncome}
            onAdd={handleAddIncome}
            onUpdate={handleUpdateIncome}
            onDelete={deleteSpecialIncome}
          />
        </div>
      )}
    </div>
  );
}
