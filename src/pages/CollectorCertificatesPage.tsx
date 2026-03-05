// ---------------------------------------------------------------------------
// NOA Inventory -- Collector Certificates Page
// Shows certificates for artworks owned by the collector.
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { ArtworkRow, CertificateRow } from '../types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CertificateWithArtwork extends CertificateRow {
  artwork: ArtworkRow | null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CollectorCertificatesPage() {
  const { profile } = useAuth();

  const [certificates, setCertificates] = useState<CertificateWithArtwork[]>([]);
  const [loading, setLoading] = useState(true);

  const contactId = profile?.contact_id;

  // ---- Fetch data ---------------------------------------------------------

  useEffect(() => {
    if (!contactId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);

      // Step 1: Get all sales for this collector to find artwork_ids
      const { data: salesData } = await supabase
        .from('sales')
        .select('artwork_id')
        .eq('contact_id', contactId!);

      const artworkIds = (salesData ?? [])
        .map((s) => s.artwork_id)
        .filter(Boolean) as string[];

      if (artworkIds.length === 0) {
        setCertificates([]);
        setLoading(false);
        return;
      }

      // Step 2: Fetch certificates for those artworks
      const { data: certData } = await supabase
        .from('certificates')
        .select('*')
        .in('artwork_id', artworkIds)
        .order('issue_date', { ascending: false });

      const certs = (certData as CertificateRow[] | null) ?? [];

      // Step 3: Fetch artwork details for each certificate
      const uniqueArtworkIds = [...new Set(certs.map((c) => c.artwork_id))];

      let artworkMap = new Map<string, ArtworkRow>();

      if (uniqueArtworkIds.length > 0) {
        const { data: artworkData } = await supabase
          .from('artworks')
          .select('*')
          .in('id', uniqueArtworkIds);

        if (artworkData) {
          artworkMap = new Map(
            (artworkData as ArtworkRow[]).map((a) => [a.id, a]),
          );
        }
      }

      // Step 4: Combine certificates with artwork data
      const certsWithArtwork: CertificateWithArtwork[] = certs.map((cert) => ({
        ...cert,
        artwork: artworkMap.get(cert.artwork_id) ?? null,
      }));

      setCertificates(certsWithArtwork);
      setLoading(false);
    }

    fetchData();
  }, [contactId]);

  // ---- Handlers -----------------------------------------------------------

  function handleDownloadPdf(certificate: CertificateWithArtwork) {
    // Placeholder: In a real implementation, this would generate or
    // download the certificate PDF from storage / an Edge Function.
    const artworkTitle = certificate.artwork?.title ?? 'Artwork';
    window.alert(
      `PDF download for certificate ${certificate.certificate_number} (${artworkTitle}) will be available soon.`,
    );
  }

  // ---- Render: no contact_id configured -----------------------------------

  if (!loading && !contactId) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-primary-900">
            My Certificates
          </h1>
        </div>
        <EmptyState
          title="Your collector profile is not configured yet"
          description="Please contact an administrator to link your account to a collector profile."
        />
      </div>
    );
  }

  // ---- Render: loading ----------------------------------------------------

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-primary-900">
            My Certificates
          </h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // ---- Render: certificates -----------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">
          My Certificates
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Certificates of authenticity for your artworks.
        </p>
      </div>

      {/* Empty state */}
      {certificates.length === 0 && (
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
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          }
          title="No certificates available yet"
          description="Certificates for your artworks will appear here once they have been issued."
        />
      )}

      {/* Certificate cards */}
      {certificates.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert) => (
            <Card key={cert.id} className="p-5">
              {/* Certificate icon */}
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
                <svg
                  className="h-5 w-5 text-primary-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>

              {/* Artwork title */}
              <h3 className="text-sm font-medium text-primary-900 truncate">
                {cert.artwork?.title ?? 'Untitled Artwork'}
              </h3>

              {/* Certificate number */}
              <p className="mt-1 text-xs text-primary-500">
                Certificate: {cert.certificate_number}
              </p>

              {/* Issue date */}
              <p className="mt-0.5 text-xs text-primary-400">
                Issued: {formatDate(cert.issue_date)}
              </p>

              {/* Download button */}
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPdf(cert)}
                  className="w-full"
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
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  Download PDF
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
