import { useState } from 'react';
import { useEmailLog } from '../hooks/useEmailLog';
import { EmailLogList } from '../components/email/EmailLogList';
import { EmailComposer } from '../components/email/EmailComposer';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { EMAIL_TEMPLATES, EMAIL_STATUSES } from '../lib/constants';
import { formatDate } from '../lib/utils';
import type { EmailLogRow, EmailStatus } from '../types/database';

// ---------------------------------------------------------------------------
// Status badge variant helper (same logic as EmailLogList for consistency)
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
// Page
// ---------------------------------------------------------------------------

export function EmailLogPage() {
  // ---- Filters ------------------------------------------------------------

  const [search, setSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { emails, loading, refetch } = useEmailLog({
    filters: {
      search: search || undefined,
      templateType: templateFilter || undefined,
      status: (statusFilter || undefined) as EmailStatus | undefined,
    },
  });

  // ---- Modals -------------------------------------------------------------

  const [composeOpen, setComposeOpen] = useState(false);
  const [detailEmail, setDetailEmail] = useState<(EmailLogRow & { contacts?: { first_name: string; last_name: string } | null }) | null>(null);

  // ---- Handlers -----------------------------------------------------------

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleTemplateChange(value: string) {
    setTemplateFilter(value);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
  }

  function handleComposeSent() {
    setComposeOpen(false);
    refetch();
  }

  function handleViewEmail(email: EmailLogRow & { contacts?: { first_name: string; last_name: string } | null }) {
    setDetailEmail(email);
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Email Log
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            View sent emails and compose new messages.
          </p>
        </div>

        <Button onClick={() => setComposeOpen(true)}>
          Compose Email
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by subject or recipient..."
          className="max-w-md"
        />

        <div className="w-48">
          <Select
            options={[...EMAIL_TEMPLATES]}
            value={templateFilter}
            onChange={(e) => handleTemplateChange(e.target.value)}
            placeholder="All Templates"
          />
        </div>

        <div className="w-48">
          <Select
            options={[...EMAIL_STATUSES]}
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            placeholder="All Statuses"
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
      {!loading && emails.length === 0 && (
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
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          }
          title={search || templateFilter || statusFilter ? 'No emails found' : 'No emails yet'}
          description={
            search || templateFilter || statusFilter
              ? 'Try adjusting your search terms or filters.'
              : 'Compose your first email to start building your email log.'
          }
          action={
            !search && !templateFilter && !statusFilter ? (
              <Button onClick={() => setComposeOpen(true)}>
                Compose First Email
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Email list */}
      {!loading && emails.length > 0 && (
        <EmailLogList
          emails={emails}
          onViewEmail={handleViewEmail}
        />
      )}

      {/* Compose modal */}
      <Modal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Compose Email"
        size="xl"
      >
        <EmailComposer
          onSent={handleComposeSent}
          onCancel={() => setComposeOpen(false)}
        />
      </Modal>

      {/* Detail modal */}
      <Modal
        isOpen={!!detailEmail}
        onClose={() => setDetailEmail(null)}
        title="Email Details"
        size="lg"
      >
        {detailEmail && (
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(detailEmail.status)}>
                {getStatusLabel(detailEmail.status)}
              </Badge>
              {detailEmail.template_type && (
                <Badge>{getTemplateLabel(detailEmail.template_type)}</Badge>
              )}
            </div>

            {/* Meta fields */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                  From
                </p>
                <p className="mt-0.5 text-sm text-primary-800">
                  {detailEmail.from_email}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                  To
                </p>
                <p className="mt-0.5 text-sm text-primary-800">
                  {detailEmail.to_email}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                  Sent
                </p>
                <p className="mt-0.5 text-sm text-primary-800">
                  {formatDate(detailEmail.sent_at)}
                </p>
              </div>

              {detailEmail.contacts && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                    Contact
                  </p>
                  <p className="mt-0.5 text-sm text-primary-800">
                    {detailEmail.contacts.first_name} {detailEmail.contacts.last_name}
                  </p>
                </div>
              )}
            </div>

            {/* Subject */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                Subject
              </p>
              <p className="mt-0.5 text-sm font-medium text-primary-900">
                {detailEmail.subject}
              </p>
            </div>

            {/* Body preview */}
            {detailEmail.body_preview && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                  Body
                </p>
                <pre className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-primary-100 bg-primary-50 p-3 text-sm text-primary-700">
                  {detailEmail.body_preview}
                </pre>
              </div>
            )}

            {/* Linked artworks */}
            {detailEmail.artwork_ids && detailEmail.artwork_ids.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                  Linked Artworks
                </p>
                <p className="mt-0.5 text-sm text-primary-600">
                  {detailEmail.artwork_ids.length} artwork{detailEmail.artwork_ids.length !== 1 ? 's' : ''} linked
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
