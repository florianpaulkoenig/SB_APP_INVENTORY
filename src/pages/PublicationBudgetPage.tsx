import { useState, useMemo, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatCurrency } from '../lib/utils';
import { CURRENCIES } from '../lib/constants';
import { usePublicationBudgets, usePublicationBudgetItems } from '../hooks/usePublicationBudget';
import type {
  PublicationBudgetRow,
  PublicationBudgetItemType,
  PublicationBudgetItemStatus,
  PublicationBudgetStatus,
} from '../types/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c.value, label: c.label }));

const REVENUE_CATEGORIES = [
  'Book Sales', 'Pre-orders', 'Gallery Contribution', 'Sponsorship', 'Grant / Foundation', 'Other Revenue',
];

const COST_CATEGORIES = [
  'Design & Layout', 'Photography / Scans', 'Text / Editorial', 'Translation', 'Printing', 'Binding',
  'Shipping & Logistics', 'ISBN / Rights', 'Marketing', 'Event / Launch', 'Other Cost',
];

const ITEM_STATUS_OPTIONS: { value: PublicationBudgetItemStatus; label: string }[] = [
  { value: 'estimated', label: 'Estimated' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'invoiced',  label: 'Invoiced' },
  { value: 'paid',      label: 'Paid' },
];

const BUDGET_STATUS_OPTIONS: { value: PublicationBudgetStatus; label: string }[] = [
  { value: 'draft',  label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_BADGE: Record<PublicationBudgetItemStatus, string> = {
  estimated: 'bg-gray-100 text-gray-600',
  confirmed: 'bg-blue-100 text-blue-700',
  invoiced:  'bg-amber-100 text-amber-700',
  paid:      'bg-green-100 text-green-700',
};

const BUDGET_STATUS_BADGE: Record<PublicationBudgetStatus, string> = {
  draft:  'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  closed: 'bg-primary-100 text-primary-600',
};

// ---------------------------------------------------------------------------
// Budget list sidebar
// ---------------------------------------------------------------------------

function BudgetSidebar({
  budgets,
  selectedId,
  onSelect,
  onCreate,
}: {
  budgets: PublicationBudgetRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="w-64 shrink-0 border-r border-primary-100 bg-white">
      <div className="flex items-center justify-between border-b border-primary-100 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary-400">Publications</span>
        <button onClick={onCreate} className="rounded p-1 text-primary-400 hover:bg-primary-50 hover:text-primary-600" title="New budget">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      <nav className="py-2">
        {budgets.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-primary-300">No publications yet</p>
        )}
        {budgets.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelect(b.id)}
            className={`w-full px-4 py-3 text-left transition-colors hover:bg-primary-50 ${selectedId === b.id ? 'bg-primary-50 font-medium text-primary-700' : 'text-primary-600'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm">{b.name}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${BUDGET_STATUS_BADGE[b.status]}`}>
                {b.status}
              </span>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item form
// ---------------------------------------------------------------------------

interface ItemFormState {
  type: PublicationBudgetItemType;
  category: string;
  description: string;
  amount: string;
  currency: string;
  status: PublicationBudgetItemStatus;
  notes: string;
}

function emptyItemForm(type: PublicationBudgetItemType = 'cost'): ItemFormState {
  return { type, category: '', description: '', amount: '', currency: 'CHF', status: 'estimated', notes: '' };
}

function ItemFormModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: ItemFormState;
  onClose: () => void;
  onSave: (form: ItemFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<ItemFormState>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(key: keyof ItemFormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const categories = form.type === 'revenue' ? REVENUE_CATEGORIES : COST_CATEGORIES;

  async function handleSave() {
    if (!form.description || !form.amount) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={`${initial.type === 'revenue' ? 'Revenue' : 'Cost'} Item`} size="md">
      <div className="space-y-4">
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={form.type === 'revenue'} onChange={() => set('type', 'revenue')} />
            Revenue
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={form.type === 'cost'} onChange={() => set('type', 'cost')} />
            Cost
          </label>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary-500">Category</label>
          <Select
            options={categories.map((c) => ({ value: c, label: c }))}
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary-500">Description *</label>
          <Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Offset printing 500 copies" />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-primary-500">Amount *</label>
            <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs font-medium text-primary-500">Currency</label>
            <Select options={CURRENCY_OPTIONS} value={form.currency} onChange={(e) => set('currency', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary-500">Status</label>
          <Select options={ITEM_STATUS_OPTIONS} value={form.status} onChange={(e) => set('status', e.target.value as PublicationBudgetItemStatus)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary-500">Notes</label>
          <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!form.description || !form.amount}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Budget detail
// ---------------------------------------------------------------------------

function BudgetDetail({ budget, onUpdate, onDelete }: {
  budget: PublicationBudgetRow;
  onUpdate: (update: { name?: string; description?: string; status?: PublicationBudgetStatus }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { items, loading, addItem, updateItem, deleteItem } = usePublicationBudgetItems(budget.id);
  const [itemModal, setItemModal] = useState<{ open: boolean; initial: ItemFormState; editId?: string }>({
    open: false,
    initial: emptyItemForm(),
  });
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetName, setBudgetName] = useState(budget.name);
  const [budgetDesc, setBudgetDesc] = useState(budget.description ?? '');
  const [budgetStatus, setBudgetStatus] = useState<PublicationBudgetStatus>(budget.status);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const revenues = useMemo(() => items.filter((i) => i.type === 'revenue'), [items]);
  const costs    = useMemo(() => items.filter((i) => i.type === 'cost'), [items]);

  // Totals in CHF (display as-is; all amounts stored in their own currency)
  const totalRevenue = revenues.reduce((s, i) => s + i.amount, 0);
  const totalCosts   = costs.reduce((s, i) => s + i.amount, 0);
  const netResult    = totalRevenue - totalCosts;

  function openAdd(type: PublicationBudgetItemType) {
    setItemModal({ open: true, initial: emptyItemForm(type) });
  }

  function openEdit(item: typeof items[0]) {
    setItemModal({
      open: true,
      editId: item.id,
      initial: {
        type: item.type,
        category: item.category,
        description: item.description,
        amount: String(item.amount),
        currency: item.currency,
        status: item.status,
        notes: item.notes ?? '',
      },
    });
  }

  async function handleSaveItem(form: ItemFormState) {
    const payload = {
      type: form.type,
      category: form.category || (form.type === 'revenue' ? REVENUE_CATEGORIES[0] : COST_CATEGORIES[0]),
      description: form.description,
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
      status: form.status,
      notes: form.notes || null,
    };
    if (itemModal.editId) {
      await updateItem(itemModal.editId, payload);
    } else {
      await addItem({ ...payload, budget_id: budget.id });
    }
    setItemModal((m) => ({ ...m, open: false }));
  }

  async function saveBudgetEdit() {
    await onUpdate({ name: budgetName, description: budgetDesc || null, status: budgetStatus });
    setEditingBudget(false);
  }

  function ItemRow({ item }: { item: typeof items[0] }) {
    return (
      <tr className="group border-b border-primary-50 last:border-0 hover:bg-primary-50/40">
        <td className="py-2 pl-4 pr-2">
          <span className="text-xs text-primary-400">{item.category}</span>
        </td>
        <td className="px-2 py-2 text-sm text-primary-700">{item.description}</td>
        <td className="px-2 py-2 text-right text-sm font-medium text-primary-800">
          {formatCurrency(item.amount, item.currency)}
        </td>
        <td className="px-2 py-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[item.status]}`}>
            {item.status}
          </span>
        </td>
        <td className="py-2 pr-4 text-right">
          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
            <button onClick={() => openEdit(item)} className="rounded p-1 text-primary-400 hover:bg-primary-100 hover:text-primary-600" title="Edit">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" />
              </svg>
            </button>
            <button onClick={() => deleteItem(item.id)} className="rounded p-1 text-red-300 hover:bg-red-50 hover:text-red-500" title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a1 1 0 00-1 1v1h6V4a1 1 0 00-1-1m-4 0h4" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1">
          {editingBudget ? (
            <div className="space-y-3">
              <Input value={budgetName} onChange={(e) => setBudgetName(e.target.value)} className="text-lg font-semibold" placeholder="Publication name" />
              <Input value={budgetDesc} onChange={(e) => setBudgetDesc(e.target.value)} placeholder="Description (optional)" />
              <Select options={BUDGET_STATUS_OPTIONS} value={budgetStatus} onChange={(e) => setBudgetStatus(e.target.value as PublicationBudgetStatus)} className="w-36" />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveBudgetEdit}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingBudget(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-primary-800">{budget.name}</h1>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BUDGET_STATUS_BADGE[budget.status]}`}>{budget.status}</span>
              </div>
              {budget.description && <p className="mt-1 text-sm text-primary-400">{budget.description}</p>}
            </div>
          )}
        </div>
        {!editingBudget && (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditingBudget(true)}>Edit</Button>
            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => setConfirmDelete(true)}>Delete</Button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3">
          <p className="text-xs text-green-600">Total Revenue</p>
          <p className="mt-1 text-xl font-semibold text-green-700">{formatCurrency(totalRevenue, 'CHF')}</p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-xs text-red-500">Total Costs</p>
          <p className="mt-1 text-xl font-semibold text-red-600">{formatCurrency(totalCosts, 'CHF')}</p>
        </div>
        <div className={`rounded-lg border px-4 py-3 ${netResult >= 0 ? 'border-primary-100 bg-primary-50' : 'border-amber-100 bg-amber-50'}`}>
          <p className={`text-xs ${netResult >= 0 ? 'text-primary-500' : 'text-amber-600'}`}>Net Result</p>
          <p className={`mt-1 text-xl font-semibold ${netResult >= 0 ? 'text-primary-700' : 'text-amber-700'}`}>{formatCurrency(netResult, 'CHF')}</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          {/* Revenue */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-green-600">Revenue</h2>
              <Button size="sm" variant="ghost" onClick={() => openAdd('revenue')}>+ Add</Button>
            </div>
            {revenues.length === 0 ? (
              <p className="rounded-lg border border-dashed border-green-200 px-4 py-6 text-center text-sm text-primary-300">No revenue items yet</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-primary-100 bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-primary-100 bg-primary-50/50">
                      <th className="py-2 pl-4 pr-2 text-left text-xs font-medium text-primary-400">Category</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-primary-400">Description</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-primary-400">Amount</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-primary-400">Status</th>
                      <th className="py-2 pr-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {revenues.map((item) => <ItemRow key={item.id} item={item} />)}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Costs */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-red-500">Costs</h2>
              <Button size="sm" variant="ghost" onClick={() => openAdd('cost')}>+ Add</Button>
            </div>
            {costs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-red-100 px-4 py-6 text-center text-sm text-primary-300">No cost items yet</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-primary-100 bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-primary-100 bg-primary-50/50">
                      <th className="py-2 pl-4 pr-2 text-left text-xs font-medium text-primary-400">Category</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-primary-400">Description</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-primary-400">Amount</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-primary-400">Status</th>
                      <th className="py-2 pr-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {costs.map((item) => <ItemRow key={item.id} item={item} />)}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Item form modal */}
      <ItemFormModal
        open={itemModal.open}
        initial={itemModal.initial}
        onClose={() => setItemModal((m) => ({ ...m, open: false }))}
        onSave={handleSaveItem}
      />

      {/* Confirm delete */}
      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Budget" size="sm">
        <p className="text-sm text-primary-600">Delete <strong>{budget.name}</strong> and all its items? This cannot be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button variant="danger" onClick={async () => { await onDelete(); setConfirmDelete(false); }}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New budget modal
// ---------------------------------------------------------------------------

function NewBudgetModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name) return;
    setSaving(true);
    await onCreate(name, desc);
    setSaving(false);
    setName(''); setDesc('');
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="New Publication Budget" size="sm">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-primary-500">Publication Name *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Simon Berger — Monograph 2026" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary-500">Description</label>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional notes" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} loading={saving} disabled={!name}>Create</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PublicationBudgetPage() {
  const { budgets, loading, createBudget, updateBudget, deleteBudget } = usePublicationBudgets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);

  const selectedBudget = budgets.find((b) => b.id === selectedId) ?? null;

  async function handleCreate(name: string, description: string) {
    const created = await createBudget({ name, description: description || null });
    if (created) { setSelectedId(created.id); setNewModalOpen(false); }
  }

  async function handleUpdate(update: Parameters<typeof updateBudget>[1]) {
    if (selectedId) await updateBudget(selectedId, update);
  }

  async function handleDelete() {
    if (selectedId) {
      await deleteBudget(selectedId);
      setSelectedId(null);
    }
  }

  return (
    <div className="flex h-full">
      {loading ? (
        <div className="flex flex-1 items-center justify-center"><LoadingSpinner /></div>
      ) : (
        <>
          <BudgetSidebar
            budgets={budgets}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCreate={() => setNewModalOpen(true)}
          />

          {selectedBudget ? (
            <BudgetDetail
              key={selectedBudget.id}
              budget={selectedBudget}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-primary-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="mb-3 h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-sm">Select a publication or create a new one</p>
              <Button className="mt-4" size="sm" onClick={() => setNewModalOpen(true)}>New Budget</Button>
            </div>
          )}

          <NewBudgetModal open={newModalOpen} onClose={() => setNewModalOpen(false)} onCreate={handleCreate} />
        </>
      )}
    </div>
  );
}
