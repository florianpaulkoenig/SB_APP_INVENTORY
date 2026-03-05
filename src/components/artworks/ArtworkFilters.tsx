import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { GallerySelect } from '../galleries/GallerySelect';
import {
  ARTWORK_STATUSES,
  ARTWORK_CATEGORIES,
  ARTWORK_MOTIFS,
  ARTWORK_SERIES,
} from '../../lib/constants';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkFiltersProps {
  filters: {
    status?: string;
    category?: string;
    motif?: string;
    series?: string;
    gallery_id?: string;
  };
  onChange: (filters: ArtworkFiltersProps['filters']) => void;
  onClear: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtworkFilters({ filters, onChange, onClear }: ArtworkFiltersProps) {
  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== '');

  function updateFilter(key: keyof ArtworkFiltersProps['filters'], value: string) {
    onChange({
      ...filters,
      [key]: value || undefined,
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="Status"
        options={[
          { value: '', label: 'All Statuses' },
          ...ARTWORK_STATUSES.map((s) => ({ value: s.value, label: s.label })),
        ]}
        value={filters.status ?? ''}
        onChange={(e) => updateFilter('status', e.target.value)}
      />

      <Select
        label="Category"
        options={[
          { value: '', label: 'All Categories' },
          ...ARTWORK_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
        ]}
        value={filters.category ?? ''}
        onChange={(e) => updateFilter('category', e.target.value)}
      />

      <Select
        label="Motif"
        options={[
          { value: '', label: 'All Motifs' },
          ...ARTWORK_MOTIFS.map((m) => ({ value: m.value, label: m.label })),
        ]}
        value={filters.motif ?? ''}
        onChange={(e) => updateFilter('motif', e.target.value)}
      />

      <Select
        label="Series"
        options={[
          { value: '', label: 'All Series' },
          ...ARTWORK_SERIES.map((s) => ({ value: s.value, label: s.label })),
        ]}
        value={filters.series ?? ''}
        onChange={(e) => updateFilter('series', e.target.value)}
      />

      <GallerySelect
        label="Gallery"
        value={filters.gallery_id ?? null}
        onChange={(galleryId) => updateFilter('gallery_id', galleryId ?? '')}
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}
