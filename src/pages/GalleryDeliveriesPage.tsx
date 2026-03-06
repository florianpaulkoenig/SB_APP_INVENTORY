import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDeliveries } from '../hooks/useDeliveries';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { SearchInput } from '../components/ui/SearchInput';
import { formatDate } from '../lib/utils';

const statusVariant: Record<string, 'success' | 'default' | 'warning' | 'info'> = {
  delivered: 'success',
  in_transit: 'info',
  pending: 'warning',
  cancelled: 'default',
};

export function GalleryDeliveriesPage() {
  const { profile } = useAuth();
  const galleryId = profile?.gallery_id ?? '';
  const { deliveries, loading } = useDeliveries({ filters: { galleryId } });
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (!search.trim()) return deliveries;
    const q = search.toLowerCase();
    return deliveries.filter((d) =>
      d.delivery_number?.toLowerCase().includes(q)
    );
  }, [deliveries, search]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Deliveries</h1>
        <p className="mt-1 text-sm text-gray-500">Track your delivery shipments.</p>
      </div>

      <div className="max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by delivery number…"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No deliveries found"
          description={search ? 'Try adjusting your search.' : 'No deliveries have been created yet.'}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Delivery Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Items Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Delivery Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filtered.map((delivery) => (
                  <tr
                    key={delivery.id}
                    onClick={() => navigate(`/gallery/deliveries/${delivery.id}`)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {delivery.delivery_number}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Badge variant={statusVariant[delivery.status] ?? 'default'}>
                        {delivery.status?.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {delivery.items_count ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {delivery.delivery_date ? formatDate(delivery.delivery_date) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {delivery.created_at ? formatDate(delivery.created_at) : '—'}
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
