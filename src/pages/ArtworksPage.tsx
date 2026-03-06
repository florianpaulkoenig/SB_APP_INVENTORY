import { useState, useEffect, useCallback, createElement } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useArtworks } from '../hooks/useArtworks';
import type { ArtworkFilters as ArtworkFiltersType } from '../hooks/useArtworks';
import { ArtworkCard } from '../components/artworks/ArtworkCard';
import { ArtworkTable } from '../components/artworks/ArtworkTable';
import { ArtworkFilters } from '../components/artworks/ArtworkFilters';
import { ExcelImporter } from '../components/artworks/ExcelImporter';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { SearchInput } from '../components/ui/SearchInput';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 24;

// Module-level signed URL cache – persists across re-renders / page changes.
// Key = artwork_id, value = { url, expiresAt } (1 hour TTL).
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const URL_TTL = 55 * 60 * 1000; // 55 minutes (URLs expire at 60)

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
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldFocusSearch = searchParams.get('search') === '1';

  // Clear the search param after reading it (so browser back doesn't re-trigger)
  useEffect(() => {
    if (shouldFocusSearch) {
      setSearchParams({}, { replace: true });
    }
  }, [shouldFocusSearch, setSearchParams]);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<ArtworkFiltersType>({});
  const [excelImporterOpen, setExcelImporterOpen] = useState(false);

  const { artworks, loading, totalCount, refetch } = useArtworks({
    filters: { ...filters, search, sortBy, sortOrder },
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ---- Fetch primary image URLs for displayed artworks --------------------
  // Uses a module-level cache to avoid re-signing URLs on sort/filter changes.

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const fetchPrimaryImages = useCallback(async () => {
    if (artworks.length === 0) {
      setImageUrls({});
      return;
    }

    const artworkIds = artworks.map((a) => a.id);
    const now = Date.now();

    // Serve already-cached URLs immediately
    const cached: Record<string, string> = {};
    const uncachedIds: string[] = [];
    for (const id of artworkIds) {
      const entry = urlCache.get(id);
      if (entry && entry.expiresAt > now) {
        cached[id] = entry.url;
      } else {
        uncachedIds.push(id);
      }
    }

    // Show cached URLs immediately (non-blocking)
    if (Object.keys(cached).length > 0) {
      setImageUrls(cached);
    }

    // Fetch only uncached image paths
    if (uncachedIds.length === 0) return;

    const { data: imageData } = await supabase
      .from('artwork_images')
      .select('artwork_id, storage_path')
      .in('artwork_id', uncachedIds)
      .eq('is_primary', true);

    if (!imageData || imageData.length === 0) {
      setImageUrls(cached);
      return;
    }

    // Generate signed URLs in parallel (thumbnail size for speed)
    const results = await Promise.all(
      imageData.map(async (img) => {
        const { data: signedData } = await supabase.storage
          .from('artwork-images')
          .createSignedUrl(img.storage_path, 3600, {
            transform: { width: 400, height: 400, resize: 'cover' },
          });
        return { artworkId: img.artwork_id, url: signedData?.signedUrl ?? null };
      }),
    );

    // Merge new URLs into cache and state
    const urlMap = { ...cached };
    const expiresAt = now + URL_TTL;
    for (const { artworkId, url } of results) {
      if (url) {
        urlMap[artworkId] = url;
        urlCache.set(artworkId, { url, expiresAt });
      }
    }

    setImageUrls(urlMap);
  }, [artworks]);

  useEffect(() => {
    fetchPrimaryImages();
  }, [fetchPrimaryImages]);

  // ---- Certificate download -----------------------------------------------

  const { toast } = useToast();
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);

  const handleDownloadCertificate = useCallback(async (artworkId: string) => {
    setDownloadingCertId(artworkId);

    try {
      // Find the artwork data
      const artwork = artworks.find((a) => a.id === artworkId);
      if (!artwork) return;

      // Fetch certificate for this artwork
      const { data: cert } = await supabase
        .from('certificates')
        .select('certificate_number, issue_date, qr_code_url')
        .eq('artwork_id', artworkId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cert) {
        toast({ title: 'No certificate', description: 'No certificate found for this artwork.', variant: 'error' });
        return;
      }

      // Get signed URL for primary artwork image
      let artworkImageUrl: string | null = null;
      const { data: primaryImage } = await supabase
        .from('artwork_images')
        .select('storage_path')
        .eq('artwork_id', artworkId)
        .eq('is_primary', true)
        .limit(1)
        .maybeSingle();

      if (primaryImage?.storage_path) {
        const { data: urlData } = await supabase.storage
          .from('artwork-images')
          .createSignedUrl(primaryImage.storage_path, 3600);
        if (urlData) artworkImageUrl = urlData.signedUrl;
      }

      // Get signature URL
      let signatureUrl: string | null = null;
      try {
        const { data: sigData } = await supabase.storage
          .from('assets')
          .createSignedUrl('signature.png', 3600);
        if (sigData) signatureUrl = sigData.signedUrl;
      } catch {
        // Signature is optional
      }

      // Lazy import PDF renderer and certificate component (keeps bundle small)
      const [{ pdf: pdfRenderer }, { CertificatePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/pdf/CertificatePDF'),
      ]);

      // Generate PDF blob
      const blob = await pdfRenderer(
        createElement(CertificatePDF, {
          artwork: {
            title: artwork.title,
            reference_code: artwork.reference_code,
            medium: artwork.medium,
            year: artwork.year,
            height: artwork.height,
            width: artwork.width,
            depth: artwork.depth,
            dimension_unit: artwork.dimension_unit,
            framed_height: (artwork as Record<string, unknown>).framed_height as number | null ?? null,
            framed_width: (artwork as Record<string, unknown>).framed_width as number | null ?? null,
            framed_depth: (artwork as Record<string, unknown>).framed_depth as number | null ?? null,
            edition_type: artwork.edition_type ?? 'unique',
            edition_number: artwork.edition_number ?? null,
            edition_total: artwork.edition_total ?? null,
          },
          certificate: {
            certificate_number: cert.certificate_number,
            issue_date: cert.issue_date,
            qr_code_url: cert.qr_code_url,
          },
          artworkImageUrl,
          signatureUrl,
          language: 'en',
        }),
      ).toBlob();

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cert.certificate_number}_certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Certificate download failed:', err);
      toast({ title: 'Error', description: 'Failed to download certificate.', variant: 'error' });
    } finally {
      setDownloadingCertId(null);
    }
  }, [artworks, toast]);

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

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setExcelImporterOpen(true)}>
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
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            Import Excel
          </Button>
          <Button onClick={() => navigate('/artworks/new')}>
            New Artwork
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by title, reference code, medium, year, location, notes..."
          className="max-w-md"
          autoFocus={shouldFocusSearch}
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
                imageUrl={imageUrls[artwork.id]}
                onClick={() => navigate(`/artworks/${artwork.id}`)}
                onDownloadCertificate={handleDownloadCertificate}
                downloadingCertificate={downloadingCertId === artwork.id}
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

      {/* Excel Import Modal */}
      <ExcelImporter
        isOpen={excelImporterOpen}
        onClose={() => setExcelImporterOpen(false)}
        onImportComplete={() => refetch()}
      />
    </div>
  );
}
