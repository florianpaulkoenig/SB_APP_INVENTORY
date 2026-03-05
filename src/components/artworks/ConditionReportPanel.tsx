import { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { useConditionReports } from '../../hooks/useConditionReports';
import { CONDITION_GRADES } from '../../lib/constants';
import { formatDate } from '../../lib/utils';
import type { ConditionGrade } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ConditionReportPanelProps {
  artworkId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONDITION_DOT_COLORS: Record<ConditionGrade, string> = {
  excellent: 'bg-emerald-500',
  good: 'bg-blue-500',
  fair: 'bg-amber-500',
  damaged: 'bg-red-500',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConditionReportPanel({ artworkId }: ConditionReportPanelProps) {
  const { reports, loading, createReport, deleteReport } =
    useConditionReports(artworkId);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [condition, setCondition] = useState<string>('good');
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [reportedBy, setReportedBy] = useState('');
  const [notes, setNotes] = useState('');

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // -- Handlers -------------------------------------------------------------

  function resetForm() {
    setCondition('good');
    setReportDate(new Date().toISOString().slice(0, 10));
    setReportedBy('');
    setNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createReport({
        artwork_id: artworkId,
        condition: condition as ConditionGrade,
        report_date: reportDate,
        reported_by: reportedBy || null,
        notes: notes || null,
      });
      resetForm();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteReport(deleteId);
    setDeleteId(null);
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
          Condition Reports
        </h2>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          Add Report
        </Button>
      </div>

      {/* Content */}
      {reports.length === 0 ? (
        <EmptyState
          title="No condition reports yet"
          description="Track the physical condition of this artwork over time."
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
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75"
              />
            </svg>
          }
        />
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-primary-200" />

          <ul className="space-y-6">
            {reports.map((report) => {
              const grade = CONDITION_GRADES.find(
                (g) => g.value === report.condition,
              );

              return (
                <li key={report.id} className="relative pl-8">
                  {/* Timeline dot - colored by condition */}
                  <div
                    className={`absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-white ring-2 ring-primary-100 ${
                      CONDITION_DOT_COLORS[report.condition] ?? 'bg-primary-400'
                    }`}
                  />

                  {/* Content */}
                  <div className="space-y-1">
                    {/* Date + Condition Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <time className="text-xs font-medium text-primary-500">
                        {formatDate(report.report_date)}
                      </time>
                      <Badge className={grade?.color}>
                        {grade?.label ?? report.condition}
                      </Badge>
                    </div>

                    {/* Reported by */}
                    {report.reported_by && (
                      <p className="text-sm text-primary-700">
                        Reported by{' '}
                        <span className="font-medium">
                          {report.reported_by}
                        </span>
                      </p>
                    )}

                    {/* Notes */}
                    {report.notes && (
                      <p className="text-xs text-primary-500">
                        {report.notes}
                      </p>
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setDeleteId(report.id)}
                      className="mt-1 text-xs text-primary-400 hover:text-danger transition-colors"
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

      {/* Add Report Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Condition Report"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Condition"
            options={CONDITION_GRADES.map((g) => ({
              value: g.value,
              label: g.label,
            }))}
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          />

          <Input
            label="Report Date"
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            required
          />

          <Input
            label="Reported By"
            value={reportedBy}
            onChange={(e) => setReportedBy(e.target.value)}
            placeholder="Name of the person reporting"
          />

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details about the condition..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Report
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Condition Report"
        message="Are you sure you want to delete this condition report? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </section>
  );
}
