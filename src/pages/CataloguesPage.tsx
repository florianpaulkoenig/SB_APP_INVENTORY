// ---------------------------------------------------------------------------
// NOA Inventory -- Catalogues Page
// Saved catalogue management + builder for creating new ones.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { CatalogueBuilder } from '../components/catalogues/CatalogueBuilder';
import { useCatalogues } from '../hooks/useCatalogues';
import type { CatalogueRow } from '../hooks/useCatalogues';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LAYOUT_LABELS: Record<string, string> = {
  'grid-2': '2-Column',
  'grid-4': '4-Column',
  'full-page': 'Full Page',
};

const TYPE_LABELS: Record<string, string> = {
  exhibition: 'Exhibition',
  collector: 'Collector',
  gallery: 'Gallery',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CataloguesPage() {
  const { catalogues, loading, deleteCatalogue, duplicateCatalogue } =
    useCatalogues();

  const [showBuilder, setShowBuilder] = useState(false);
  const [editCatalogue, setEditCatalogue] = useState<CatalogueRow | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  function handleReopen(catalogue: CatalogueRow) {
    setEditCatalogue(catalogue);
    setShowBuilder(true);
  }

  function handleNew() {
    setEditCatalogue(null);
    setShowBuilder(true);
  }

  async function handleDuplicate(id: string) {
    await duplicateCatalogue(id);
  }

  async function handleDelete(id: string) {
    await deleteCatalogue(id);
    setDeleteConfirmId(null);
  }

  // ---- Builder mode ---------------------------------------------------------

  if (showBuilder) {
    return (
      <div>
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBuilder(false)}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            Back to Catalogues
          </Button>
        </div>

        <CatalogueBuilder
          initialConfig={editCatalogue?.config}
          catalogueId={editCatalogue?.id}
          onGenerated={() => setShowBuilder(false)}
        />
      </div>
    );
  }

  // ---- List mode ------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Catalogues
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Build, save, and regenerate PDF catalogues from your inventory.
          </p>
        </div>

        <Button onClick={handleNew}>New Catalogue</Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && catalogues.length === 0 && (
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
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
          }
          title="No saved catalogues"
          description="Create your first catalogue to get started. Saved catalogues can be reopened and regenerated at any time."
          action={<Button onClick={handleNew}>Create First Catalogue</Button>}
        />
      )}

      {/* Saved catalogues list */}
      {!loading && catalogues.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalogues.map((cat) => (
            <Card key={cat.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-primary-900">
                    {cat.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-primary-400">
                    {cat.config.title}
                    {cat.config.subtitle ? ` — ${cat.config.subtitle}` : ''}
                  </p>
                </div>
              </div>

              {/* Meta */}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">
                  {TYPE_LABELS[cat.config.catalogueType] || cat.config.catalogueType}
                </span>
                <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">
                  {LAYOUT_LABELS[cat.config.layout] || cat.config.layout}
                </span>
                <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">
                  {cat.config.artworkIds.length} artworks
                </span>
                <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">
                  {cat.config.language.toUpperCase()}
                </span>
              </div>

              {/* Date */}
              <p className="mt-3 text-xs text-primary-400">
                Updated {new Date(cat.updated_at).toLocaleDateString()}
              </p>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => handleReopen(cat)}>
                  Open
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDuplicate(cat.id)}
                >
                  Duplicate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteConfirmId(cat.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Catalogue"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-primary-600">
            Are you sure you want to delete this saved catalogue? This action
            cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
