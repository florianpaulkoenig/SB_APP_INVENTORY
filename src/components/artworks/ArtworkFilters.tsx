import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { GallerySelect } from '../galleries/GallerySelect';
import {
  ARTWORK_STATUSES,
  ARTWORK_CATEGORIES,
  ARTWORK_MOTIFS,
  ARTWORK_SERIES,
  ARTWORK_COLORS,
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
    color?: string;
    medium?: string;
    minHeight?: number;
    maxHeight?: number;
    minWidth?: number;
    maxWidth?: number;
  };
  onChange: (filters: ArtworkFiltersProps['filters']) => void;
  onClear: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtworkFilters({ filters, onChange, onClear }: ArtworkFiltersProps) {
  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== '' && v !== null,
  );

  function updateFilter(key: string, value: string | number | undefined) {
    onChange({
      ...filters,
      [key]: value === '' || value === null ? undefined : value,
    } as ArtworkFiltersProps['filters']);
  }

  function updateNumericFilter(key: string, raw: string) {
    const num = raw === '' ? undefined : Number(raw);
    onChange({
      ...filters,
      [key]: num != null && !isNaN(num) ? num : undefined,
    } as ArtworkFiltersProps['filters']);
  }

  return (
    <div className="space-y-2">
      {/* Row 1: primary filters */}
      <div className="flex items-center gap-2">
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              ...ARTWORK_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            ]}
            value={filters.status ?? ''}
            onChange={(e) => updateFilter('status', e.target.value)}
          />

          <Select
            options={[
              { value: '', label: 'All Categories' },
              ...ARTWORK_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
            ]}
            value={filters.category ?? ''}
            onChange={(e) => updateFilter('category', e.target.value)}
          />

          <Select
            options={[
              { value: '', label: 'All Motifs' },
              ...ARTWORK_MOTIFS.map((m) => ({ value: m.value, label: m.label })),
            ]}
            value={filters.motif ?? ''}
            onChange={(e) => updateFilter('motif', e.target.value)}
          />

          <Select
            options={[
              { value: '', label: 'All Series' },
              ...ARTWORK_SERIES.map((s) => ({ value: s.value, label: s.label })),
            ]}
            value={filters.series ?? ''}
            onChange={(e) => updateFilter('series', e.target.value)}
          />

          <GallerySelect
            label=""
            value={filters.gallery_id ?? null}
            onChange={(galleryId) => updateFilter('gallery_id', galleryId ?? '')}
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>

      {/* Row 2: additional filters — color, medium, dimensions */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Select
          options={[
            { value: '', label: 'All Colors' },
            ...ARTWORK_COLORS.map((c) => ({ value: c.value, label: c.label })),
          ]}
          value={filters.color ?? ''}
          onChange={(e) => updateFilter('color', e.target.value)}
        />

        <input
          type="text"
          placeholder="Medium"
          value={filters.medium ?? ''}
          onChange={(e) => updateFilter('medium', e.target.value)}
          className="rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />

        {/* Height range */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            placeholder="H min"
            value={filters.minHeight ?? ''}
            onChange={(e) => updateNumericFilter('minHeight', e.target.value)}
            className="w-full rounded-md border border-primary-200 bg-white px-2 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <span className="shrink-0 text-xs text-primary-400">–</span>
          <input
            type="number"
            placeholder="H max"
            value={filters.maxHeight ?? ''}
            onChange={(e) => updateNumericFilter('maxHeight', e.target.value)}
            className="w-full rounded-md border border-primary-200 bg-white px-2 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Width range */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            placeholder="W min"
            value={filters.minWidth ?? ''}
            onChange={(e) => updateNumericFilter('minWidth', e.target.value)}
            className="w-full rounded-md border border-primary-200 bg-white px-2 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <span className="shrink-0 text-xs text-primary-400">–</span>
          <input
            type="number"
            placeholder="W max"
            value={filters.maxWidth ?? ''}
            onChange={(e) => updateNumericFilter('maxWidth', e.target.value)}
            className="w-full rounded-md border border-primary-200 bg-white px-2 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

      </div>
    </div>
  );
}
