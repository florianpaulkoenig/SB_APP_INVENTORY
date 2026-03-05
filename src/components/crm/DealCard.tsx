import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { DEAL_STAGES } from '../../lib/constants';
import { formatCurrency, truncate, formatDate } from '../../lib/utils';
import type { DealRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DealCardProps {
  deal: DealRow;
  contactName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onStageChange: (newStage: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DealCard({
  deal,
  contactName,
  onEdit,
  onDelete,
  onStageChange,
}: DealCardProps) {
  const stageInfo = DEAL_STAGES.find((s) => s.value === deal.stage);

  return (
    <div className="rounded-lg border border-primary-100 bg-white p-4 space-y-3">
      {/* Stage badge + value */}
      <div className="flex items-start justify-between gap-2">
        <Badge className={stageInfo?.color ?? 'bg-gray-100 text-gray-800'}>
          {stageInfo?.label ?? deal.stage}
        </Badge>

        {deal.value != null && deal.currency && (
          <span className="text-sm font-semibold text-primary-900 whitespace-nowrap">
            {formatCurrency(deal.value, deal.currency)}
          </span>
        )}
      </div>

      {/* Contact name */}
      {contactName && (
        <p className="text-sm font-medium text-primary-800">{contactName}</p>
      )}

      {/* Notes */}
      {deal.notes && (
        <p className="text-xs text-primary-500">
          {truncate(deal.notes, 80)}
        </p>
      )}

      {/* Created date */}
      <p className="text-xs text-primary-400">
        Created {formatDate(deal.created_at)}
      </p>

      {/* Stage change */}
      <Select
        options={DEAL_STAGES.map((s) => ({ value: s.value, label: s.label }))}
        value={deal.stage}
        onChange={(e) => onStageChange(e.target.value)}
        className="text-xs"
      />

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-danger hover:text-red-700">
          Delete
        </Button>
      </div>
    </div>
  );
}
