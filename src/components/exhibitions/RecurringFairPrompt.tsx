// ---------------------------------------------------------------------------
// NOA Inventory -- Recurring art fair follow-up
// Once an annually recurring fair has ended, ask for next year's edition:
// will Simon exhibit again, and on which dates?
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatDate } from '../../lib/utils';
import { shiftTitleYear, shiftYear } from '../../lib/recurringFair';
import type { ExhibitionRow, ExhibitionInsert } from '../../types/database';

interface RecurringFairPromptProps {
  exhibition: ExhibitionRow | null;
  /** Create next year's edition; resolves true when saved. */
  onCreateNext: (previous: ExhibitionRow, next: ExhibitionInsert) => Promise<boolean>;
  /** Simon will not exhibit again — stop asking for this fair. */
  onDecline: (previous: ExhibitionRow) => Promise<boolean>;
  /** Not now — hide until the page is opened again. */
  onLater: () => void;
}

export function RecurringFairPrompt({ exhibition, onCreateNext, onDecline, onLater }: RecurringFairPromptProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previousYear = useMemo(
    () => (exhibition?.end_date ? Number(exhibition.end_date.slice(0, 4)) : new Date().getFullYear()),
    [exhibition],
  );

  // Prefill from the edition that just ended, shifted one year ahead
  useEffect(() => {
    if (!exhibition) return;
    setTitle(shiftTitleYear(exhibition.title, previousYear));
    setStartDate(shiftYear(exhibition.start_date));
    setEndDate(shiftYear(exhibition.end_date));
    setBudget(exhibition.budget != null ? String(exhibition.budget) : '');
    setError(null);
  }, [exhibition, previousYear]);

  if (!exhibition) return null;

  async function handleCreate() {
    if (!exhibition) return;
    if (!title.trim()) { setError('Title is required.'); return; }
    if (startDate && endDate && endDate < startDate) { setError('End date must be after start date.'); return; }
    setSaving(true);
    setError(null);
    try {
      const ok = await onCreateNext(exhibition, {
        title: title.trim(),
        type: exhibition.type,
        venue: exhibition.venue,
        city: exhibition.city,
        country: exhibition.country,
        start_date: startDate || null,
        end_date: endDate || null,
        budget: budget ? parseFloat(budget) : null,
        budget_currency: exhibition.budget_currency,
        gallery_id: exhibition.gallery_id,
        contact_id: exhibition.contact_id,
        recurs_annually: true,
      });
      if (!ok) setError('Could not save the next edition. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDecline() {
    if (!exhibition) return;
    setSaving(true);
    try {
      const ok = await onDecline(exhibition);
      if (!ok) setError('Could not save your answer. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const where = [exhibition.venue, exhibition.city].filter(Boolean).join(', ');

  return (
    <Modal isOpen onClose={onLater} title="Next edition" size="lg">
      <div className="space-y-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary-400">Art fair ended</p>
          <p className="mt-1 font-display text-xl text-primary-900">{exhibition.title}</p>
          <p className="mt-1 text-sm text-primary-500">
            {where && `${where} · `}
            {exhibition.start_date && `${formatDate(exhibition.start_date)} — `}
            {exhibition.end_date && formatDate(exhibition.end_date)}
          </p>
        </div>

        <p className="text-sm text-primary-700">
          This fair repeats every year. Will Simon exhibit again in {previousYear + 1}? If so, enter the dates
          for the next edition — venue, gallery and contact are carried over.
        </p>

        <div className="space-y-4 border-t border-primary-100 pt-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={256} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`Budget${exhibition.budget_currency ? ` (${exhibition.budget_currency})` : ''}`}
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={onLater} disabled={saving}>
            Ask me later
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDecline} disabled={saving}>
              No, not exhibiting
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              Yes — create {previousYear + 1} edition
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
