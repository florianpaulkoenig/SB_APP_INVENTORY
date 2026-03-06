// ---------------------------------------------------------------------------
// NOA Inventory -- Artwork Template Manager
// Modal for creating, editing, and deleting predefined artwork templates.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { useArtworkTemplates } from '../../hooks/useArtworkTemplates';
import { formatDimensions } from '../../lib/utils';
import {
  ARTWORK_CATEGORIES,
  ARTWORK_MOTIFS,
  ARTWORK_SERIES,
  EDITION_TYPES,
  CURRENCIES,
  DIMENSION_UNITS,
} from '../../lib/constants';
import type { ArtworkTemplateInsert, ArtworkTemplateRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkTemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Template Form (inline)
// ---------------------------------------------------------------------------

interface TemplateFormState {
  name: string;
  medium: string;
  height: string;
  width: string;
  depth: string;
  dimension_unit: string;
  framed_height: string;
  framed_width: string;
  framed_depth: string;
  weight: string;
  edition_type: string;
  price: string;
  currency: string;
  category: string;
  motif: string;
  series: string;
}

const EMPTY_FORM: TemplateFormState = {
  name: '',
  medium: '',
  height: '',
  width: '',
  depth: '',
  dimension_unit: 'cm',
  framed_height: '',
  framed_width: '',
  framed_depth: '',
  weight: '',
  edition_type: 'unique',
  price: '',
  currency: 'EUR',
  category: '',
  motif: '',
  series: '',
};

function templateToForm(t: ArtworkTemplateRow): TemplateFormState {
  return {
    name: t.name,
    medium: t.medium ?? '',
    height: t.height != null ? String(t.height) : '',
    width: t.width != null ? String(t.width) : '',
    depth: t.depth != null ? String(t.depth) : '',
    dimension_unit: t.dimension_unit ?? 'cm',
    framed_height: t.framed_height != null ? String(t.framed_height) : '',
    framed_width: t.framed_width != null ? String(t.framed_width) : '',
    framed_depth: t.framed_depth != null ? String(t.framed_depth) : '',
    weight: t.weight != null ? String(t.weight) : '',
    edition_type: t.edition_type ?? 'unique',
    price: t.price != null ? String(t.price) : '',
    currency: t.currency ?? 'EUR',
    category: t.category ?? '',
    motif: t.motif ?? '',
    series: t.series ?? '',
  };
}

function formToInsert(f: TemplateFormState): ArtworkTemplateInsert {
  return {
    name: f.name.trim(),
    medium: f.medium || null,
    height: f.height ? Number(f.height) : null,
    width: f.width ? Number(f.width) : null,
    depth: f.depth ? Number(f.depth) : null,
    dimension_unit: f.dimension_unit as 'cm' | 'inches',
    framed_height: f.framed_height ? Number(f.framed_height) : null,
    framed_width: f.framed_width ? Number(f.framed_width) : null,
    framed_depth: f.framed_depth ? Number(f.framed_depth) : null,
    weight: f.weight ? Number(f.weight) : null,
    edition_type: f.edition_type as ArtworkTemplateInsert['edition_type'],
    price: f.price ? Number(f.price) : null,
    currency: (f.currency || 'EUR') as ArtworkTemplateInsert['currency'],
    category: (f.category || null) as ArtworkTemplateInsert['category'],
    motif: (f.motif || null) as ArtworkTemplateInsert['motif'],
    series: (f.series || null) as ArtworkTemplateInsert['series'],
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtworkTemplateManager({ isOpen, onClose }: ArtworkTemplateManagerProps) {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } =
    useArtworkTemplates();

  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // -- Helpers ----------------------------------------------------------------

  function resetAndGoList() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setMode('list');
  }

  function handleEdit(template: ArtworkTemplateRow) {
    setForm(templateToForm(template));
    setEditingId(template.id);
    setMode('edit');
  }

  function handleNew() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setMode('create');
  }

  function updateField(field: keyof TemplateFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // -- Submit handler ---------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    try {
      if (mode === 'create') {
        await createTemplate(formToInsert(form));
      } else if (mode === 'edit' && editingId) {
        await updateTemplate(editingId, formToInsert(form));
      }
      resetAndGoList();
    } finally {
      setSaving(false);
    }
  }

  // -- Delete handler ---------------------------------------------------------

  async function handleDelete() {
    if (!deleteId) return;
    await deleteTemplate(deleteId);
    setDeleteId(null);
  }

  // -- Render template card ---------------------------------------------------

  function renderTemplateCard(template: ArtworkTemplateRow) {
    const dims = formatDimensions(
      template.height,
      template.width,
      template.depth,
      template.dimension_unit ?? 'cm',
    );

    return (
      <div
        key={template.id}
        className="flex items-center justify-between rounded-lg border border-primary-100 bg-white px-4 py-3"
      >
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-primary-900">{template.name}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-primary-500">
            {dims && <span>{dims}</span>}
            {template.medium && <span>{template.medium}</span>}
            {template.category && (
              <span className="capitalize">{template.category.replace('_', ' ')}</span>
            )}
            {template.price != null && template.price > 0 && (
              <span>
                {template.currency} {template.price.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleEdit(template)}
            className="text-xs text-primary-500 hover:text-primary-900 transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteId(template.id)}
            className="text-xs text-primary-400 hover:text-danger transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  // -- Render form ------------------------------------------------------------

  function renderForm() {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Template name */}
        <Input
          label="Template Name"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., 100×100 cm Square"
          required
        />

        {/* Medium */}
        <Input
          label="Medium"
          value={form.medium}
          onChange={(e) => updateField('medium', e.target.value)}
          placeholder="e.g., Laminated glass, hammer"
        />

        {/* Dimensions */}
        <div>
          <label className="mb-1 block text-sm font-medium text-primary-700">
            Dimensions (unframed)
          </label>
          <div className="grid grid-cols-4 gap-2">
            <Input
              placeholder="Height"
              type="number"
              step="0.1"
              value={form.height}
              onChange={(e) => updateField('height', e.target.value)}
            />
            <Input
              placeholder="Width"
              type="number"
              step="0.1"
              value={form.width}
              onChange={(e) => updateField('width', e.target.value)}
            />
            <Input
              placeholder="Depth"
              type="number"
              step="0.1"
              value={form.depth}
              onChange={(e) => updateField('depth', e.target.value)}
            />
            <Select
              options={[...DIMENSION_UNITS]}
              value={form.dimension_unit}
              onChange={(e) => updateField('dimension_unit', e.target.value)}
            />
          </div>
        </div>

        {/* Framed dimensions */}
        <div>
          <label className="mb-1 block text-sm font-medium text-primary-700">
            Dimensions (framed)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Height"
              type="number"
              step="0.1"
              value={form.framed_height}
              onChange={(e) => updateField('framed_height', e.target.value)}
            />
            <Input
              placeholder="Width"
              type="number"
              step="0.1"
              value={form.framed_width}
              onChange={(e) => updateField('framed_width', e.target.value)}
            />
            <Input
              placeholder="Depth"
              type="number"
              step="0.1"
              value={form.framed_depth}
              onChange={(e) => updateField('framed_depth', e.target.value)}
            />
          </div>
        </div>

        {/* Weight */}
        <Input
          label="Weight (kg)"
          type="number"
          step="0.1"
          value={form.weight}
          onChange={(e) => updateField('weight', e.target.value)}
          placeholder="e.g., 12.5"
        />

        {/* Edition & Price */}
        <div className="grid grid-cols-3 gap-3">
          <Select
            label="Edition"
            options={[...EDITION_TYPES]}
            value={form.edition_type}
            onChange={(e) => updateField('edition_type', e.target.value)}
          />
          <Input
            label="Price"
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => updateField('price', e.target.value)}
          />
          <Select
            label="Currency"
            options={[...CURRENCIES]}
            value={form.currency}
            onChange={(e) => updateField('currency', e.target.value)}
          />
        </div>

        {/* Classification */}
        <div className="grid grid-cols-3 gap-3">
          <Select
            label="Category"
            options={[...ARTWORK_CATEGORIES]}
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            placeholder="Select..."
          />
          <Select
            label="Motif"
            options={[...ARTWORK_MOTIFS]}
            value={form.motif}
            onChange={(e) => updateField('motif', e.target.value)}
            placeholder="Select..."
          />
          <Select
            label="Series"
            options={[...ARTWORK_SERIES]}
            value={form.series}
            onChange={(e) => updateField('series', e.target.value)}
            placeholder="Select..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={resetAndGoList}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {mode === 'create' ? 'Create Template' : 'Save Changes'}
          </Button>
        </div>
      </form>
    );
  }

  // -- Main render ------------------------------------------------------------

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          resetAndGoList();
          onClose();
        }}
        title={
          mode === 'list'
            ? 'Artwork Templates'
            : mode === 'create'
              ? 'New Template'
              : 'Edit Template'
        }
        size="lg"
      >
        {mode === 'list' && (
          <>
            {/* List header */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-primary-500">
                Create reusable templates for common artwork formats.
              </p>
              <Button size="sm" onClick={handleNew}>
                New Template
              </Button>
            </div>

            {/* List */}
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : templates.length === 0 ? (
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
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                }
                title="No templates yet"
                description="Create your first template to quickly apply common formats."
              />
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {templates.map(renderTemplateCard)}
              </div>
            )}
          </>
        )}

        {(mode === 'create' || mode === 'edit') && renderForm()}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Template"
        message="Are you sure you want to delete this template? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
