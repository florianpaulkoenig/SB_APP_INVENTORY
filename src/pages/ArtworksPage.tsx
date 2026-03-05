import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArtworks } from '../hooks/useArtworks';
import type { ArtworkFilters as ArtworkFiltersType } from '../hooks/useArtworks';
import { ArtworkCard } from '../components/artworks/ArtworkCard';
import { ArtworkTable } from '../components/artworks/ArtworkTable';
import { ArtworkFilters } from '../components/artworks/ArtworkFilters';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { SearchInput } from '../components/ui/SearchInput';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 24;

const SORT_OPTIONS = [
  { value: 'created_at:desc', label: 'Newest First' },
  { value: 'created_at:asc', label: 'Oldest First' },
  { value: 'title:asc', label: 'Title A-Z' },
  { value: 'title:desc', label: 'Title Z-A' },
  { value: 'year:desc', label: 'Year (Newest)' },
  { value: 'year:asc', label: 'Year (Oldest)' },
  { value: 'inventory_number:asc', label: 'Inventory # Asc' },
  { value: 'inventory_number:desc', label: 'Inventory # Desc' },
];

type ViewMode = 'grid' | 'table';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ArtworksPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<ArtworkFiltersType>({});

  const { artworks, loading, totalCount } = useArtworks({
    filters: { ...filters, search, sortBy, sortOrder },
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Reset to page 1 when search or filters change
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleFiltersChange(newFilters: typeof filters) {
    setFilters(newFilters);
    setPage(1);
  }

  function handleFiltersClear() {
    setFilters({});
    setPage(1);
  }

  function handleSortChange(value: string) {
    const [col, ord] = value.split(':');
    setSortBy(col);
    setSortOrder(ord as 'asc' | 'desc');
    setPage(1);
  }

  function handleTableSort(column: string) {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Artworks
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Manage your artwork inventory, track provenance and status.
          </p>
        </div>

        <Button onClick={() => navigate('/artworks/new')}>
          New Artwork
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search artworks by title, inventory number, reference code, or medium..."
          className="max-w-md"
        />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <ArtworkFilters
          filters={filters}
          onChange={handleFiltersChange}
          onClear={handleFiltersClear}
        />
      </div>

      {/* View toggle & sort */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-primary-200 p-0.5">
          {/* Grid view button */}
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === 'grid'
                ? 'bg-primary-900 text-white'
                : 'text-primary-400 hover:text-primary-600'
            }`}
            aria-label="Grid view"
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
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          </button>

          {/* Table view button */}
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === 'table'
                ? 'bg-primary-900 text-white'
                : 'text-primary-400 hover:text-primary-600'
            }`}
            aria-label="Table view"
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
                d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5"
              />
            </svg>
          </button>
        </div>

        {/* Sort dropdown (grid view only) */}
        {viewMode === 'grid' && (
          <div className="w-48">
            <Select
              options={SORT_OPTIONS}
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => handleSortChange(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && artworks.length === 0 && (
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
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z"
              />
            </svg>
          }
          title={search || Object.keys(filters).length > 0 ? 'No artworks found' : 'No artworks yet'}
          description={
            search || Object.keys(filters).length > 0
              ? 'Try adjusting your search or filter criteria.'
              : 'Add your first artwork to start building your inventory.'
          }
          action={
            !search && Object.keys(filters).length === 0 ? (
              <Button onClick={() => navigate('/artworks/new')}>
                Add First Artwork
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Artwork grid */}
      {!loading && artworks.length > 0 && viewMode === 'grid' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {artworks.map((artwork) => (
              <ArtworkCard
                key={artwork.id}
                artwork={artwork}
                onClick={() => navigate(`/artworks/${artwork.id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {/* Artwork table */}
      {!loading && artworks.length > 0 && viewMode === 'table' && (
        <>
          <ArtworkTable
            artworks={artworks}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleTableSort}
            onRowClick={(id) => navigate(`/artworks/${id}`)}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
