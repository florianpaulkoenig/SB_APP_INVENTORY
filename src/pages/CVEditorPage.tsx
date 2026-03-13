import React, { useState, useCallback } from 'react';
import { useCVEntries } from '../hooks/useCVEntries';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';

const CV_CATEGORIES = [
  { value: 'education', label: 'Education' },
  { value: 'solo_exhibition', label: 'Solo Exhibition' },
  { value: 'group_exhibition', label: 'Group Exhibition' },
  { value: 'award', label: 'Award' },
  { value: 'publication', label: 'Publication' },
  { value: 'residency', label: 'Residency' },
  { value: 'collection', label: 'Collection' },
  { value: 'other', label: 'Other' },
] as const;

interface FormData {
  year: number | null;
  category: string;
  title: string;
  location: string | null;
  description: string | null;
}

const INITIAL_FORM: FormData = {
  year: new Date().getFullYear(),
  category: 'solo_exhibition',
  title: '',
  location: null,
  description: null,
};

export function CVEditorPage() {
  const { entries, loading, createEntry, updateEntry, deleteEntry, exportPDF, exportXLS } =
    useCVEntries();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');

  const openCreateModal = useCallback(() => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback(
    (entry: { id: string; year: number | null; category: string; title: string; location: string | null; description: string | null }) => {
      setEditingId(entry.id);
      setForm({
        year: entry.year,
        category: entry.category,
        title: entry.title,
        location: entry.location,
        description: entry.description,
      });
      setShowModal(true);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
    setSaving(true);

    if (editingId) {
      await updateEntry(editingId, form);
    } else {
      await createEntry(form);
    }

    setSaving(false);
    setShowModal(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  }, [form, editingId, createEntry, updateEntry]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (window.confirm('Are you sure you want to delete this CV entry?')) {
        await deleteEntry(id);
      }
    },
    [deleteEntry]
  );

  // Group entries by category
  const groupedEntries: Record<string, typeof entries> = {};
  const filteredEntries = filterCategory
    ? entries.filter((e) => e.category === filterCategory)
    : entries;

  for (const entry of filteredEntries) {
    if (!groupedEntries[entry.category]) {
      groupedEntries[entry.category] = [];
    }
    groupedEntries[entry.category].push(entry);
  }

  const categoryOrder = CV_CATEGORIES.map((c) => c.value);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CV Editor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage the artist's curriculum vitae.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportPDF}>
            Export as PDF
          </Button>
          <Button variant="outline" onClick={exportXLS}>
            Export as XLS
          </Button>
          <Button onClick={openCreateModal}>Add Entry</Button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setFilterCategory('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filterCategory === ''
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({entries.length})
        </button>
        {CV_CATEGORIES.map((cat) => {
          const count = entries.filter((e) => e.category === cat.value).length;
          return (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filterCategory === cat.value
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Entries Table */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          title="No CV entries"
          description="Add your first CV entry to get started."
        />
      ) : (
        <div className="space-y-6">
          {categoryOrder.map((catValue) => {
            const catEntries = groupedEntries[catValue];
            if (!catEntries || catEntries.length === 0) return null;
            const catLabel =
              CV_CATEGORIES.find((c) => c.value === catValue)?.label || catValue;

            return (
              <Card key={catValue} className="overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">{catLabel}</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {catEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-16 text-sm font-mono text-gray-500 flex-shrink-0">
                        {entry.year || '—'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {entry.title}
                        </p>
                        {entry.location && (
                          <p className="text-xs text-gray-500 truncate">{entry.location}</p>
                        )}
                        {entry.description && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {entry.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(entry)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(entry.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          if (!saving) {
            setShowModal(false);
            setEditingId(null);
            setForm(INITIAL_FORM);
          }
        }}
        title={editingId ? 'Edit CV Entry' : 'Add CV Entry'}
      >
        <div className="space-y-4">
          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <Input
              type="number"
              value={form.year ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  year: e.target.value ? parseInt(e.target.value, 10) : null,
                }))
              }
              placeholder="e.g. 2024"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <Select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              options={[...CV_CATEGORIES]}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Exhibition or event title"
              maxLength={256}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <Input
              value={form.location ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value || null }))
              }
              placeholder="City, Country or Institution"
              maxLength={256}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value || null }))
              }
              placeholder="Additional details..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              rows={3}
              maxLength={5000}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setEditingId(null);
                setForm(INITIAL_FORM);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.title.trim() || saving}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
