import { useNavigate, useParams } from 'react-router-dom';
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
      </div>
    </div>
  );
}
