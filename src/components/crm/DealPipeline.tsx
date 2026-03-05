import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { DEAL_STAGES } from '../../lib/constants';
import { formatCurrency, truncate, formatDate } from '../../lib/utils';
import type { DealRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DealPipelineProps {
  deals: DealRow[];
  onDealClick: (deal: DealRow) => void;
  onStageChange: (dealId: string, newStage: string) => void;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DealPipeline({
  deals,
  onDealClick,
  onStageChange,
  loading,
}: DealPipelineProps) {
  // -- Loading state --------------------------------------------------------
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
        {DEAL_STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.value);

          return (
            <div
              key={stage.value}
              className="min-w-[220px] w-[220px] flex-shrink-0 rounded-lg border border-primary-100 bg-primary-50"
            >
              {/* Column header */}
              <div className="px-3 py-2.5 border-b border-primary-100">
                <div className="flex items-center justify-between">
                  <Badge className={stage.color}>{stage.label}</Badge>
                  <span className="text-xs font-medium text-primary-500">
                    {stageDeals.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto">
                {stageDeals.length === 0 && (
                  <p className="py-6 text-center text-xs text-primary-400">
                    No deals
                  </p>
                )}

                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-md border border-primary-100 bg-white p-3 space-y-1 cursor-pointer hover:border-accent/40 transition-colors"
                    onClick={() => onDealClick(deal)}
                  >
                    {/* Value */}
                    {deal.value != null && deal.currency && (
                      <p className="text-sm font-semibold text-primary-900">
                        {formatCurrency(deal.value, deal.currency)}
                      </p>
                    )}

                    {/* Notes preview */}
                    {deal.notes && (
                      <p className="text-xs text-primary-600">
                        {truncate(deal.notes, 60)}
                      </p>
                    )}

                    {/* Created date */}
                    <p className="text-xs text-primary-400">
                      {formatDate(deal.created_at)}
                    </p>

                    {/* Stage change dropdown */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-1"
                    >
                      <Select
                        options={DEAL_STAGES.map((s) => ({
                          value: s.value,
                          label: s.label,
                        }))}
                        value={deal.stage}
                        onChange={(e) =>
                          onStageChange(deal.id, e.target.value)
                        }
                        className="text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
