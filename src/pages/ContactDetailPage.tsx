import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useContact } from '../hooks/useContacts';
import { useContacts } from '../hooks/useContacts';
import { useContactDeals } from '../hooks/useDeals';
import { ContactDetail } from '../components/crm/ContactDetail';
import { InteractionTimeline } from '../components/crm/InteractionTimeline';
import { TaskList } from '../components/crm/TaskList';
import { WishListView } from '../components/crm/WishListView';
import { DealCard } from '../components/crm/DealCard';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDate, formatCurrency } from '../lib/utils';
import type { ProductionOrderRow } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteContact } = useContacts();

  const { contact, loading } = useContact(id!);
  const {
    deals,
    loading: dealsLoading,
    updateDeal,
    deleteDeal,
  } = useContactDeals(id!);

  // ---- Production orders linked to this contact ----------------------------
  const [productionOrders, setProductionOrders] = useState<ProductionOrderRow[]>([]);
  const [productionLoading, setProductionLoading] = useState(true);

  const fetchProductionOrders = useCallback(async () => {
    if (!id) return;
    setProductionLoading(true);

    const { data } = await supabase
      .from('production_orders')
      .select('*')
      .eq('contact_id', id)
      .order('created_at', { ascending: false });

    setProductionOrders((data as ProductionOrderRow[]) ?? []);
    setProductionLoading(false);
  }, [id]);

  useEffect(() => {
    fetchProductionOrders();
  }, [fetchProductionOrders]);

  // ---- Delete handler -----------------------------------------------------

  async function handleDelete() {
    if (!id) return;

    const success = await deleteContact(id);
    if (success) {
      navigate('/contacts');
    }
  }

  // ---- Loading state ------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ---- Not found state ----------------------------------------------------

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="font-display text-xl font-semibold text-primary-900">
          Contact not found
        </h2>
        <p className="mt-2 text-sm text-primary-500">
          The contact you are looking for does not exist or has been deleted.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/contacts')}
          className="mt-6"
        >
          Back to Contacts
        </Button>
      </div>
    );
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/contacts')}
        className="mb-6"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        Back to Contacts
      </Button>

      {/* Contact detail */}
      <ContactDetail
        contact={contact}
        onEdit={() => navigate(`/contacts/${id}/edit`)}
        onDelete={handleDelete}
      />

      {/* CRM Sections */}
      <div className="mt-8 space-y-8">
        {/* Interaction Timeline */}
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Interactions
          </h2>
          <InteractionTimeline contactId={id!} />
        </section>

        {/* Tasks */}
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Tasks
          </h2>
          <TaskList contactId={id!} />
        </section>

        {/* Wish List */}
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Wish List
          </h2>
          <WishListView contactId={id!} />
        </section>

        {/* Deals */}
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Deals
          </h2>

          {dealsLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          )}

          {!dealsLoading && deals.length === 0 && (
            <p className="text-sm text-primary-400">
              No deals associated with this contact.
            </p>
          )}

          {!dealsLoading && deals.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {deals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onEdit={() => navigate(`/contacts/${id}`)}
                  onDelete={async () => {
                    await deleteDeal(deal.id);
                  }}
                  onStageChange={async (newStage) => {
                    await updateDeal(deal.id, { stage: newStage as any });
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Production Orders */}
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Production Orders
            {!productionLoading && productionOrders.length > 0 && (
              <span className="ml-2 text-sm font-normal text-primary-400">
                ({productionOrders.length})
              </span>
            )}
          </h2>

          {productionLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          )}

          {!productionLoading && productionOrders.length === 0 && (
            <p className="text-sm text-primary-400">
              No production orders linked to this contact.
            </p>
          )}

          {!productionLoading && productionOrders.length > 0 && (
            <div className="space-y-3">
              {productionOrders.map((po) => (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => navigate(`/production/${po.id}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary-100 bg-white p-3 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary-900">
                      {po.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-primary-400">
                      {po.order_number}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={po.status} />
                      {po.ordered_date && (
                        <span className="text-xs text-primary-500">
                          {formatDate(po.ordered_date)}
                        </span>
                      )}
                      {po.price != null && (
                        <span className="text-xs font-medium text-primary-700">
                          {formatCurrency(po.price, po.currency)}
                        </span>
                      )}
                    </div>
                  </div>

                  <svg
                    className="h-4 w-4 flex-shrink-0 text-primary-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
