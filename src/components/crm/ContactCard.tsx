import { memo } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { ContactRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ContactCardProps {
  contact: ContactRow;
  onClick?: () => void;
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

export const ContactCard = memo(function ContactCard({ contact, onClick }: ContactCardProps) {
  const fullName = `${contact.first_name} ${contact.last_name}`;
  const location = [contact.city, contact.country].filter(Boolean).join(', ');

  return (
    <Card hoverable onClick={onClick} className="p-5">
      {/* Name & type */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-primary-900 truncate">
          {fullName}
        </h3>
        <Badge variant={typeBadgeVariant[contact.type]} className="shrink-0">
          {typeLabel[contact.type]}
        </Badge>
      </div>

      {/* Company */}
      {contact.company && (
        <p className="mt-1 text-sm text-primary-500 truncate">{contact.company}</p>
      )}

      {/* Contact info */}
      <div className="mt-3 space-y-1">
        {contact.email && (
          <div className="flex items-center gap-2 text-sm text-primary-600">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            <span className="truncate">{contact.email}</span>
          </div>
        )}

        {contact.phone && (
          <div className="flex items-center gap-2 text-sm text-primary-600">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
              />
            </svg>
            <span className="truncate">{contact.phone}</span>
          </div>
        )}

        {location && (
          <div className="flex items-center gap-2 text-sm text-primary-600">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
            <span className="truncate">{location}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {contact.tags.map((tag) => (
            <span
              key={tag}
              className="inline-block rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
});
