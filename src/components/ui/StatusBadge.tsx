import { getStatusColor } from '../../lib/utils';
import { Badge } from './Badge';

export interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClasses = getStatusColor(status);

  // Format display label: "in_production" -> "In Production"
  const label = status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <Badge className={colorClasses}>
      {label}
    </Badge>
  );
}
