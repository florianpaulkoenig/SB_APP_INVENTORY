// ---------------------------------------------------------------------------
// DashboardSummaryCards -- KPI summary card row for the dashboard header
// ---------------------------------------------------------------------------

import { Card } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';

export interface DashboardSummaryCardsProps {
  totalArtworks: number;
  totalSold: number;
  totalRevenue: number;
  totalExpenses: number;
  openInvoicesCount: number;
  openInvoicesTotal: number;
  avgTimeToSell: number | null;
}

// Inline SVG icons (small, lightweight)
function ArtworkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="m3 16 5-5c.9-.9 2.2-.9 3.1 0l5 5" />
      <path d="m14 14 1-1c.9-.9 2.2-.9 3.1 0l2.9 2.9" />
      <circle cx="8.5" cy="8.5" r="1.5" />
    </svg>
  );
}

function SoldIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function ProfitIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
}

function StatCard({ icon, label, value, subtitle }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
            {label}
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-primary-900 leading-tight">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-primary-500">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export function DashboardSummaryCards({
  totalArtworks,
  totalSold,
  totalRevenue,
  totalExpenses,
  openInvoicesCount,
  openInvoicesTotal,
  avgTimeToSell,
}: DashboardSummaryCardsProps) {
  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        icon={<ArtworkIcon />}
        label="Total Artworks"
        value={totalArtworks.toLocaleString()}
      />
      <StatCard
        icon={<SoldIcon />}
        label="Total Sold"
        value={totalSold.toLocaleString()}
        subtitle={
          totalArtworks > 0
            ? `${((totalSold / totalArtworks) * 100).toFixed(1)}% of inventory`
            : undefined
        }
      />
      <StatCard
        icon={<RevenueIcon />}
        label="Total Revenue"
        value={formatCurrency(totalRevenue, 'EUR')}
      />
      <StatCard
        icon={<ProfitIcon />}
        label="Net Profit"
        value={formatCurrency(netProfit, 'EUR')}
        subtitle={`Expenses: ${formatCurrency(totalExpenses, 'EUR')}`}
      />
      <StatCard
        icon={<InvoiceIcon />}
        label="Open Invoices"
        value={openInvoicesCount.toLocaleString()}
        subtitle={`Total: ${formatCurrency(openInvoicesTotal, 'EUR')}`}
      />
      <StatCard
        icon={<ClockIcon />}
        label="Avg Time to Sell"
        value={avgTimeToSell != null ? `${avgTimeToSell}d` : '\u2014'}
        subtitle={avgTimeToSell != null ? 'days on average' : 'Not enough data'}
      />
    </div>
  );
}
