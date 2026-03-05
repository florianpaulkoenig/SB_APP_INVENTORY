import { Badge } from '../ui/Badge';
import { formatDate, truncate } from '../../lib/utils';
import { EMAIL_STATUSES, EMAIL_TEMPLATES } from '../../lib/constants';
import type { EmailLogRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EmailLogListProps {
  emails: Array<EmailLogRow & { contacts?: { first_name: string; last_name: string } | null }>;
  onViewEmail?: (email: EmailLogRow) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusBadgeVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  switch (status) {
    case 'sent':
      return 'success';
    case 'failed':
      return 'danger';
    case 'bounced':
      return 'warning';
    default:
      return 'default';
  }
}

function getStatusLabel(status: string): string {
  const match = EMAIL_STATUSES.find((s) => s.value === status);
  return match?.label ?? status;
}

function getTemplateLabel(templateType: string | null): string {
  if (!templateType) return '\u2014';
  const match = EMAIL_TEMPLATES.find((t) => t.value === templateType);
  return match?.label ?? templateType;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmailLogList({ emails, onViewEmail }: EmailLogListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px]">
        {/* Header */}
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
              To
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
              Subject
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
              Template
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
              Contact
            </th>
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {emails.map((email) => (
            <tr
              key={email.id}
              onClick={() => onViewEmail?.(email)}
              className="cursor-pointer border-b border-primary-100 transition-colors hover:bg-primary-50"
            >
              {/* Date */}
              <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                {formatDate(email.sent_at)}
              </td>

              {/* To */}
              <td className="px-4 py-3 text-sm text-primary-800">
                {email.to_email}
              </td>

              {/* Subject */}
              <td className="px-4 py-3 text-sm text-primary-700">
                {truncate(email.subject, 50)}
              </td>

              {/* Template */}
              <td className="px-4 py-3 text-sm text-primary-600">
                {getTemplateLabel(email.template_type)}
              </td>

              {/* Status */}
              <td className="px-4 py-3">
                <Badge variant={getStatusBadgeVariant(email.status)}>
                  {getStatusLabel(email.status)}
                </Badge>
              </td>

              {/* Contact */}
              <td className="px-4 py-3 text-sm text-primary-600">
                {email.contacts
                  ? `${email.contacts.first_name} ${email.contacts.last_name}`
                  : '\u2014'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty state */}
      {emails.length === 0 && (
        <div className="py-12 text-center text-sm text-primary-400">
          No emails found.
        </div>
      )}
    </div>
  );
}
