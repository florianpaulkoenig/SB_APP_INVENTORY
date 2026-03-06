import { useParams, useNavigate } from 'react-router-dom';
import { useDelivery, useDeliveryItems } from '../hooks/useDeliveries';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate } from '../lib/utils';
// Arrow-left icon rendered inline below (no lucide dependency)

const statusVariant: Record<string, 'success' | 'default' | 'warning' | 'info'> = {
  delivered: 'success',
  in_transit: 'info',
  pending: 'warning',
  cancelled: 'default',
};

export function GalleryDeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { delivery, loading: deliveryLoading } = useDelivery(id!);
  const { items, loading: itemsLoading } = useDeliveryItems(id!);

  if (deliveryLoading || itemsLoading) {
    return <LoadingSpinner />;
  }

  if (!delivery) {
    return (
      <EmptyState
        title="Delivery not found"
        description="The delivery you are looking for does not exist or you do not have access."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/gallery/deliveries')}>
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Delivery {delivery.delivery_number}
          </h1>
        </div>
      </div>

      <Card>
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Delivery Information</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Delivery Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{delivery.delivery_number}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <Badge variant={statusVariant[delivery.status] ?? 'default'}>
                  {delivery.status?.replace(/_/g, ' ')}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Delivery Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {delivery.delivery_date ? formatDate(delivery.delivery_date) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {delivery.created_at ? formatDate(delivery.created_at) : '—'}
              </dd>
            </div>
            {delivery.notes && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {delivery.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Items</h2>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500">No items in this delivery.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Artwork Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Reference Code
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {item.artwork?.title ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {item.artwork?.reference_code ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
