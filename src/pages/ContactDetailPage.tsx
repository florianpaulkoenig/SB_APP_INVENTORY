import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useContact } from '../hooks/useContacts';
import { useContacts } from '../hooks/useContacts';
import { useContactDeals } from '../hooks/useDeals';
import { useCollectorJourney } from '../hooks/useCollectorJourney';
import type { JourneyEvent } from '../hooks/useCollectorJourney';
import { ContactDetail } from '../components/crm/ContactDetail';
import { InteractionTimeline } from '../components/crm/InteractionTimeline';
import { TaskList } from '../components/crm/TaskList';
import { WishListView } from '../components/crm/WishListView';
import { DealCard } from '../components/crm/DealCard';
import { Button } from '../components/ui/Button';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDate, formatCurrency } from '../lib/utils';
import type { ProductionOrderRow } from '../types/database';

// ---------------------------------------------------------------------------
// Journey event type badge colors
// ---------------------------------------------------------------------------

const JOURNEY_TYPE_CONFIG: Record<
  JourneyEvent['type'],
  { label: string; bg: string; text: string; dot: string }
> = {
  enquiry: { label: 'Enquiry', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  interaction: { label: 'Interaction', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  viewing_room: { label: 'Viewing Room', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  deal: { label: 'Deal', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  sale: { label: 'Sale', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  wishlist: { label: 'Wish List', bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-500' },
};

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

  const { data: journeyData, loading: journeyLoading } = useCollectorJourney(id!);

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
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Contacts', href: '/contacts' },
          { label: `${contact.first_name} ${contact.last_name}` },
        ]}
        className="mb-4"
      />

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

        {/* Collector Journey */}
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Collector Journey
          </h2>

          {journeyLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          )}

          {!journeyLoading && (!journeyData || journeyData.events.length === 0) && (
            <p className="text-sm text-primary-400">
              No journey events recorded for this contact.
            </p>
          )}

          {!journeyLoading && journeyData && journeyData.events.length > 0 && (
            <div>
              {/* Journey Stats */}
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-primary-100 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                    Total Touchpoints
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-primary-900">
                    {journeyData.totalTouchpoints}
                  </p>
                </div>
                <div className="rounded-lg border border-primary-100 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                    Journey Duration
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-primary-900">
                    {journeyData.journeyDurationDays}{' '}
                    <span className="text-sm font-normal text-primary-500">days</span>
                  </p>
                  {journeyData.avgDaysBetweenTouchpoints != null && (
                    <p className="mt-0.5 text-xs text-primary-400">
                      ~{journeyData.avgDaysBetweenTouchpoints} days between touchpoints
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-primary-100 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                    Total Spent
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-primary-900">
                    {journeyData.totalSpent > 0
                      ? formatCurrency(journeyData.totalSpent, 'EUR')
                      : '--'}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-3 top-2 bottom-2 w-px bg-primary-200" />

                <div className="space-y-4">
                  {journeyData.events.map((event) => {
                    const config = JOURNEY_TYPE_CONFIG[event.type];
                    return (
                      <div key={event.id} className="relative flex gap-4 pl-8">
                        {/* Dot */}
                        <div
                          className={`absolute left-1.5 top-1.5 h-3 w-3 rounded-full ring-2 ring-white ${config.dot}`}
                        />

                        {/* Content */}
                        <div className="min-w-0 flex-1 rounded-lg border border-primary-100 bg-white p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${config.bg} ${config.text}`}
                            >
                              {config.label}
                            </span>
                            <span className="text-xs text-primary-400">
                              {formatDate(event.date)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-primary-900">
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="mt-0.5 text-xs text-primary-500 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          {event.value != null && (
                            <p className="mt-1 text-xs font-medium text-primary-700">
                              {formatCurrency(event.value, event.currency || 'EUR')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
