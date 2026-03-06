import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useArtwork } from '../hooks/useArtworks';
import { useArtworks } from '../hooks/useArtworks';
import { useArtworkImages } from '../hooks/useArtworkImages';
import { ArtworkDetail } from '../components/artworks/ArtworkDetail';
import { ArtworkImageGallery } from '../components/artworks/ArtworkImageGallery';
import { ArtworkImageUpload } from '../components/artworks/ArtworkImageUpload';
import { ArtworkMovementHistory } from '../components/artworks/ArtworkMovementHistory';
import { ConditionReportPanel } from '../components/artworks/ConditionReportPanel';
import { InsurancePanel } from '../components/artworks/InsurancePanel';
import { ValuationHistory } from '../components/artworks/ValuationHistory';
import { ExhibitionHistory } from '../components/artworks/ExhibitionHistory';
import { LoanPanel } from '../components/artworks/LoanPanel';
import { ExpenseTracker } from '../components/artworks/ExpenseTracker';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ArtworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { artwork, loading } = useArtwork(id!);
  const { deleteArtwork } = useArtworks();
  const { uploadImage, deleteImage, setPrimaryImage } = useArtworkImages(id!);

  const [galleryName, setGalleryName] = useState<string | null>(null);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);

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
        onEdit={() => navigate(`/artworks/${id}/edit`)}
        onDelete={handleDelete}
      />

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
