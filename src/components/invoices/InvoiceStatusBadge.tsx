import { INVOICE_STATUSES } from '../../lib/constants';
import { Badge } from '../ui/Badge';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InvoiceStatusBadgeProps {
  status: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const match = INVOICE_STATUSES.find((s) => s.value === status);
  const colorClasses = match?.color ?? 'bg-gray-100 text-gray-800';

  const label = match?.label ?? status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <Badge className={colorClasses}>
      {label}
    </Badge>
  );
}
