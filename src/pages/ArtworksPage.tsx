import { useState, useEffect, useCallback, createElement, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSignedUrl } from '../lib/signedUrlCache';
import { downloadBlob, buildCertificateFilename, formatDimensions } from '../lib/utils';
import { useArtworks } from '../hooks/useArtworks';
import type { ArtworkFilters as ArtworkFiltersType } from '../hooks/useArtworks';
import { ArtworkCard } from '../components/artworks/ArtworkCard';
import { ArtworkTable } from '../components/artworks/ArtworkTable';
import { ArtworkFilters } from '../components/artworks/ArtworkFilters';
import { ExcelImporter } from '../components/artworks/ExcelImporter';
import { ArtworkBulkEditModal } from '../components/artworks/ArtworkBulkEditModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { usePortfolio } from '../contexts/PortfolioContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 24;

// Module-level signed URL cache – persists across re-renders / page changes.
// Key = artwork_id, value = { url, expiresAt } (1 hour TTL).
// Bounded to MAX_CACHE entries to avoid unbounded memory growth.
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const URL_TTL = 55 * 60 * 1000; // 55 minutes (URLs expire at 60)
const MAX_CACHE = 500;

/** Evict oldest entries when cache exceeds MAX_CACHE */
function cacheSet(key: string, value: { url: string; expiresAt: number }) {
  urlCache.set(key, value);
  if (urlCache.size > MAX_CACHE) {
    // Map iteration order is insertion order — delete the first (oldest) entries
    const excess = urlCache.size - MAX_CACHE;
    const iter = urlCache.keys();
    for (let i = 0; i < excess; i++) {
      const oldest = iter.next().value;
      if (oldest !== undefined) urlCache.delete(oldest);
    }
  }
}

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
  const { portfolio } = usePortfolio();
  const isNOA = portfolio === 'noa_collection';

  // Focus-param: ?search=1 is set externally to auto-focus the search input.
  // Remove it after reading so browser-back doesn't re-trigger it.
  const shouldFocusSearch = searchParams.get('search') === '1';
  useEffect(() => {
    if (shouldFocusSearch) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('search');
        return next;
      }, { replace: true });
    }
  }, [shouldFocusSearch, setSearchParams]);

  // ---------------------------------------------------------------------------
  // All filter/pagination/sort/view state lives in the URL so navigating to an
  // artwork and pressing Back (or "Back to Artworks") restores the exact state.
  // ---------------------------------------------------------------------------
  const search      = searchParams.get('q') ?? '';
  const page        = Number(searchParams.get('pg')) || 1;
  const viewMode    = (searchParams.get('view') as ViewMode) ?? 'grid';
  const sortBy      = searchParams.get('sb') ?? 'created_at';
  const sortOrder   = (searchParams.get('so') as 'asc' | 'desc') ?? 'desc';
  const noPhotoFilter  = searchParams.get('np') === '1';
  const withPhotoFilter = searchParams.get('wp') === '1';
  const filters: ArtworkFiltersType = {
    status:     (searchParams.get('st') as ArtworkFiltersType['status'])   || undefined,
    category:   (searchParams.get('cat') as ArtworkFiltersType['category']) || undefined,
    motif:      (searchParams.get('motif') as ArtworkFiltersType['motif'])  || undefined,
    series:     (searchParams.get('series') as ArtworkFiltersType['series']) || undefined,
    gallery_id: searchParams.get('gal') || undefined,
    color:      searchParams.get('color') || undefined,
    medium:     searchParams.get('medium') || undefined,
    artist:     searchParams.get('artist') || undefined,
    minHeight:  searchParams.get('mnh') ? Number(searchParams.get('mnh')) : undefined,
    maxHeight:  searchParams.get('mxh') ? Number(searchParams.get('mxh')) : undefined,
    minWidth:   searchParams.get('mnw') ? Number(searchParams.get('mnw')) : undefined,
    maxWidth:   searchParams.get('mxw') ? Number(searchParams.get('mxw')) : undefined,
  };

  // UI-only state (no need to persist)
  const [excelImporterOpen, setExcelImporterOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const isFilteringByStatus = Boolean(filters.status);

  const { artworks, loading, totalCount, refetch, bulkDeleteArtworks, bulkUpdateArtworks } = useArtworks({
    filters: {
      ...filters,
      search,
      sortBy,
      sortOrder,
      // Exclude archived from main list unless explicitly filtering by archived
      ...(!isFilteringByStatus ? { excludeStatus: 'archived' as const } : {}),
    },
    page,
    pageSize: PAGE_SIZE,
  });

  // Separate query for archived artworks (only when not filtering by a specific status)
  const { artworks: archivedArtworks, loading: archivedLoading } = useArtworks({
    filters: { ...filters, search, status: 'archived' as const, sortBy, sortOrder },
    page: 1,
    pageSize: 100,
  });

  // ---- Bulk selection -------------------------------------------------------

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkEditing, setBulkEditing] = useState(false);

  // Clear selection whenever the URL (= any filter/page/sort) changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchParams]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allOnPage = artworks.map((a) => a.id);
      const allSelected = allOnPage.every((id) => prev.has(id));
      if (allSelected) {
        return new Set();
      }
      return new Set(allOnPage);
    });
  }, [artworks]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const ok = await bulkDeleteArtworks(Array.from(selectedIds));
    setBulkDeleting(false);
    if (ok) {
      setSelectedIds(new Set());
      refetch();
    }
  }, [selectedIds, bulkDeleteArtworks, refetch]);

  const handleBulkEdit = useCallback(async (data: import('../types/database').ArtworkUpdate) => {
    if (selectedIds.size === 0) return;
    setBulkEditing(true);
    const ok = await bulkUpdateArtworks(Array.from(selectedIds), data);
    setBulkEditing(false);
    if (ok) {
      setSelectedIds(new Set());
      setShowBulkEdit(false);
      refetch();
    }
  }, [selectedIds, bulkUpdateArtworks, refetch]);

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

    // Generate signed URLs in parallel. Request a server-side resized
    // thumbnail (max 600px, quality 65) instead of the full-size original —
    // grid cards never show more than ~400px, so this cuts transfer from
    // multiple MB down to tens of KB per image. getSignedUrl skips the
    // transform for source images Supabase can't resize (too large) and the
    // global fallback listener swaps failed thumbnails for the original.
    const results = await Promise.all(
      imageData.map(async (img) => {
        const url = await getSignedUrl('artwork-images', img.storage_path, 600, {
          width: 600,
          quality: 65,
          resize: 'contain',
        });
        return { artworkId: img.artwork_id, url };
      }),
    );

    // Merge new URLs into cache and state
    const urlMap = { ...cached };
    const expiresAt = now + URL_TTL;
    for (const { artworkId, url } of results) {
      if (url) {
        urlMap[artworkId] = url;
        cacheSet(artworkId, { url, expiresAt });
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
      let { data: cert } = await supabase
        .from('certificates')
        .select('certificate_number, issue_date, qr_code_url')
        .eq('artwork_id', artworkId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Auto-create certificate if missing
      if (!cert) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in.', variant: 'error' });
          return;
        }

        const { data: certNumber, error: rpcErr } = await supabase.rpc('generate_document_number', {
          p_user_id: session.user.id,
          p_prefix: 'COA',
        });

        if (rpcErr || !certNumber) {
          toast({ title: 'Error', description: 'Failed to generate certificate number.', variant: 'error' });
          return;
        }

        const issueDate = new Date().toISOString().split('T')[0];
        const { error: insertErr } = await supabase
          .from('certificates')
          .insert({
            user_id: session.user.id,
            artwork_id: artworkId,
            certificate_number: certNumber,
            issue_date: issueDate,
          } as never);

        if (insertErr) {
          toast({ title: 'Error', description: 'Failed to create certificate.', variant: 'error' });
          return;
        }

        cert = { certificate_number: certNumber, issue_date: issueDate, qr_code_url: null };
        toast({ title: 'Certificate created', description: `New certificate ${certNumber} generated.`, variant: 'success' });
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
        const url = await getSignedUrl('artwork-images', primaryImage.storage_path);
        if (url) artworkImageUrl = url;
      }

      // Download signature as blob and convert to data URL (keeps bucket private)
      let signatureUrl: string | null = null;
      try {
        const { data: sigBlob, error: sigError } = await supabase.storage
          .from('assets')
          .download('signature.png');
        if (sigBlob && !sigError) {
          signatureUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(sigBlob);
          });
        }
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
      downloadBlob(blob, buildCertificateFilename(artwork));
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to download certificate.', variant: 'error' });
    } finally {
      setDownloadingCertId(null);
    }
  }, [artworks, toast]);

  // Helpers for modifying URL params
  function updateParams(updater: (p: URLSearchParams) => void) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      updater(next);
      return next;
    }, { replace: true });
  }

  const FILTER_PARAM_KEYS = ['st','cat','motif','series','gal','color','medium','artist','mnh','mxh','mnw','mxw'];

  function handleSearchChange(value: string) {
    updateParams(p => {
      if (value) p.set('q', value); else p.delete('q');
      p.delete('pg');
    });
  }

  function handleFiltersChange(newFilters: ArtworkFiltersType) {
    updateParams(p => {
      FILTER_PARAM_KEYS.forEach(k => p.delete(k));
      if (newFilters.status)     p.set('st',     newFilters.status);
      if (newFilters.category)   p.set('cat',    newFilters.category);
      if (newFilters.motif)      p.set('motif',  newFilters.motif);
      if (newFilters.series)     p.set('series', newFilters.series);
      if (newFilters.gallery_id) p.set('gal',    newFilters.gallery_id);
      if (newFilters.color)      p.set('color',  newFilters.color);
      if (newFilters.medium)     p.set('medium', newFilters.medium);
      if (newFilters.artist)     p.set('artist', newFilters.artist);
      if (newFilters.minHeight != null) p.set('mnh', String(newFilters.minHeight));
      if (newFilters.maxHeight != null) p.set('mxh', String(newFilters.maxHeight));
      if (newFilters.minWidth  != null) p.set('mnw', String(newFilters.minWidth));
      if (newFilters.maxWidth  != null) p.set('mxw', String(newFilters.maxWidth));
      p.delete('pg');
    });
  }

  function handleFiltersClear() {
    updateParams(p => {
      FILTER_PARAM_KEYS.forEach(k => p.delete(k));
      p.delete('pg');
    });
  }

  function handleSortChange(value: string) {
    const [col, ord] = value.split(':');
    updateParams(p => { p.set('sb', col); p.set('so', ord); p.delete('pg'); });
  }

  function handleTableSort(column: string) {
    updateParams(p => {
      if ((p.get('sb') ?? 'created_at') === column) {
        p.set('so', (p.get('so') ?? 'desc') === 'asc' ? 'desc' : 'asc');
      } else {
        p.set('sb', column);
        p.set('so', 'asc');
      }
      p.delete('pg');
    });
  }

  // ---- Filtered artworks (no photo filter) ---------------------------------

  const displayedArtworks = useMemo(() => {
    if (withPhotoFilter) return artworks.filter((a) => !!imageUrls[a.id]);
    if (noPhotoFilter)   return artworks.filter((a) => !imageUrls[a.id]);
    return artworks;
  }, [artworks, imageUrls, noPhotoFilter, withPhotoFilter]);

  // ---- CSV Export -----------------------------------------------------------

  async function handleExportCSV() {
    setExporting(true);
    try {
      // Fetch ALL artworks matching current filters (no pagination)
      let query = supabase
        .from('artworks')
        .select('id, title, artist_name, reference_code, inventory_number, medium, year, height, width, depth, dimension_unit, is_circular, price, currency, status, category, motif, series, edition_type, edition_number, edition_total, current_location, gallery_id, notes, created_at, galleries:gallery_id(name)')
        .order('created_at', { ascending: false });

      if (filters.status) query = query.eq('status', filters.status);
      else query = query.neq('status', 'archived');
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.motif) query = query.eq('motif', filters.motif);
      if (filters.series) query = query.eq('series', filters.series);
      if (filters.gallery_id) query = query.eq('gallery_id', filters.gallery_id);
      if (filters.color) query = query.eq('color', filters.color);
      if (search) {
        const term = `%${search}%`;
        query = query.or(`title.ilike.${term},reference_code.ilike.${term},medium.ilike.${term}`);
      }

      const { data: allArtworks } = await query;
      if (!allArtworks || allArtworks.length === 0) return;

      let rows = allArtworks as (typeof allArtworks[number] & { galleries?: { name: string } | null })[];

      // If noPhotoFilter or withPhotoFilter, cross-reference artwork_images
      if (noPhotoFilter || withPhotoFilter) {
        const ids = rows.map((a) => a.id);
        const { data: imagesData } = await supabase
          .from('artwork_images')
          .select('artwork_id')
          .in('artwork_id', ids)
          .eq('is_primary', true);

        const idsWithImages = new Set((imagesData ?? []).map((i) => i.artwork_id));
        if (noPhotoFilter)   rows = rows.filter((a) => !idsWithImages.has(a.id));
        if (withPhotoFilter) rows = rows.filter((a) =>  idsWithImages.has(a.id));
      }

      // Build CSV
      const headers = ['Reference Code', 'Title', 'Medium', 'Year', 'Dimensions', 'Edition', 'Price', 'Currency', 'Status', 'Category', 'Series', 'Gallery', 'Location', 'Notes'];
      const csvRows = rows.map((a) => [
        a.reference_code,
        a.title,
        a.medium ?? '',
        a.year ?? '',
        formatDimensions(a.height, a.width, a.depth, a.dimension_unit, a.is_circular),
        a.edition_type === 'unique' ? 'Unique' : a.edition_number && a.edition_total ? `${a.edition_number}/${a.edition_total}` : a.edition_type ?? '',
        a.price ?? '',
        a.currency ?? '',
        a.status,
        a.category ?? '',
        a.series ?? '',
        a.galleries?.name ?? '',
        a.current_location ?? '',
        (a.notes ?? '').replace(/[\n\r]+/g, ' '),
      ]);

      const escape = (v: string | number) => {
        const s = String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const csv = [headers.join(','), ...csvRows.map((r) => r.map(escape).join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      downloadBlob(blob, `NOA_Artworks_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Artworks
            {!loading && (
              <span className="ml-2 text-base font-normal text-primary-400">
                ({totalCount})
              </span>
            )}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} loading={exporting}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => setExcelImporterOpen(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Import Excel
          </Button>
          <Button onClick={() => navigate('/artworks/new')}>
            New Artwork
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="mb-6">
        <ArtworkFilters
          filters={filters}
          onChange={handleFiltersChange}
          onClear={handleFiltersClear}
          search={search}
          onSearchChange={handleSearchChange}
          shouldFocusSearch={shouldFocusSearch}
          withPhotoFilter={withPhotoFilter}
          onWithPhotoChange={(v) => updateParams(p => { if (v) p.set('wp','1'); else p.delete('wp'); p.delete('pg'); })}
          noPhotoFilter={noPhotoFilter}
          onNoPhotoChange={(v) => updateParams(p => { if (v) p.set('np','1'); else p.delete('np'); p.delete('pg'); })}
          viewMode={viewMode}
          onViewModeChange={(v) => updateParams(p => { if (v === 'grid') p.delete('view'); else p.set('view', v); })}
          sortValue={`${sortBy}:${sortOrder}`}
          onSortChange={handleSortChange}
          sortOptions={SORT_OPTIONS}
          showArtistFilter={isNOA}
        />
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5">
          <span className="text-sm font-medium text-primary-700">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            onClick={() => setShowBulkEdit(true)}
          >
            Edit Selected
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={bulkDeleting}
          >
            {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
          </Button>
          <button
            type="button"
            className="ml-auto text-sm text-primary-500 hover:text-primary-700"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && displayedArtworks.length === 0 && (
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
      {!loading && displayedArtworks.length > 0 && viewMode === 'grid' && (
        <>
          <div className="columns-2 gap-3 sm:columns-3 xl:columns-4 [&>*]:mb-3 [&>*]:break-inside-avoid">
            {displayedArtworks.map((artwork) => (
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
                onPageChange={(p) => updateParams(n => { if (p === 1) n.delete('pg'); else n.set('pg', String(p)); })}
              />
            </div>
          )}
        </>
      )}

      {/* Artwork table */}
      {!loading && displayedArtworks.length > 0 && viewMode === 'table' && (
        <>
          <ArtworkTable
            artworks={displayedArtworks}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleTableSort}
            onRowClick={(id) => navigate(`/artworks/${id}`)}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            showArtist={isNOA}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => updateParams(n => { if (p === 1) n.delete('pg'); else n.set('pg', String(p)); })}
              />
            </div>
          )}
        </>
      )}

      {/* Archived artworks section */}
      {!isFilteringByStatus && !archivedLoading && archivedArtworks.length > 0 && (
        <details className="mt-8 group">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-primary-500 hover:text-primary-700">
            <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            Archive ({archivedArtworks.length})
          </summary>
          <div className="mt-3 overflow-x-auto rounded-lg border border-primary-100 opacity-75">
            <table className="min-w-full divide-y divide-primary-100">
              <thead className="bg-primary-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Title</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Gallery</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Medium</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Year</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-50 bg-white">
                {archivedArtworks.map((artwork) => (
                  <tr
                    key={artwork.id}
                    className="cursor-pointer hover:bg-primary-50 transition-colors"
                    onClick={() => navigate(`/artworks/${artwork.id}`)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-primary-500">{artwork.reference_code}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-400">{artwork.title}</td>
                    <td className="hidden lg:table-cell whitespace-nowrap px-4 py-3 text-sm text-accent truncate">{(artwork as Record<string, unknown> & { galleries?: { name: string } | null }).galleries?.name ?? '—'}</td>
                    <td className="hidden md:table-cell whitespace-nowrap px-4 py-3 text-sm text-primary-400">{artwork.medium ?? '—'}</td>
                    <td className="hidden sm:table-cell whitespace-nowrap px-4 py-3 text-sm text-primary-400">{artwork.year ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={artwork.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/artworks/${artwork.id}`); }}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Excel Import Modal */}
      <ExcelImporter
        isOpen={excelImporterOpen}
        onClose={() => setExcelImporterOpen(false)}
        onImportComplete={() => refetch()}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Artworks"
        message={`Are you sure you want to permanently delete ${selectedIds.size} artwork${selectedIds.size > 1 ? 's' : ''}? This will also remove any associated sales records, images, and certificates. This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size} Artwork${selectedIds.size > 1 ? 's' : ''}`}
        variant="danger"
      />

      {/* Bulk Edit Modal */}
      <ArtworkBulkEditModal
        isOpen={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        selectedCount={selectedIds.size}
        onSubmit={handleBulkEdit}
        loading={bulkEditing}
      />
    </div>
  );
}
