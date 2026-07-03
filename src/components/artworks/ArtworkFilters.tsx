import { useState } from 'react';
import { Select } from '../ui/Select';
import { SearchInput } from '../ui/SearchInput';
import { GallerySelect } from '../galleries/GallerySelect';
import {
  ARTWORK_STATUSES,
  ARTWORK_CATEGORIES,
  ARTWORK_MOTIFS,
  ARTWORK_SERIES,
  ARTWORK_COLORS,
} from '../../lib/constants';

export interface ArtworkFiltersProps {
  filters: {
    status?: string;
    category?: string;
    motif?: string;
    series?: string;
    gallery_id?: string;
    color?: string;
    medium?: string;
    artist?: string;
    minHeight?: number;
    maxHeight?: number;
    minWidth?: number;
    maxWidth?: number;
  };
  showArtistFilter?: boolean;
  onChange: (filters: ArtworkFiltersProps['filters']) => void;
  onClear: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  shouldFocusSearch?: boolean;
  noPhotoFilter?: boolean;
  onNoPhotoChange?: (value: boolean) => void;
  withPhotoFilter?: boolean;
  onWithPhotoChange?: (value: boolean) => void;
  viewMode?: string;
  onViewModeChange?: (mode: string) => void;
  sortValue?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: { value: string; label: string }[];
}

