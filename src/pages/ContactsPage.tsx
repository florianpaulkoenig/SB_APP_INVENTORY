import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContacts } from '../hooks/useContacts';
import { ContactCard } from '../components/crm/ContactCard';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Select';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { CONTACT_TYPES } from '../lib/constants';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 24;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ContactsPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const { contacts, loading, totalCount } = useContacts({
    filters: {
      search,
      type: typeFilter || undefined,
    },
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Reset to page 1 when search or filter changes
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleTypeChange(value: string) {
    setTypeFilter(value);
    setPage(1);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Manage collectors, prospects, and institutional contacts.
          </p>
        </div>

        <Button onClick={() => navigate('/contacts/new')}>
          New Contact
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search contacts by name, company, or email..."
          className="max-w-md"
        />

        <div className="w-full sm:w-48">
          <Select
            options={[...CONTACT_TYPES]}
            value={typeFilter}
            onChange={(e) => handleTypeChange(e.target.value)}
            placeholder="All Types"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && contacts.length === 0 && (
        <EmptyState
          icon={
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          }
          title={search || typeFilter ? 'No contacts found' : 'No contacts yet'}
          description={
            search || typeFilter
              ? 'Try adjusting your search terms or filters.'
              : 'Add your first contact to start building your CRM.'
          }
          action={
            !search && !typeFilter ? (
              <Button onClick={() => navigate('/contacts/new')}>
                Add First Contact
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Contact grid */}
      {!loading && contacts.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onClick={() => navigate(`/contacts/${contact.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
