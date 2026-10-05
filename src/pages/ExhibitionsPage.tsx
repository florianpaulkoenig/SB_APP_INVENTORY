import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate, todayLocal } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { useExhibitions } from '../hooks/useExhibitions';
import { EXHIBITION_TYPES, CURRENCIES } from '../lib/constants';
import { RecurringFairPrompt } from '../components/exhibitions/RecurringFairPrompt';
import { pendingRecurrences } from '../lib/recurringFair';
import {
  EXHIBITION_STATUSES, PHASES, PHASE_META, PHASE_GROUP_LABELS, DEFAULT_SORT_DIR,
  exhibitionPhase, phaseHint, sortExhibitions, filterExhibitions, exhibitionYears, countByPhase,
} from '../lib/exhibitionStatus';
import type { ExhibitionPhase, ExhibitionSortKey, SortDir } from '../lib/exhibitionStatus';
import type { ExhibitionRow, ExhibitionInsert, ExhibitionStatus } from '../types/database';

type ExhibitionType = string;

interface ExhibitionForm {
  title: string;
  type: ExhibitionType;
  status: ExhibitionStatus;
  venue: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
  budget: string;
  budget_currency: string;
  gallery_id: string;
  contact_id: string;
  catalogue_reference: string;
  notes: string;
  recurs_annually: boolean;
}

const emptyForm: ExhibitionForm = {
  title: '',
  type: '',
  status: 'confirmed',
  venue: '',
  city: '',
  country: '',
  start_date: '',
  end_date: '',
  budget: '',
  budget_currency: 'CHF',
  gallery_id: '',
  contact_id: '',
  catalogue_reference: '',
  notes: '',
  recurs_annually: false,
};

const TYPE_TABS: { label: string; value: string | null }[] = [
  { label: 'All',         value: null },
  { label: 'Exhibitions', value: 'exhibition' },
  { label: 'Art Fairs',   value: 'art_fair' },
  { label: 'Solo Shows',  value: 'solo_show' },
  { label: 'Group Shows', value: 'group_show' },
];

const STATUS_OPTIONS = EXHIBITION_STATUSES.map((s) => ({ value: s.value, label: s.label }));

const SORT_KEYS: readonly ExhibitionSortKey[] =
  ['smart', 'status', 'title', 'type', 'venue', 'location', 'start_date', 'budget'];

const isSortKey = (v: string | null): v is ExhibitionSortKey => !!v && (SORT_KEYS as readonly string[]).includes(v);
const isPhase   = (v: string): v is ExhibitionPhase => (PHASES as readonly string[]).includes(v);

// ---------------------------------------------------------------------------
// Sortable column header
// ---------------------------------------------------------------------------