export function ArtworkFilters({
  filters, onChange, onClear,
  search, onSearchChange, shouldFocusSearch,
  noPhotoFilter, onNoPhotoChange,
  withPhotoFilter, onWithPhotoChange,
  viewMode, onViewModeChange,
  sortValue, onSortChange, sortOptions,
  showArtistFilter,
}: ArtworkFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const secondaryActive = Boolean(
    filters.category || filters.motif || filters.series ||
    filters.color || filters.medium || filters.artist ||
    filters.minHeight != null || filters.maxHeight != null ||
    filters.minWidth != null || filters.maxWidth != null ||
    noPhotoFilter ||
    withPhotoFilter,
  );
  const hasActiveFilters = Boolean(filters.status || filters.gallery_id) || secondaryActive;

  function update(key: string, value: string | number | undefined) {
    onChange({
      ...filters,
      [key]: value === '' || value === null ? undefined : value,
    } as ArtworkFiltersProps['filters']);
  }

  function updateNum(key: string, raw: string) {
    const num = raw === '' ? undefined : Number(raw);
    onChange({
      ...filters,
      [key]: num != null && !isNaN(num) ? num : undefined,
    } as ArtworkFiltersProps['filters']);
  }

  const inputCls = 'w-full border-0 border-b border-primary-200 bg-transparent px-0 py-2 text-sm text-primary-900 placeholder:text-primary-300 focus:border-accent focus:outline-none';

  return (
    <div className="space-y-3">
      {/* Primary row: search + status + gallery + toggles */}
      <div className="flex items-center gap-3">
        {onSearchChange && (
          <div className="flex-1 max-w-xs">
            <SearchInput
              value={search ?? ''}
              onChange={onSearchChange}
              placeholder="Search..."
              autoFocus={shouldFocusSearch}
            />
          </div>
        )}

        <div className="w-44 shrink-0">
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              ...ARTWORK_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            ]}
            value={filters.status ?? ''}
            onChange={(e) => update('status', e.target.value)}
          />
        </div>

        <div className="w-56 shrink-0">
          <GallerySelect
            label=""
            value={filters.gallery_id ?? null}
            onChange={(id) => update('gallery_id', id ?? '')}
          />
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-xs text-primary-400 hover:text-primary-700 transition-colors"
        >
          {expanded ? 'Fewer filters' : 'More filters'}{secondaryActive ? ' ·' : ''}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-xs text-primary-400 hover:text-primary-700 transition-colors"
          >
            Clear
          </button>
        )}

        {/* View toggle + sort — pushed to the right */}
        {onViewModeChange && (
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-0.5 border border-primary-200 p-0.5">
              <button
                type="button"
                onClick={() => onViewModeChange('grid')}
                className={`p-1.5 transition-colors ${viewMode !== 'table' ? 'bg-primary-900 text-white' : 'text-primary-400 hover:text-primary-700'}`}
                aria-label="Grid view"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('table')}
                className={`p-1.5 transition-colors ${viewMode === 'table' ? 'bg-primary-900 text-white' : 'text-primary-400 hover:text-primary-700'}`}
                aria-label="Table view"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
                </svg>
              </button>
            </div>

            {sortOptions && onSortChange && viewMode !== 'table' && (
              <select
                value={sortValue}
                onChange={(e) => onSortChange(e.target.value)}
                className="border-0 border-b border-primary-200 bg-transparent py-1 text-xs text-primary-500 focus:border-accent focus:outline-none"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Secondary filters — collapsible */}
      {expanded && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6 border-t border-primary-100 pt-3">
          <Select
            options={[
              { value: '', label: 'All Categories' },
              ...ARTWORK_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
            ]}
            value={filters.category ?? ''}
            onChange={(e) => update('category', e.target.value)}
          />

          <Select
            options={[
              { value: '', label: 'All Motifs' },
              ...ARTWORK_MOTIFS.map((m) => ({ value: m.value, label: m.label })),
            ]}
            value={filters.motif ?? ''}
            onChange={(e) => update('motif', e.target.value)}
          />

          <Select
            options={[
              { value: '', label: 'All Series' },
              ...ARTWORK_SERIES.map((s) => ({ value: s.value, label: s.label })),
            ]}
            value={filters.series ?? ''}
            onChange={(e) => update('series', e.target.value)}
          />

          <Select
            options={[
              { value: '', label: 'All Colors' },
              ...ARTWORK_COLORS.map((c) => ({ value: c.value, label: c.label })),
            ]}
            value={filters.color ?? ''}
            onChange={(e) => update('color', e.target.value)}
          />

          <input
            type="text"
            placeholder="Medium"
            value={filters.medium ?? ''}
            onChange={(e) => update('medium', e.target.value)}
            className={inputCls}
          />

          {showArtistFilter && (
            <input
              type="text"
              placeholder="Artist"
              value={filters.artist ?? ''}
              onChange={(e) => update('artist', e.target.value)}
              className={inputCls}
            />
          )}

          <div className="flex items-center gap-1">
            <input type="number" placeholder="H min" value={filters.minHeight ?? ''} onChange={(e) => updateNum('minHeight', e.target.value)} className={inputCls} />
            <span className="shrink-0 text-xs text-primary-300">–</span>
            <input type="number" placeholder="H max" value={filters.maxHeight ?? ''} onChange={(e) => updateNum('maxHeight', e.target.value)} className={inputCls} />
          </div>

          <div className="flex items-center gap-1">
            <input type="number" placeholder="W min" value={filters.minWidth ?? ''} onChange={(e) => updateNum('minWidth', e.target.value)} className={inputCls} />
            <span className="shrink-0 text-xs text-primary-300">–</span>
            <input type="number" placeholder="W max" value={filters.maxWidth ?? ''} onChange={(e) => updateNum('maxWidth', e.target.value)} className={inputCls} />
          </div>

          {onWithPhotoChange && (
            <label className="flex items-center gap-2 text-xs text-primary-500 cursor-pointer">
              <input
                type="checkbox"
                checked={withPhotoFilter ?? false}
                onChange={(e) => onWithPhotoChange(e.target.checked)}
                className="h-3.5 w-3.5 rounded-none border-primary-300 text-primary-900 focus:ring-0"
              />
              With photo
            </label>
          )}
          {onNoPhotoChange && (
            <label className="flex items-center gap-2 text-xs text-primary-500 cursor-pointer">
              <input
                type="checkbox"
                checked={noPhotoFilter ?? false}
                onChange={(e) => onNoPhotoChange(e.target.checked)}
                className="h-3.5 w-3.5 rounded-none border-primary-300 text-primary-900 focus:ring-0"
              />
              No photo
            </label>
          )}
        </div>
      )}
    </div>
  );
}
