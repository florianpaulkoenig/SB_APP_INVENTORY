import { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useInteractions } from '../../hooks/useInteractions';
import { INTERACTION_TYPES } from '../../lib/constants';
import { formatDate } from '../../lib/utils';
import type { InteractionType } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InteractionTimelineProps {
  contactId: string;
}

// ---------------------------------------------------------------------------
// Icon helpers (simple SVG per interaction type)
// ---------------------------------------------------------------------------

function InteractionIcon({ type }: { type: string }) {
  const className = 'h-4 w-4';

  switch (type) {
    case 'email':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      );
    case 'call':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
      );
    case 'meeting':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      );
    case 'note':
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Badge variant helper
// ---------------------------------------------------------------------------

function getInteractionBadgeVariant(type: string): 'default' | 'info' | 'success' | 'warning' {
  switch (type) {
    case 'email':
      return 'info';
    case 'call':
      return 'success';
    case 'meeting':
      return 'warning';
    default:
      return 'default';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InteractionTimeline({ contactId }: InteractionTimelineProps) {
  const {
    interactions,
    loading,
    createInteraction,
    deleteInteraction,
    refetch,
  } = useInteractions(contactId);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [type, setType] = useState<string>('note');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [interactionDate, setInteractionDate] = useState(
    new Date().toISOString().slice(0, 16),
  );

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // -- Handlers -------------------------------------------------------------

  function resetForm() {
    setType('note');
    setSubject('');
    setBody('');
    setInteractionDate(new Date().toISOString().slice(0, 16));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await createInteraction({
        contact_id: contactId,
        type: type as InteractionType,
        subject: subject || null,
        body: body || null,
        interaction_date: interactionDate,
      });
      if (result) {
        resetForm();
        setModalOpen(false);
        await refetch();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    const ok = await deleteInteraction(deleteId);
    if (ok) {
      setDeleteId(null);
      await refetch();
    }
  }

  // -- Loading state --------------------------------------------------------

  if (loading) {
    return (
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </section>
    );
  }

  // -- Render ---------------------------------------------------------------

  return (
    <section className="rounded-lg border border-primary-100 bg-white p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-primary-900">
          Interactions
        </h2>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          Add Interaction
        </Button>
      </div>

      {/* Content */}
      {interactions.length === 0 ? (
        <EmptyState
          title="No interactions recorded"
          description="Track emails, calls, meetings, and notes with this contact."
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
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
              />
            </svg>
          }
        />
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-primary-200" />

          <ul className="space-y-6">
            {interactions.map((interaction) => {
              const typeLabel =
                INTERACTION_TYPES.find((t) => t.value === interaction.type)
                  ?.label ?? interaction.type;

              return (
                <li key={interaction.id} className="relative pl-8 group">
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-accent bg-white" />

                  {/* Content */}
                  <div className="space-y-1">
                    {/* Date + Type */}
                    <div className="flex flex-wrap items-center gap-2">
                      <time className="text-xs font-medium text-primary-500">
                        {formatDate(interaction.interaction_date)}
                      </time>
                      <Badge variant={getInteractionBadgeVariant(interaction.type)}>
                        <span className="mr-1 inline-flex items-center">
                          <InteractionIcon type={interaction.type} />
                        </span>
                        {typeLabel}
                      </Badge>
                    </div>

                    {/* Subject */}
                    {interaction.subject && (
                      <p className="text-sm font-medium text-primary-800">
                        {interaction.subject}
                      </p>
                    )}

                    {/* Body excerpt */}
                    {interaction.body && (
                      <p className="text-xs text-primary-500 line-clamp-2">
                        {interaction.body}
                      </p>
                    )}

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => setDeleteId(interaction.id)}
                      className="text-xs text-primary-400 opacity-0 group-hover:opacity-100 hover:text-danger transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Add Interaction Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Interaction"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Type"
            options={INTERACTION_TYPES.map((t) => ({
              value: t.value,
              label: t.label,
            }))}
            value={type}
            onChange={(e) => setType(e.target.value)}
          />

          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief subject line..."
          />

          <Textarea
            label="Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Details of the interaction..."
          />

          <Input
            label="Date"
            type="datetime-local"
            value={interactionDate}
            onChange={(e) => setInteractionDate(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Interaction
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Interaction"
        message="Are you sure you want to delete this interaction? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </section>
  );
}