function SortHeader({
  label, sortKey, active, dir, onSort,
}: {
  label: string;
  sortKey: ExhibitionSortKey;
  active: boolean;
  dir: SortDir;
  onSort: (key: ExhibitionSortKey) => void;
}) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-gray-900 ${active ? 'text-gray-900' : ''}`}
        title={`Sort by ${label.toLowerCase()}`}
      >
        {label}
        <span className={`text-[10px] ${active ? 'opacity-100' : 'opacity-30'}`} aria-hidden>
          {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ExhibitionsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { exhibitions, loading, createExhibition, updateExhibition, deleteExhibition } = useExhibitions();
  const today = todayLocal();

  // ---- Filter / sort state lives in the URL so Back restores it ------------
  const [searchParams, setSearchParams] = useSearchParams();
  const search     = searchParams.get('q') ?? '';
  const typeFilter = searchParams.get('t') || null;
  const yearParam  = searchParams.get('y');
  const yearFilter = yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : null;
  const phases     = (searchParams.get('ph') ?? '').split(',').filter(isPhase);
  const sortBy: ExhibitionSortKey = isSortKey(searchParams.get('sb')) ? (searchParams.get('sb') as ExhibitionSortKey) : 'smart';
  const sortDir: SortDir = searchParams.get('so') === 'desc' ? 'desc' : searchParams.get('so') === 'asc' ? 'asc' : DEFAULT_SORT_DIR[sortBy];

  const setParams = useCallback((patch: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') next.delete(k); else next.set(k, v);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const togglePhase = (p: ExhibitionPhase) => {
    const next = phases.includes(p) ? phases.filter((x) => x !== p) : [...phases, p];
    setParams({ ph: next.join(',') || null });
  };

  const handleSort = (key: ExhibitionSortKey) => {
    if (key === sortBy) {
      setParams({ so: sortDir === 'asc' ? 'desc' : 'asc' });
    } else {
      setParams({ sb: key === 'smart' ? null : key, so: null });
    }
  };

  const hasFilters = !!search || !!typeFilter || yearFilter !== null || phases.length > 0 || sortBy !== 'smart';
  const clearFilters = () => setParams({ q: null, t: null, y: null, ph: null, sb: null, so: null });

  // ---- Derived lists ---------------------------------------------------------
  // Counts for the status chips ignore the phase filter itself, so a chip
  // always shows how many rows it would add.
  const baseRows = useMemo(
    () => filterExhibitions(exhibitions, { type: typeFilter, year: yearFilter, search }, today),
    [exhibitions, typeFilter, yearFilter, search, today],
  );
  const phaseCounts = useMemo(() => countByPhase(baseRows, today), [baseRows, today]);
  const rows = useMemo(
    () => sortExhibitions(filterExhibitions(baseRows, { phases }, today), sortBy, sortDir, today),
    [baseRows, phases, sortBy, sortDir, today],
  );
  const years = useMemo(() => exhibitionYears(exhibitions), [exhibitions]);

  // ---- Modal / form ----------------------------------------------------------
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExhibitionForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [galleryOptions, setGalleryOptions] = useState<{ value: string; label: string }[]>([]);
  const [contactOptions, setContactOptions] = useState<{ value: string; label: string }[]>([]);
  // Follow-up for recurring fairs that have ended: ids dismissed with "later" (this visit only)
  const [recurrenceDismissed, setRecurrenceDismissed] = useState<string[]>([]);
  const recurrenceDue = loading
    ? null
    : pendingRecurrences(exhibitions).find((ex) => !recurrenceDismissed.includes(ex.id)) ?? null;

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;
      const [gRes, cRes] = await Promise.all([
        supabase.from('galleries').select('id, name').eq('user_id', uid).order('name'),
        supabase.from('contacts').select('id, first_name, last_name').eq('user_id', uid).order('last_name'),
      ]);
      setGalleryOptions((gRes.data ?? []).map((g) => ({ value: g.id, label: g.name })));
      setContactOptions((cRes.data ?? []).map((c) => ({ value: c.id, label: [c.first_name, c.last_name].filter(Boolean).join(' ') })));
    })();
  }, []);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((ex: ExhibitionRow) => {
    setEditingId(ex.id);
    setForm({
      title: ex.title || '',
      type: ex.type || '',
      status: ex.status ?? 'confirmed',
      venue: ex.venue || '',
      city: ex.city || '',
      country: ex.country || '',
      start_date: ex.start_date || '',
      end_date: ex.end_date || '',
      budget: ex.budget ? String(ex.budget) : '',
      budget_currency: ex.budget_currency || 'CHF',
      gallery_id: ex.gallery_id || '',
      contact_id: ex.contact_id || '',
      catalogue_reference: ex.catalogue_reference || '',
      notes: ex.notes || '',
      recurs_annually: ex.recurs_annually ?? false,
    });
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'error' });
      return;
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      toast({ title: 'End date must be after start date', variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type || null,
        status: form.status,
        venue: form.venue.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: form.budget ? parseFloat(form.budget) : null,
        budget_currency: form.budget_currency || null,
        gallery_id: form.gallery_id || null,
        contact_id: form.contact_id || null,
        catalogue_reference: form.catalogue_reference.trim() || null,
        notes: form.notes.trim() || null,
        recurs_annually: form.type === 'art_fair' && form.recurs_annually,
      };
      const saved = editingId
        ? await updateExhibition(editingId, payload as never)
        : await createExhibition(payload as never);
      if (saved) setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  }, [form, editingId, createExhibition, updateExhibition, toast]);

  // Inline status change from the list — no modal round-trip
  const handleStatusChange = useCallback(async (ex: ExhibitionRow, status: ExhibitionStatus) => {
    if (status === ex.status) return;
    await updateExhibition(ex.id, { status });
  }, [updateExhibition]);

  // "Yes" — create next year's edition and link it to the one that ended
  const handleCreateNextEdition = useCallback(async (previous: ExhibitionRow, next: ExhibitionInsert) => {
    const created = await createExhibition(next);
    if (!created) return false;
    await updateExhibition(previous.id, {
      recurrence_resolved_at: new Date().toISOString(),
      successor_id: created.id,
    });
    toast({ title: 'Next edition created', description: `"${created.title}" has been added.`, variant: 'success' });
    return true;
  }, [createExhibition, updateExhibition, toast]);

  // "No" — stop asking; the fair no longer counts as recurring
  const handleDeclineNextEdition = useCallback(async (previous: ExhibitionRow) => {
    const updated = await updateExhibition(previous.id, {
      recurrence_resolved_at: new Date().toISOString(),
      recurs_annually: false,
    });
    return updated != null;
  }, [updateExhibition]);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this exhibition?')) return;
    await deleteExhibition(id);
  }, [deleteExhibition]);

  const getTypeBadge = (type: string) => {
    const found = EXHIBITION_TYPES.find((t) => t.value === type);
    return found ? <Badge variant="default">{found.label}</Badge> : <span className="text-gray-400">—</span>;
  };

  if (loading) return <LoadingSpinner />;

  const COLS = 8;
  const statusSelectClass =
    'mt-1 block max-w-full cursor-pointer border-0 bg-transparent p-0 text-[11px] text-gray-400 hover:text-gray-700 focus:outline-none focus:ring-0';

  // Group separators are only meaningful in smart order
  let lastGroup: string | null = null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Exhibitions &amp; Art Fairs</h1>
        <Button onClick={openAdd} variant="primary">Add Exhibition</Button>
      </div>

      {/* ---- Toolbar: type tabs · search · year ---------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setParams({ t: tab.value })}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              typeFilter === tab.value
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setParams({ q: e.target.value })}
            placeholder="Search title, venue, city…"
            aria-label="Search exhibitions"
            className="h-9 w-56 border border-gray-300 px-3 text-sm focus:border-black focus:outline-none"
          />
          <select
            value={yearFilter ?? ''}
            onChange={(e) => setParams({ y: e.target.value || null })}
            aria-label="Filter by year"
            className="h-9 border border-gray-300 bg-white px-2 text-sm focus:border-black focus:outline-none"
          >
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ---- Status chips (multi-select) with live counts ------------------- */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">Status</span>
        {PHASES.map((p) => {
          const active = phases.includes(p);
          const count = phaseCounts[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => togglePhase(p)}
              disabled={count === 0 && !active}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                active
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
              }`}
            >
              {PHASE_META[p].label}
              <span className={`tabular-nums ${active ? 'text-gray-300' : 'text-gray-400'}`}>{count}</span>
            </button>
          );
        })}
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-2 text-xs text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
          >
            Reset
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400 tabular-nums">
          {rows.length} of {exhibitions.length}
          {sortBy === 'smart' && <span className="ml-2 text-gray-300" title="Running first, then upcoming by date, planning, past, cancelled">· smart order</span>}
        </span>
      </div>

      <Card>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-gray-500">
            {exhibitions.length === 0 ? 'No exhibitions yet.' : 'No exhibitions match the current filters.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortHeader label="Status"   sortKey="status"     active={sortBy === 'status'}     dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Title"    sortKey="title"      active={sortBy === 'title'}      dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Type"     sortKey="type"       active={sortBy === 'type'}       dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Venue"    sortKey="venue"      active={sortBy === 'venue'}      dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Location" sortKey="location"   active={sortBy === 'location'}   dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Dates"    sortKey="start_date" active={sortBy === 'start_date'} dir={sortDir} onSort={handleSort} />
                  <SortHeader label="Budget"   sortKey="budget"     active={sortBy === 'budget'}     dir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {rows.map((ex) => {
                  const phase = exhibitionPhase(ex, today);
                  const meta = PHASE_META[phase];
                  const hint = phaseHint(ex, today);
                  const inactive = meta.group === 'inactive';

                  const groupLabel = PHASE_GROUP_LABELS[meta.group];
                  const showGroup = sortBy === 'smart' && groupLabel !== lastGroup;
                  if (showGroup) lastGroup = groupLabel;

                  return (
                    <RowGroup key={ex.id} header={showGroup ? groupLabel : null} cols={COLS}>
                      <tr
                        onClick={() => navigate(`/exhibitions/${ex.id}`)}
                        className={`cursor-pointer hover:bg-gray-50 ${inactive ? 'opacity-60' : ''}`}
                      >
                        <td className="px-4 py-3 text-sm align-top">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                          {hint && <div className="mt-1 text-[11px] text-gray-500">{hint}</div>}
                          <select
                            value={ex.status ?? 'confirmed'}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleStatusChange(ex, e.target.value as ExhibitionStatus)}
                            aria-label={`Change status of ${ex.title}`}
                            title="Change status"
                            className={statusSelectClass}
                          >
                            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium text-gray-900 ${phase === 'cancelled' ? 'line-through decoration-gray-400' : ''}`}>
                          {ex.title}
                          {ex.recurs_annually && (
                            <span className="ml-2 text-[9px] font-medium uppercase tracking-[0.2em] text-primary-400" title="Repeats annually">
                              Annual
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{getTypeBadge(ex.type)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{ex.venue || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {[ex.city, ex.country].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {ex.start_date ? formatDate(ex.start_date) : '—'}
                          {ex.end_date ? ` — ${formatDate(ex.end_date)}` : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">
                          {ex.budget ? formatCurrency(ex.budget, ex.budget_currency ?? 'EUR') : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEdit(ex); }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="primary"
                              onClick={(e: React.MouseEvent) => handleDelete(ex.id, e)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    </RowGroup>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Exhibition' : 'Add Exhibition'}>
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={256} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[{value: '', label: 'Select type'}, ...EXHIBITION_TYPES]} />
            <div>
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ExhibitionStatus })}
                options={STATUS_OPTIONS}
              />
              <p className="mt-1 text-xs text-gray-500">
                {EXHIBITION_STATUSES.find((s) => s.value === form.status)?.hint}
                {form.status === 'confirmed' && ' — shown as upcoming, running or completed by date.'}
              </p>
            </div>
          </div>
          {form.type === 'art_fair' && (
            <label className="flex cursor-pointer items-start gap-3 border border-primary-200 px-4 py-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-black"
                checked={form.recurs_annually}
                onChange={(e) => setForm({ ...form, recurs_annually: e.target.checked })}
              />
              <span>
                <span className="block text-sm font-medium text-primary-900">Repeats annually</span>
                <span className="block text-xs text-primary-500">
                  Once this edition has ended, you will be asked for next year's dates and whether Simon exhibits again.
                </span>
              </span>
            </label>
          )}
          <Input label="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} maxLength={256} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={256} />
            <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} maxLength={256} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Budget" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            <Select label="Currency" value={form.budget_currency} onChange={(e) => setForm({ ...form, budget_currency: e.target.value })} options={CURRENCIES} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Gallery" value={form.gallery_id} onChange={(e) => setForm({ ...form, gallery_id: e.target.value })} options={[{ value: '', label: 'None' }, ...galleryOptions]} />
            <Select label="Contact" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })} options={[{ value: '', label: 'None' }, ...contactOptions]} />
          </div>
          <Input label="Catalogue Reference" value={form.catalogue_reference} onChange={(e) => setForm({ ...form, catalogue_reference: e.target.value })} maxLength={256} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              maxLength={5000}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="primary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      <RecurringFairPrompt
        exhibition={modalOpen ? null : recurrenceDue}
        onCreateNext={handleCreateNextEdition}
        onDecline={handleDeclineNextEdition}
        onLater={() => recurrenceDue && setRecurrenceDismissed((ids) => [...ids, recurrenceDue.id])}
      />
    </div>
  );
}

/** A table row optionally preceded by a thin group header (smart order only). */
function RowGroup({ header, cols, children }: { header: string | null; cols: number; children: React.ReactNode }) {
  return (
    <>
      {header && (
        <tr className="bg-gray-50/80">
          <td colSpan={cols} className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">
            {header}
          </td>
        </tr>
      )}
      {children}
    </>
  );
}
