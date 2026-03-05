import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useContact, useContacts } from '../hooks/useContacts';
import { ContactForm } from '../components/crm/ContactForm';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { ContactInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ContactEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateContact } = useContacts();

  const { contact, loading: fetchLoading } = useContact(id!);
  const [saving, setSaving] = useState(false);

  // ---- Submit handler -----------------------------------------------------

  async function handleSubmit(data: ContactInsert) {
    if (!id) return;

    setSaving(true);
    const updated = await updateContact(id, data);
    setSaving(false);

    if (updated) {
      navigate(`/contacts/${id}`);
    }
  }

  // ---- Loading state ------------------------------------------------------

  if (fetchLoading) {
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
          The contact you are looking for does not exist.
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
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/contacts/${id}`)}
          className="mb-4"
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
          Back to Contact
        </Button>

        <h1 className="font-display text-2xl font-bold text-primary-900">
          Edit Contact
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Update information for "{contact.first_name} {contact.last_name}".
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl rounded-lg border border-primary-100 bg-white p-6">
        <ContactForm
          contact={contact}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/contacts/${id}`)}
          loading={saving}
        />
      </div>
    </div>
  );
}
