// ---------------------------------------------------------------------------
// NOA Inventory -- Certificates Page
// Lists all certificates with search, individual preview, and bulk export.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCertificates } from '../hooks/useCertificates';
import CertificatePreview from '../components/certificates/CertificatePreview';
import BulkCertificateExport from '../components/certificates/BulkCertificateExport';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Tabs } from '../components/ui/Tabs';
import { Pagination } from '../components/ui/Pagination';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 24;

const PAGE_TABS = [
  { key: 'list', label: 'All Certificates' },
  { key: 'export', label: 'Bulk Export' },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CertificatesPage() {
  const navigate = useNavigate();

  // ---- State --------------------------------------------------------------

  const [activeTab, setActiveTab] = useState('list');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { certificates, loading, totalCount, deleteCertificate, refetch } =
    useCertificates({
      filters: { search: search || undefined },
      page,
      pageSize: PAGE_SIZE,
    });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ---- Handlers -----------------------------------------------------------

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function handleDelete(id: string) {
    const success = await deleteCertificate(id);
    if (success) {
      refetch();
    }
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Certificates
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Manage certificates of authenticity for artworks.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[...PAGE_TABS]}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {/* ---- List tab ------------------------------------------------------ */}
      {activeTab === 'list' && (
        <>
          {/* Search */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by certificate number..."
              className="max-w-md"
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {/* Empty state */}
          {!loading && certificates.length === 0 && (
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
                    d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                  />
                </svg>
              }
              title={search ? 'No certificates found' : 'No certificates yet'}
              description={
                search
                  ? 'Try adjusting your search terms.'
                  : 'Certificates are generated from individual artwork pages.'
              }
              action={
                !search ? (
                  <Button onClick={() => navigate('/artworks')}>
                    Go to Artworks
                  </Button>
                ) : undefined
              }
            />
          )}

          {/* Certificate grid */}
          {!loading && certificates.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {certificates.map((cert) => (
                  <div key={cert.id} className="relative">
                    <CertificatePreview
                      certificate={cert as Parameters<typeof CertificatePreview>[0]['certificate']}
                      onDelete={() => handleDelete(cert.id)}
                    />
                    {/* Click overlay to navigate to artwork */}
                    {cert.artworks && (
                      <button
                        type="button"
                        onClick={() => navigate(`/artworks/${cert.artwork_id}`)}
                        className="absolute right-3 top-3 rounded-md p-1 text-primary-400 transition-colors hover:bg-primary-100 hover:text-primary-700"
                        title="View artwork"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
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
        </>
      )}

      {/* ---- Bulk Export tab ------------------------------------------------ */}
      {activeTab === 'export' && (
        <BulkCertificateExport
          certificates={
            certificates as Parameters<typeof BulkCertificateExport>[0]['certificates']
          }
        />
      )}
    </div>
  );
}
