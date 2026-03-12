// ---------------------------------------------------------------------------
// ChartCard — Consistent wrapper for recharts visualizations
// ---------------------------------------------------------------------------

import { type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Chart height in pixels (default 300) */
  height?: number;
  /** Optional action or filter element in the header */
  action?: ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  children,
  height = 300,
  action,
  className,
}: ChartCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold text-primary-900">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-primary-400">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </Card>
  );
}
