// ---------------------------------------------------------------------------
// KpiCard — Unified KPI card for analytics dashboards
// ---------------------------------------------------------------------------

import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';
import { TrendIndicator } from './TrendIndicator';

export interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: number | null;
  trendLabel?: string;
  subtitle?: string;
  color?: 'default' | 'green' | 'amber' | 'red' | 'blue';
  className?: string;
}

const COLOR_MAP = {
  default: 'bg-primary-100 text-primary-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
} as const;

export function KpiCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  subtitle,
  color = 'default',
  className,
}: KpiCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start gap-4">
        {icon && (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              COLOR_MAP[color],
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
            {label}
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-primary-900 leading-tight">
            {typeof value === 'number' ? value.toLocaleString('de-CH') : value}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {trend != null && <TrendIndicator value={trend} label={trendLabel} />}
            {subtitle && (
              <p className="text-xs text-primary-500">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
