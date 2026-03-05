import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import type { ContactRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ContactListProps {
  contacts: ContactRow[];
  onContactClick: (id: string) => void;
  loading?: boolean;
  emptyMessage?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const typeBadgeVariant: Record<ContactRow['type'], 'success' | 'warning' | 'info'> = {
  collector: 'success',
  prospect: 'warning',
  institution: 'info',
};

const typeLabel: Record<ContactRow['type'], string> = {
  collector: 'Collector',
  prospect: 'Prospect',
  institution: 'Institution',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContactList({
  contacts,
  onContactClick,
  loading = false,
  emptyMessage = 'No contacts found.',
}: ContactListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={
          <svg
            className="h-10 w-10"
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
        title={emptyMessage}
      />
    );
  }

  return (
    <div className="divide-y divide-primary-100 rounded-lg border border-primary-100 bg-white">
      {contacts.map((contact) => {
        const fullName = `${contact.first_name} ${contact.last_name}`;

        return (
          <button
            key={contact.id}
            type="button"
            onClick={() => onContactClick(contact.id)}
            className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-primary-50"
          >
            {/* Name */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary-900 truncate">
                {fullName}
              </p>
              {contact.company && (
                <p className="text-xs text-primary-500 truncate">{contact.company}</p>
              )}
            </div>

            {/* Type badge */}
            <Badge variant={typeBadgeVariant[contact.type]} className="shrink-0">
              {typeLabel[contact.type]}
            </Badge>

            {/* Email */}
            {contact.email && (
              <span className="hidden text-sm text-primary-500 truncate sm:block sm:max-w-[200px]">
                {contact.email}
              </span>
            )}

            {/* Chevron */}
            <svg
              className="h-4 w-4 shrink-0 text-primary-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
