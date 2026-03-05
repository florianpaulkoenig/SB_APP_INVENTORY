import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Tabs } from '../ui/Tabs';
import { IMAGE_TYPES } from '../../lib/constants';
import type { ArtworkImageRow, ImageType } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkImageGalleryProps {
  artworkId: string;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ImageWithUrl extends ArtworkImageRow {
  signedUrl: string;
}

// ---------------------------------------------------------------------------
// Tabs config
// ---------------------------------------------------------------------------

const IMAGE_TABS = IMAGE_TYPES.map((t) => ({
  key: t.value,
  label: t.label,
}));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtworkImageGallery({ artworkId }: ArtworkImageGalleryProps) {
  const [images, setImages] = useState<ImageWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('raw');
  const [selectedImage, setSelectedImage] = useState<ImageWithUrl | null>(null);

  // -- Fetch images and generate signed URLs --------------------------------
  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: rows, error: fetchError } = await supabase
      .from('artwork_images')
      .select('*')
      .eq('artwork_id', artworkId)
      .order('sort_order', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    if (!rows || rows.length === 0) {
      setImages([]);
      setLoading(false);
      return;
    }

    // Generate signed URLs for all images
    const imagesWithUrls: ImageWithUrl[] = [];

    for (const row of rows) {
      const { data } = await supabase.storage
        .from('artwork-images')
        .createSignedUrl(row.storage_path, 3600);

      if (data?.signedUrl) {
        imagesWithUrls.push({ ...row, signedUrl: data.signedUrl });
      }
    }

    setImages(imagesWithUrls);
    setLoading(false);
  }, [artworkId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // -- Filter images by active tab ------------------------------------------
  const filteredImages = images.filter(
    (img) => img.image_type === (activeTab as ImageType),
  );

  // -- Loading state --------------------------------------------------------
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // -- Error state ----------------------------------------------------------
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load images: {error}
      </div>
    );
  }

  // -- Empty state (no images at all) ---------------------------------------
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          className="mb-3 h-12 w-12 text-primary-300"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
          />
        </svg>
        <p className="text-sm text-primary-400">
          No images have been uploaded for this artwork.
        </p>
      </div>
    );
  }

  // -- Gallery with tabs ----------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Image type tabs */}
      <Tabs tabs={IMAGE_TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Grid */}
      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filteredImages.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelectedImage(img)}
              className="group relative aspect-square overflow-hidden rounded-lg border border-primary-100 bg-primary-50 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              <img
                src={img.signedUrl}
                alt={img.file_name}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              {img.is_primary && (
                <span className="absolute top-2 left-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                  Primary
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-primary-400">
          No {IMAGE_TYPES.find((t) => t.value === activeTab)?.label ?? activeTab} images
          uploaded.
        </div>
      )}

      {/* Lightbox overlay */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary-700 shadow-md transition-colors hover:bg-primary-50"
              aria-label="Close preview"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <img
              src={selectedImage.signedUrl}
              alt={selectedImage.file_name}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />

            {/* File name label */}
            <div className="mt-2 text-center">
              <p className="text-xs text-white/70">{selectedImage.file_name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
