import { useState, useEffect, useCallback, useRef } from 'react';
import { sanitizeStoragePath } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { getSignedUrls } from '../../lib/signedUrlCache';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProductionOrderImagesProps {
  productionOrderId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCEPTED_MIME = 'image/jpeg,image/png,image/webp';
const BUCKET = 'artwork-images';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function isAcceptedFile(file: File): boolean {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const validExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  const validMime = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  return validExt && validMime;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductionOrderImages({ productionOrderId }: ProductionOrderImagesProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<Array<{ path: string; url: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ---- Fetch existing images -----------------------------------------------

  const fetchImages = useCallback(async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const prefix = `${session.user.id}/production-orders/${productionOrderId}/`;
    const { data } = await supabase.storage.from(BUCKET).list(prefix);

    if (data && data.length > 0) {
      const paths = data.map((file) => `${prefix}${file.name}`);
      const signedMap = await getSignedUrls(BUCKET, paths);
      const urls = paths
        .map((path) => {
          const url = signedMap.get(path);
          return url ? { path, url } : null;
        })
        .filter((item): item is { path: string; url: string } => item !== null);
      setImages(urls);
    } else {
      setImages([]);
    }

    setLoading(false);
  }, [productionOrderId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // ---- Upload handler ------------------------------------------------------

  async function handleFiles(files: FileList | File[]) {
    const validFiles = Array.from(files).filter(isAcceptedFile);
    if (validFiles.length === 0) {
      toast({ title: 'Invalid file type', description: 'Please use JPG, PNG, or WebP.', variant: 'error' });
      return;
    }

    // Check file size limit
    const oversizedFiles = validFiles.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast({ title: 'File too large', description: 'Maximum file size is 100MB.', variant: 'error' });
      return;
    }

    setUploading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
      setUploading(false);
      return;
    }

    for (const file of validFiles) {
      const safeName = sanitizeStoragePath(file.name);
      const storagePath = `${session.user.id}/production-orders/${productionOrderId}/${safeName}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: true });

      if (error) {
        toast({ title: 'Upload failed', description: 'An error occurred. Please try again.', variant: 'error' });
      }
    }

    toast({ title: 'Upload complete', description: `${validFiles.length} image(s) uploaded.`, variant: 'success' });
    setUploading(false);
    await fetchImages();
  }

  // ---- Delete handler ------------------------------------------------------

  async function handleDelete(path: string) {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      toast({ title: 'Delete failed', description: 'An error occurred. Please try again.', variant: 'error' });
    } else {
      toast({ title: 'Image deleted', variant: 'success' });
      setImages((prev) => prev.filter((img) => img.path !== path));
    }
  }

  // ---- Drag & drop ---------------------------------------------------------

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  // ---- Render --------------------------------------------------------------

  return (
    <section className="rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
      <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
        Reference Images
      </h2>

      {/* Image grid */}
      {loading ? (
        <div className="flex justify-center py-4">
          <LoadingSpinner />
        </div>
      ) : images.length > 0 ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div key={img.path} className="group relative overflow-hidden rounded-lg border border-primary-100">
              <img
                src={img.url}
                alt="Reference"
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleDelete(img.path)}
                className="absolute right-1.5 top-1.5 rounded-full bg-red-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                title="Delete"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors sm:p-6
          ${isDragging
            ? 'border-accent bg-accent/5'
            : 'border-primary-200 hover:border-primary-300'
          }
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MIME}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner />
            <p className="text-sm text-primary-500">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="h-8 w-8 text-primary-300" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-primary-500">
              Drop reference images here or <span className="font-medium text-accent">browse</span>
            </p>
            <p className="text-xs text-primary-400">JPG, PNG, WebP</p>
          </div>
        )}
      </div>
    </section>
  );
}
