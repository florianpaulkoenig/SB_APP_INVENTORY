import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '../lib/supabase';
import { useArtwork, useArtworks } from '../hooks/useArtworks';
import { useArtworkImages } from '../hooks/useArtworkImages';
import { useToast } from '../components/ui/Toast';
import { ArtworkDetail } from '../components/artworks/ArtworkDetail';
import { ArtworkImageGallery } from '../components/artworks/ArtworkImageGallery';
import { ArtworkImageUpload } from '../components/artworks/ArtworkImageUpload';
import { ArtworkMovementHistory } from '../components/artworks/ArtworkMovementHistory';
import { ConditionReportPanel } from '../components/artworks/ConditionReportPanel';
import { InsurancePanel } from '../components/artworks/InsurancePanel';
import { ValuationHistory } from '../components/artworks/ValuationHistory';
import { ExhibitionHistory } from '../components/artworks/ExhibitionHistory';
import { CollectionHistory } from '../components/artworks/CollectionHistory';
import { LoanPanel } from '../components/artworks/LoanPanel';
import { ExpenseTracker } from '../components/artworks/ExpenseTracker';
import { SaleRecordPanel } from '../components/artworks/SaleRecordPanel';
import { CertificatePDF } from '../components/pdf/CertificatePDF';
import { useDocumentNumber } from '../hooks/useDocumentNumber';
import { useAuth } from '../hooks/useAuth';
import { generateArtworkRefCode, downloadBlob, buildCertificateFilename } from '../lib/utils';
import { DOC_PREFIXES } from '../lib/constants';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

// ---------------------------------------------------------------------------
// Language options for certificate PDF
// ---------------------------------------------------------------------------

type Language = 'en' | 'de' | 'fr';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
] as const;

// ---------------------------------------------------------------------------
// Certificate row shape (minimal)
// ---------------------------------------------------------------------------

