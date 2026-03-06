import { useState, useCallback, useRef } from 'react';
import { Button } from '../ui/Button';
import { IMAGE_TYPES } from '../../lib/constants';
import type { ImageType } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkImageUploadProps {
  /** Called for each file to upload. Returns the created row or null on error. */
  onUpload: (file: File, imageType: ImageType) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Accepted file types
// ---------------------------------------------------------------------------

const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ACCEPTED_MIME = 'image/jpeg,image/png,image/webp';

function isAcceptedFile(file: File): boolean {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  return ACCEPTED_EXTENSIONS.includes(ext);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtworkImageUpload({ onUpload }: ArtworkImageUploadProps) {
  const [imageType, setImageType] = useState<ImageType>('retouched');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<
    { name: string; status: 'pending' | 'uploading' | 'done' | 'error' }[]
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Handle files -------------------------------------------------------

  const processFiles = useCallback(
    async (files: File[]) => {
      const valid = files.filter(isAcceptedFile);

      if (valid.length === 0) return;

      // Build queue
      const queue = valid.map((f) => ({ name: f.name, status: 'pending' as const }));
      setUploadQueue(queue);
      setUploading(true);

      for (let i = 0; i < valid.length; i++) {
        // Mark current as uploading
        setUploadQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'uploading' } : item,
          ),
        );

        try {
          await onUpload(valid[i], imageType);

          setUploadQueue((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: 'done' } : item,
            ),
          );
        } catch {
          setUploadQueue((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: 'error' } : item,
            ),
          );
        }
      }

      setUploading(false);

      // Clear the queue after a short delay so the user sees final statuses
      setTimeout(() => setUploadQueue([]), 2000);
    },
    [imageType, onUpload],
  );

  // ---- Drag-and-drop handlers ---------------------------------------------

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) processFiles(files);
    },
    [processFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  // ---- File input handler -------------------------------------------------

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) processFiles(files);

      // Reset so the same file can be selected again
      e.target.value = '';
    },
    [processFiles],
  );

  // ---- Render -------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-primary-400">
          Upload Images
        </h3>

        {/* Image type selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-primary-500">Type:</span>
          <div className="flex rounded-lg border border-primary-200 bg-white p-0.5">
            {IMAGE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setImageType(t.value as ImageType)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  imageType === t.value
                    ? 'bg-primary-900 text-white'
                    : 'text-primary-500 hover:text-primary-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? 'border-accent bg-accent/5'
            : 'border-primary-200 bg-primary-50 hover:border-primary-300'
        } ${uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        {/* Upload icon */}
        <svg
          className="mb-2 h-8 w-8 text-primary-300"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>

        <p className="mb-1 text-sm font-medium text-primary-700">
          {isDragging ? 'Drop images here' : 'Drag & drop images here'}
        </p>
        <p className="text-xs text-primary-400">or click to browse</p>
        <p className="mt-1 text-xs text-primary-400">
          JPG, PNG, WebP
        </p>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_MIME}
          multiple
          onChange={handleFileInput}
        />
      </div>

      {/* Upload queue / progress */}
      {uploadQueue.length > 0 && (
        <div className="space-y-1.5">
          {uploadQueue.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs border border-primary-100"
            >
              {/* Status icon */}
              {item.status === 'uploading' && (
                <svg
                  className="h-4 w-4 animate-spin text-accent"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {item.status === 'done' && (
                <svg
                  className="h-4 w-4 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              )}
              {item.status === 'error' && (
                <svg
                  className="h-4 w-4 text-red-500"
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
              )}
              {item.status === 'pending' && (
                <div className="h-4 w-4 rounded-full border-2 border-primary-200" />
              )}

              {/* File name */}
              <span className="flex-1 truncate text-primary-700">{item.name}</span>

              {/* Status label */}
              <span
                className={`font-medium ${
                  item.status === 'done'
                    ? 'text-emerald-600'
                    : item.status === 'error'
                      ? 'text-red-600'
                      : item.status === 'uploading'
                        ? 'text-accent'
                        : 'text-primary-400'
                }`}
              >
                {item.status === 'uploading'
                  ? 'Uploading...'
                  : item.status === 'done'
                    ? 'Done'
                    : item.status === 'error'
                      ? 'Failed'
                      : 'Waiting'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
