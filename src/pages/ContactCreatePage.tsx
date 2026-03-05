import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContacts } from '../hooks/useContacts';
import { ContactForm } from '../components/crm/ContactForm';
import { Button } from '../components/ui/Button';
import type { ContactInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ContactCreatePage() {
  const navigate = useNavigate();
  const { createContact } = useContacts();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: ContactInsert) {
    setLoading(true);
    const created = await createContact(data);
    setLoading(false);

    if (created) {
      navigate(`/contacts/${created.id}`);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/contacts')}
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
          Back to Contacts
        </Button>

        <h1 className="font-display text-2xl font-bold text-primary-900">
          New Contact
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Add a new collector, prospect, or institutional contact.
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl rounded-lg border border-primary-100 bg-white p-6">
        <ContactForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/contacts')}
          loading={loading}
        />
      </div>
    </div>
  );
}
