import { useState } from 'react';
import { useReminders } from '../../hooks/useReminders';
import { formatDate } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Tabs } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { ReminderType, ReminderRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  consignment_followup: 'Consignment Follow-up',
  loan_return: 'Loan Return',
  invoice_overdue: 'Invoice Overdue',
  task_due: 'Task Due',
};

const REMINDER_TYPE_BADGE_VARIANT: Record<ReminderType, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  consignment_followup: 'info',
  loan_return: 'warning',
  invoice_overdue: 'danger',
  task_due: 'default',
};

const TYPE_OPTIONS = [
  { value: 'consignment_followup', label: 'Consignment Follow-up' },
  { value: 'loan_return', label: 'Loan Return' },
  { value: 'invoice_overdue', label: 'Invoice Overdue' },
  { value: 'task_due', label: 'Task Due' },
];

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'sent', label: 'Sent' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReminderSettings() {
  const [activeTab, setActiveTab] = useState('pending');

  const isSentTab = activeTab === 'sent';

  const { reminders, loading, createReminder, deleteReminder, markSent, refetch } =
    useReminders({ sent: isSentTab });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formType, setFormType] = useState<ReminderType>('consignment_followup');
  const [formEntityType, setFormEntityType] = useState('');
  const [formEntityId, setFormEntityId] = useState('');
  const [formTriggerDate, setFormTriggerDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // -- Helpers --------------------------------------------------------------

  function resetForm() {
    setFormType('consignment_followup');
    setFormEntityType('');
    setFormEntityId('');
    setFormTriggerDate('');
    setFormNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formEntityType.trim() || !formEntityId.trim() || !formTriggerDate) return;

    setSaving(true);
    try {
      const result = await createReminder({
        type: formType,
        entity_type: formEntityType.trim(),
        entity_id: formEntityId.trim(),
        trigger_date: formTriggerDate,
        notes: formNotes.trim() || null,
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

  async function handleMarkSent(id: string) {
    await markSent(id);
    await refetch();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const ok = await deleteReminder(deleteId);
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
          Reminders
        </h2>
        {!isSentTab && (
          <Button size="sm" onClick={() => setModalOpen(true)}>
            Add Reminder
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-4" />

      {/* Content */}
      {reminders.length === 0 ? (
        <EmptyState
          title={isSentTab ? 'No sent reminders' : 'No pending reminders'}
          description={
            isSentTab
              ? 'Reminders you mark as sent will appear here.'
              : 'Create reminders to track follow-ups, loan returns, and overdue invoices.'
          }
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
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
          }
        />
      ) : (
        <ul className="divide-y divide-primary-100">
          {reminders.map((reminder) => (
            <ReminderItem
              key={reminder.id}
              reminder={reminder}
              readOnly={isSentTab}
              onMarkSent={handleMarkSent}
              onDelete={setDeleteId}
            />
          ))}
        </ul>
      )}

      {/* Add Reminder Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Reminder"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Type"
            options={TYPE_OPTIONS}
            value={formType}
            onChange={(e) => setFormType(e.target.value as ReminderType)}
          />

          <Input
            label="Entity Type"
            value={formEntityType}
            onChange={(e) => setFormEntityType(e.target.value)}
            placeholder="e.g. artwork, invoice, contact"
            required
          />

          <Input
            label="Entity ID"
            value={formEntityId}
            onChange={(e) => setFormEntityId(e.target.value)}
            placeholder="ID of the related record"
            required
          />

          <Input
            label="Trigger Date"
            type="date"
            value={formTriggerDate}
            onChange={(e) => setFormTriggerDate(e.target.value)}
            required
          />

          <Textarea
            label="Notes"
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="Optional notes for this reminder..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Reminder
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Reminder"
        message="Are you sure you want to delete this reminder? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Reminder list item (internal)
// ---------------------------------------------------------------------------

interface ReminderItemProps {
  reminder: ReminderRow;
  readOnly: boolean;
  onMarkSent: (id: string) => void;
  onDelete: (id: string) => void;
}

function ReminderItem({ reminder, readOnly, onMarkSent, onDelete }: ReminderItemProps) {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = !reminder.sent && reminder.trigger_date < today;

  return (
    <li className="flex items-start gap-3 py-3 group">
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={REMINDER_TYPE_BADGE_VARIANT[reminder.type]}>
            {REMINDER_TYPE_LABELS[reminder.type]}
          </Badge>
          {isOverdue && <Badge variant="danger">Overdue</Badge>}
        </div>

        <p className="mt-1 text-sm text-primary-800">
          <span className="font-medium">{reminder.entity_type}</span>
          <span className="mx-1.5 text-primary-300">/</span>
          <span className="text-primary-600">{reminder.entity_id}</span>
        </p>

        <p
          className={`text-xs mt-0.5 ${
            isOverdue ? 'text-red-600 font-medium' : 'text-primary-500'
          }`}
        >
          Due: {formatDate(reminder.trigger_date)}
        </p>

        {reminder.notes && (
          <p className="text-xs text-primary-400 mt-1">{reminder.notes}</p>
        )}
      </div>

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onMarkSent(reminder.id)}
            className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Mark Sent
          </button>
          <button
            type="button"
            onClick={() => onDelete(reminder.id)}
            className="text-xs text-primary-400 hover:text-danger transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
