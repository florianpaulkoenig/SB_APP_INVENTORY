import { useState, useEffect, useMemo, useCallback, createElement } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { downloadBlob, buildCertificateFilename } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { SearchInput } from '../components/ui/SearchInput';
// Download icon rendered inline below (no lucide dependency)

const statusVariant: Record<string, 'success' | 'default' | 'warning' | 'info'> = {
  available: 'success',
  sold: 'default',
  reserved: 'warning',
  in_production: 'info',
  in_transit: 'info',
  on_consignment: 'info',
  paid: 'success',
  pending_sale: 'warning',
  archived: 'default',
  destroyed: 'default',
};

interface ArtworkWithCertificate {
  id: string;
  title: string;
  reference_code: string;
  status: string;
  year: number | null;
  certificates: {
    id: string;
    certificate_number: string;
    issue_date: string;
  }[];
}

export function GalleryCertificatesPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const galleryId = profile?.gallery_id ?? '';

  const [artworks, setArtworks] = useState<ArtworkWithCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!galleryId) return;

    async function fetchArtworks() {
      setLoading(true);
      const { data, error } = await supabase
        .from('artworks')
        .select(
          'id, title, reference_code, status, year, certificates(id, certificate_number, issue_date)'
        )
        .eq('gallery_id', galleryId)
        .not('certificates', 'is', null);

      if (error) {
        toast({ title: 'Error', description: 'Failed to load certificates.', variant: 'destructive' });
      } else {
        setArtworks((data as unknown as ArtworkWithCertificate[]) ?? []);
      }
      setLoading(false);
    }

    fetchArtworks();
  }, [galleryId, toast]);

  const filtered = useMemo(() => {
    if (!search.trim()) return artworks;
    const q = search.toLowerCase();
    return artworks.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.reference_code?.toLowerCase().includes(q)
    );
  }, [artworks, search]);

  const handleDownload = useCallback(
    async (artworkId: string, certNumber: string) => {
      setDownloadingId(artworkId);
      try {
        // Fetch full artwork data
        const { data: artwork, error: artworkError } = await supabase
          .from('artworks')
          .select(
            'title, reference_code, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, edition_type, edition_number, edition_total'
          )
          .eq('id', artworkId)
          .single();

        if (artworkError || !artwork) {
          throw new Error('Failed to fetch artwork details.');
        }

        // Fetch certificate data
        const { data: certificate, error: certError } = await supabase
          .from('certificates')
          .select('certificate_number, issue_date, qr_code_url')
          .eq('artwork_id', artworkId)
          .single();

        if (certError || !certificate) {
          throw new Error('Failed to fetch certificate details.');
        }

        // Fetch primary image signed URL
        const { data: imageData } = await supabase
          .from('artwork_images')
          .select('storage_path')
          .eq('artwork_id', artworkId)
          .eq('is_primary', true)
          .single();

        let artworkImageUrl: string | null = null;
        if (imageData?.storage_path) {
          const { data: signedData } = await supabase.storage
            .from('artwork-images')
            .createSignedUrl(imageData.storage_path, 600);
          artworkImageUrl = signedData?.signedUrl ?? null;
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

        // Lazy-import react-pdf and CertificatePDF component
        const { pdf } = await import('@react-pdf/renderer');
        const { CertificatePDF } = await import('../components/pdf/CertificatePDF');

        const blob = await pdf(
          createElement(CertificatePDF, {
            artwork,
            certificate,
            artworkImageUrl,
            signatureUrl,
            language: 'en',
          })
        ).toBlob();

        downloadBlob(blob, buildCertificateFilename(artwork));

        toast({ title: 'Success', description: 'Certificate downloaded.' });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to generate certificate. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setDownloadingId(null);
      }
    },
    [toast]
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Certificates</h1>
        <p className="mt-1 text-sm text-gray-500">
          Download certificates of authenticity.
        </p>
      </div>

      <div className="max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by title…"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No certificates found"
          description={
            search
              ? 'Try adjusting your search.'
              : 'No artworks with certificates are available yet.'
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Reference Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Certificate Number
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Download
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filtered.map((artwork) => {
                  const cert = artwork.certificates[0];
                  const canDownload = artwork.status === 'paid';
                  const isDownloading = downloadingId === artwork.id;

                  return (
                    <tr key={artwork.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {artwork.title}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {artwork.reference_code}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <Badge variant={statusVariant[artwork.status] ?? 'default'}>
                          {artwork.status?.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {cert?.certificate_number ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <div className="relative inline-block group">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!canDownload || isDownloading}
                            onClick={() => handleDownload(artwork.id, cert.certificate_number)}
                          >
                            {isDownloading ? (
                              <LoadingSpinner className="h-4 w-4" />
                            ) : (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                            )}
                          </Button>
                          {!canDownload && (
                            <span className="pointer-events-none absolute -top-8 right-0 z-10 hidden whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
                              Available after payment confirmed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