interface CertificateInfo {
  id: string;
  certificate_number: string;
  issue_date: string;
  qr_code_url: string | null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ArtworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { artwork, loading, refetch: refetchArtwork } = useArtwork(id!);
  const { createArtwork, deleteArtwork } = useArtworks();
  const { generateNumber } = useDocumentNumber();
  const { uploadImage, deleteImage, setPrimaryImage } = useArtworkImages(id!);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [galleryName, setGalleryName] = useState<string | null>(null);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);
  const [certificate, setCertificate] = useState<CertificateInfo | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [downloading, setDownloading] = useState(false);

  // ---- Fetch gallery name if gallery_id is set ----------------------------

  useEffect(() => {
    async function fetchGalleryName() {
      if (!artwork?.gallery_id) {
        setGalleryName(null);
        return;
      }

      const { data } = await supabase
        .from('galleries')
        .select('name')
        .eq('id', artwork.gallery_id)
        .single();

      if (data) {
        setGalleryName(data.name);
      }
    }

    fetchGalleryName();
  }, [artwork?.gallery_id]);

  // ---- Fetch certificate for this artwork -----------------------------------

  useEffect(() => {
    async function fetchCertificate() {
      if (!id) return;

      const { data } = await supabase
        .from('certificates')
        .select('id, certificate_number, issue_date, qr_code_url')
        .eq('artwork_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setCertificate(data as CertificateInfo | null);
    }

    fetchCertificate();
  }, [id]);

  // ---- Certificate PDF download ---------------------------------------------

  const handleDownloadCertificate = useCallback(async () => {
    if (!artwork || !certificate) return;

    setDownloading(true);

    try {
      // Get signed URL for the primary artwork image (if any)
      let artworkImageUrl: string | null = null;
      const primaryImage = (await supabase
        .from('artwork_images')
        .select('storage_path')
        .eq('artwork_id', artwork.id)
        .eq('is_primary', true)
        .limit(1)
        .maybeSingle()
      ).data;

      if (primaryImage?.storage_path) {
        const { data: urlData } = await supabase.storage
          .from('artwork-images')
          .createSignedUrl(primaryImage.storage_path, 600);
        if (urlData) artworkImageUrl = urlData.signedUrl;
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

      const blob = await pdf(
        <CertificatePDF
          artwork={{
            title: artwork.title,
            reference_code: artwork.reference_code,
            medium: artwork.medium,
            year: artwork.year,
            height: artwork.height,
            width: artwork.width,
            depth: artwork.depth,
            dimension_unit: artwork.dimension_unit,
            framed_height: artwork.framed_height,
            framed_width: artwork.framed_width,
            framed_depth: artwork.framed_depth,
            edition_type: artwork.edition_type,
            edition_number: artwork.edition_number,
            edition_total: artwork.edition_total,
          }}
          certificate={{
            certificate_number: certificate.certificate_number,
            issue_date: certificate.issue_date,
            qr_code_url: certificate.qr_code_url,
          }}
          artworkImageUrl={artworkImageUrl}
          signatureUrl={signatureUrl}
          language={language}
        />,
      ).toBlob();

      downloadBlob(blob, buildCertificateFilename(artwork));
    } finally {
      setDownloading(false);
    }
  }, [artwork, certificate, language]);

  // ---- Image upload handler ------------------------------------------------

  const handleImageUpload = useCallback(
    async (file: File, imageType: import('../types/database').ImageType) => {
      const result = await uploadImage(file, imageType);
      if (result) {
        setImageRefreshKey((k) => k + 1);
      }
      return result;
    },
    [uploadImage],
  );

  const handleDeleteImage = useCallback(
    async (imageId: string, storagePath: string) => {
      const success = await deleteImage(imageId, storagePath);
      if (success) {
        setImageRefreshKey((k) => k + 1);
      }
      return success;
    },
    [deleteImage],
  );

  const handleSetPrimaryImage = useCallback(
    async (imageId: string) => {
      const success = await setPrimaryImage(imageId);
      if (success) {
        setImageRefreshKey((k) => k + 1);
      }
      return success;
    },
    [setPrimaryImage],
  );

  // ---- Mark as Sold handler ------------------------------------------------

  const handleMarkSold = useCallback(
    async (salePrice: number, currency: string, saleDateStr: string, saleCity: string, saleCountry: string, saleType: string) => {
      if (!id || !artwork) return;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return;
        }

        // Create sale record
        const { error: saleError } = await supabase
          .from('sales')
          .insert({
            artwork_id: id,
            gallery_id: artwork.gallery_id,
            sale_date: saleDateStr,
            sale_price: salePrice,
            currency,
            sale_city: saleCity.trim() || null,
            sale_country: saleCountry.trim() || null,
            sale_type: saleType || null,
            user_id: session.user.id,
          } as never)
          .select()
          .single();

        if (saleError) throw saleError;

        // Update artwork status to sold
        const { error: updateError } = await supabase
          .from('artworks')
          .update({ status: 'sold' } as never)
          .eq('id', id);

        if (updateError) throw updateError;

        toast({ title: 'Artwork marked as sold', variant: 'success' });
        await refetchArtwork();
      } catch (err: unknown) {
        toast({ title: 'Error', description: 'Failed to record sale. Please try again.', variant: 'error' });
      }
    },
    [id, artwork, toast, refetchArtwork],
  );

  // ---- Toggle partner availability handler --------------------------------

  const handleTogglePartnerAvailability = useCallback(async () => {
    if (!artwork) return;

    try {
      const { error } = await supabase
        .from('artworks')
        .update({ available_for_partners: !artwork.available_for_partners } as never)
        .eq('id', artwork.id);

      if (error) throw error;

      toast({
        title: artwork.available_for_partners ? 'Removed from partner galleries' : 'Now available for partner galleries',
        variant: 'success',
      });
      await refetchArtwork();
    } catch {
      toast({ title: 'Error', description: 'Failed to update partner availability.', variant: 'error' });
    }
  }, [artwork, toast, refetchArtwork]);

  // ---- Duplicate handler ---------------------------------------------------

  const handleDuplicate = useCallback(async () => {
    if (!artwork) return;

    try {
      // Generate new inventory number and reference code
      const [inventoryNumber, referenceCode] = await Promise.all([
        generateNumber(DOC_PREFIXES.artwork),
        Promise.resolve(generateArtworkRefCode()),
      ]);

      // Copy all artwork data except: id, reference_code, inventory_number, images, status
      const duplicateData = {
        title: `${artwork.title} (Copy)`,
        inventory_number: inventoryNumber,
        reference_code: referenceCode,
        medium: artwork.medium,
        year: artwork.year,
        height: artwork.height,
        width: artwork.width,
        depth: artwork.depth,
        dimension_unit: artwork.dimension_unit,
        framed_height: artwork.framed_height,
        framed_width: artwork.framed_width,
        framed_depth: artwork.framed_depth,
        weight: artwork.weight,
        edition_type: artwork.edition_type,
        edition_number: artwork.edition_number,
        edition_total: artwork.edition_total,
        price: artwork.price,
        currency: artwork.currency,
        category: artwork.category,
        motif: artwork.motif,
        series: artwork.series,
        gallery_id: artwork.gallery_id,
        notes: artwork.notes,
        status: 'available',
      };

      const created = await createArtwork(duplicateData as never);
      if (created) {
        toast({
          title: 'Artwork duplicated',
          description: `Created "${duplicateData.title}" with new reference code.`,
          variant: 'success',
        });
        navigate(`/artworks/${created.id}`);
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: 'Failed to duplicate artwork. Please try again.', variant: 'error' });
    }
  }, [artwork, createArtwork, generateNumber, toast, navigate]);

  // ---- Delete handler -----------------------------------------------------

  async function handleDelete() {
    if (!id) return;

    const success = await deleteArtwork(id);
    if (success) {
      navigate('/artworks');
    }
  }

  // ---- Loading state ------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ---- Not found state ----------------------------------------------------

  if (!artwork) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="font-display text-xl font-semibold text-primary-900">
          Artwork not found
        </h2>
        <p className="mt-2 text-sm text-primary-500">
          The artwork you are looking for does not exist or has been deleted.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/artworks')}
          className="mt-6"
        >
          Back to Artworks
        </Button>
      </div>
    );
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/artworks')}
        className="mb-6"
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
        Back to Artworks
      </Button>

      {/* Artwork detail */}
      <ArtworkDetail
        artwork={artwork}
        galleryName={galleryName}
        isAdmin={isAdmin}
        onEdit={() => navigate(`/artworks/${id}/edit`)}
        onDelete={handleDelete}
        onMarkSold={handleMarkSold}
        onDuplicate={handleDuplicate}
        onTogglePartnerAvailability={handleTogglePartnerAvailability}
      />

      {/* Sale record (visible when artwork is sold) */}
      <div className="mt-8">
        <SaleRecordPanel
          artworkId={id!}
          artworkStatus={artwork.status}
          onSaleDeleted={refetchArtwork}
        />
      </div>

      {/* Certificate PDF download */}
      {certificate && (
        <section className="mt-8 rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
            Certificate of Authenticity
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <p className="mr-auto text-sm text-primary-500">
              {certificate.certificate_number}
            </p>
            <div className="w-full sm:w-48">
              <Select
                label="Language"
                options={[...LANGUAGE_OPTIONS]}
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
              />
            </div>
            <Button onClick={handleDownloadCertificate} loading={downloading}>
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
              Download Certificate
            </Button>
          </div>
        </section>
      )}

      {/* Image gallery + upload */}
      <div className="mt-8 space-y-6">
        <ArtworkImageGallery
          artworkId={id!}
          onDeleteImage={handleDeleteImage}
          onSetPrimaryImage={handleSetPrimaryImage}
          refreshKey={imageRefreshKey}
        />
        <ArtworkImageUpload onUpload={handleImageUpload} />
      </div>

      {/* Condition reports */}
      <div className="mt-8">
        <ConditionReportPanel artworkId={id!} />
      </div>

      {/* Movement history */}
      <div className="mt-8">
        <ArtworkMovementHistory artworkId={id!} />
      </div>

      {/* Exhibition history */}
      <div className="mt-8">
        <ExhibitionHistory artworkId={id!} />
      </div>

      {/* Public Collections */}
      <div className="mt-8">
        <CollectionHistory artworkId={id!} />
      </div>

      {/* Loan tracking */}
      <div className="mt-8">
        <LoanPanel artworkId={id!} />
      </div>

      {/* Insurance */}
      <div className="mt-8">
        <InsurancePanel artworkId={id!} />
      </div>

      {/* Valuation history */}
      <div className="mt-8">
        <ValuationHistory artworkId={id!} />
      </div>

      {/* Expenses */}
      <div className="mt-8">
        <ExpenseTracker artworkId={id!} />
      </div>
    </div>
  );
}
