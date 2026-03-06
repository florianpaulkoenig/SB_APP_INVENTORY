import { useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useSaleRequests } from '../hooks/useSaleRequests';
import { formatCurrency, formatDate } from '../lib/utils';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_BADGE_VARIANT: Record<string, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export function SaleRequestsPage() {
  const { requests, loading, approveRequest, rejectRequest } = useSaleRequests();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredRequests =
    statusFilter === 'all' ? requests : requests.filter((r) => r.status === statusFilter);

  const handleApprove = useCallback(
    async (id: string) => {
      setActionLoading(id);
      await approveRequest(id);
      setActionLoading(null);
    },
    [approveRequest]
  );

  const handleReject = useCallback(
    async (id: string) => {
      if (!rejectReason.trim()) return;
      setActionLoading(id);
      await rejectRequest(id, rejectReason.trim());
      setRejectingId(null);
      setRejectReason('');
      setActionLoading(null);
    },
    [rejectRequest, rejectReason]
  );

  const tabs: { label: string; value: StatusFilter; count: number }[] = [
    { label: 'All', value: 'all', count: requests.length },
    { label: 'Pending', value: 'pending', count: requests.filter((r) => r.status === 'pending').length },
    { label: 'Approved', value: 'approved', count: requests.filter((r) => r.status === 'approved').length },
    { label: 'Rejected', value: 'rejected', count: requests.filter((r) => r.status === 'rejected').length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sale Requests</h1>
        <p className="mt-1 text-sm text-gray-500">Review and approve gallery sale requests.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === tab.value
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs ${
                statusFilter === tab.value ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          title="No sale requests"
          description={
            statusFilter === 'all'
              ? 'No sale requests have been submitted yet.'
              : `No ${statusFilter} sale requests.`
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Artwork</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Gallery</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Price</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Buyer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {request.artworks?.title || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {request.artworks?.reference_code || '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {request.galleries?.name || '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatCurrency(request.realized_price, request.currency)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {request.buyer_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE_VARIANT[request.status]}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(request.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {request.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          {rejectingId === request.id ? (
                            <div className="flex items-center gap-2">
                              <textarea
                                className="w-48 rounded-md border border-gray-300 px-2 py-1 text-xs shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                                rows={2}
                                placeholder="Reason for rejection..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectReason('');
                                }}
                                disabled={actionLoading === request.id}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(request.id)}
                                disabled={
                                  actionLoading === request.id || !rejectReason.trim()
                                }
                              >
                                {actionLoading === request.id ? 'Rejecting...' : 'Confirm'}
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApprove(request.id)}
                                disabled={actionLoading === request.id}
                              >
                                {actionLoading === request.id ? 'Approving...' : 'Approve'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setRejectingId(request.id)}
                                disabled={actionLoading === request.id}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                      {request.status !== 'pending' && request.admin_notes && (
                        <p className="text-xs text-gray-500 text-right italic">
                          {request.admin_notes}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
