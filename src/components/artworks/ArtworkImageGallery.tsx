import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { getSignedUrls } from '../../lib/signedUrlCache';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Tabs } from '../ui/Tabs';
import { IMAGE_TYPES } from '../../lib/constants';
import type { ArtworkImageRow, ImageType } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkImageGalleryProps {
  artworkId: string;
  /** When provided, delete & set-primary buttons are shown. */
  onDeleteImage?: (imageId: string, storagePath: string) => Promise<boolean>;
  onSetPrimaryImage?: (imageId: string) => Promise<boolean>;
  /** Incremented by the parent after an upload to trigger a refetch. */
  refreshKey?: number;
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

function buildImageTabs(images: ImageWithUrl[]) {
  return IMAGE_TYPES.map((t) => {
    const count = images.filter((img) => img.image_type === t.value).length;
    return {
      key: t.value,
      label: count > 0 ? `${t.label} (${count})` : t.label,
    };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtworkImageGallery({
  artworkId,
  onDeleteImage,
  onSetPrimaryImage,
  refreshKey,
}: ArtworkImageGalleryProps) {
  const [images, setImages] = useState<ImageWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('raw');
  const [selectedImage, setSelectedImage] = useState<ImageWithUrl | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // -- Fetch images and generate signed URLs --------------------------------
  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);

    let { data: rows, error: fetchError } = await supabase
      .from('artwork_images')
      .select('id, artwork_id, user_id, storage_path, file_name, image_type, is_primary, sort_order, created_at')
      .eq('artwork_id', artworkId)
      .order('sort_order', { ascending: true });

    // Fallback: if sort_order column doesn't exist yet, retry without it
    if (fetchError && fetchError.message?.includes('sort_order')) {
      const fallback = await supabase
        .from('artwork_images')
        .select('id, artwork_id, user_id, storage_path, file_name, image_type, is_primary, created_at')
        .eq('artwork_id', artworkId)
        .order('created_at', { ascending: true });

      rows = fallback.data;
      fetchError = fallback.error;
    }

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

    // Generate signed URLs for all images (cached)
    const urlMap = await getSignedUrls(
      'artwork-images',
      rows.map((r) => r.storage_path),
    );

    const imagesWithUrls: ImageWithUrl[] = rows
      .map((row) => {
        const url = urlMap.get(row.storage_path);
        return url ? { ...row, signedUrl: url } : null;
      })
      .filter((img): img is ImageWithUrl => img !== null);

    setImages(imagesWithUrls);

    // Auto-select the first tab that has images
    if (imagesWithUrls.length > 0) {
      const firstType = imagesWithUrls[0].image_type;
      setActiveTab(firstType);
    }

    setLoading(false);
  }, [artworkId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages, refreshKey]);

  // -- Action handlers ------------------------------------------------------

  const handleSetPrimary = useCallback(
    async (imageId: string) => {
      if (!onSetPrimaryImage) return;
      setActionLoading(imageId);
      const success = await onSetPrimaryImage(imageId);
      if (success) await fetchImages();
      setActionLoading(null);
    },
    [onSetPrimaryImage, fetchImages],
  );

  const handleDelete = useCallback(
    async (imageId: string, storagePath: string) => {
      if (!onDeleteImage) return;
      setActionLoading(imageId);
      const success = await onDeleteImage(imageId, storagePath);
      if (success) {
        setSelectedImage(null);
        await fetchImages();
      }
      setConfirmDelete(null);
      setActionLoading(null);
    },
    [onDeleteImage, fetchImages],
  );

  // -- Download handler -----------------------------------------------------
  const handleDownload = useCallback(async (img: ImageWithUrl) => {
    try {
      const response = await fetch(img.signedUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = img.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(img.signedUrl, '_blank');
    }
  }, []);

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
      <Tabs tabs={buildImageTabs(images)} activeTab={activeTab} onChange={setActiveTab} />

      {/* Grid */}
      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filteredImages.map((img) => (
            <div key={img.id} className="group relative">
              <button
                type="button"
                onClick={() => setSelectedImage(img)}
                className="relative aspect-square w-full overflow-hidden rounded-lg border border-primary-100 bg-primary-50 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
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

              {/* Action buttons overlay */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {/* Download button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(img);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-primary-600 shadow-sm transition-colors hover:bg-accent hover:text-white"
                    title="Download image"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                  </button>

                  {/* Set primary button */}
                  {onSetPrimaryImage && !img.is_primary && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPrimary(img.id);
                      }}
                      disabled={actionLoading === img.id}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-primary-600 shadow-sm transition-colors hover:bg-accent hover:text-white disabled:opacity-50"
                      title="Set as primary"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                      </svg>
                    </button>
                  )}

                  {/* Delete button */}
                  {onDeleteImage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(img.id);
                      }}
                      disabled={actionLoading === img.id}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-primary-600 shadow-sm transition-colors hover:bg-red-500 hover:text-white disabled:opacity-50"
                      title="Delete image"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </button>
                  )}
              </div>

              {/* Delete confirmation overlay */}
              {confirmDelete === img.id && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/60 p-2">
                  <p className="mb-2 text-center text-xs font-medium text-white">
                    Delete this image?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="rounded-md bg-white/20 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-white/30"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(img.id, img.storage_path)}
                      disabled={actionLoading === img.id}
                      className="rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                    >
                      {actionLoading === img.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
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

            {/* Lightbox action buttons */}
            <div className="absolute -bottom-12 left-1/2 flex -translate-x-1/2 gap-2">
                {/* Download button */}
                <button
                  type="button"
                  onClick={() => handleDownload(selectedImage)}
                  className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-primary-700 shadow transition-colors hover:bg-accent hover:text-white"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  Download
                </button>
                {onSetPrimaryImage && !selectedImage.is_primary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(selectedImage.id)}
                    disabled={actionLoading === selectedImage.id}
                    className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-primary-700 shadow transition-colors hover:bg-accent hover:text-white disabled:opacity-50"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                      />
                    </svg>
                    Set Primary
                  </button>
                )}
                {onDeleteImage && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDelete(selectedImage.id, selectedImage.storage_path);
                    }}
                    disabled={actionLoading === selectedImage.id}
                    className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-primary-700 shadow transition-colors hover:bg-red-500 hover:text-white disabled:opacity-50"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                    Delete
                  </button>
                )}
            </div>

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
