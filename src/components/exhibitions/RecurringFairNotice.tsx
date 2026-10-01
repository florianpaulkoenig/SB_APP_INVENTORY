// ---------------------------------------------------------------------------
// NOA Inventory -- Dashboard notice: recurring fairs awaiting next edition
// ---------------------------------------------------------------------------

import { Link } from 'react-router-dom';
import { useExhibitions } from '../../hooks/useExhibitions';
import { pendingRecurrences } from '../../lib/recurringFair';

export function RecurringFairNotice() {
  const { exhibitions, loading } = useExhibitions();
  if (loading) return null;
  const due = pendingRecurrences(exhibitions);
  if (due.length === 0) return null;

  return (
    <Link
      to="/exhibitions"
      className="mb-6 flex items-center justify-between gap-4 border border-black bg-white px-4 py-3 transition-colors hover:bg-primary-50"
    >
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary-400">Art fairs</p>
        <p className="mt-0.5 text-sm text-primary-900">
          {due.length === 1
            ? `"${due[0].title}" has ended — plan next year's edition?`
            : `${due.length} recurring fairs have ended — plan next year's editions?`}
        </p>
      </div>
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-900">Open →</span>
    </Link>
  );
}
