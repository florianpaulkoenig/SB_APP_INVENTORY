import React, { useState, useCallback, useRef } from 'react';
import { useMediaFiles } from '../hooks/useMediaFiles';
import { useCVEntries } from '../hooks/useCVEntries';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { SearchInput } from '../components/ui/SearchInput';
import { formatDate } from '../lib/utils';

const MEDIA_CATEGORIES = [
  { value: 'press', label: 'Press' },
  { value: 'videos', label: 'Videos' },
  { value: 'photos', label: 'Photos' },
  { value: 'texts', label: 'Texts' },
  { value: 'interviews', label: 'Interviews' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'cv', label: 'CV' },
  { value: 'technical_docs', label: 'Technical Documents' },
  { value: 'instruction_manuals', label: 'Instruction Manuals' },
  { value: 'catalogues', label: 'Catalogues' },
  { value: 'publications', label: 'Publications' },
] as const;

const CV_CATEGORIES = [
  { value: 'education', label: 'Education' },
  { value: 'solo_exhibition', label: 'Solo Exhibition' },
  { value: 'group_exhibition', label: 'Group Exhibition' },
  { value: 'award', label: 'Award' },
  { value: 'publication', label: 'Publication' },
  { value: 'residency', label: 'Residency' },
  { value: 'collection', label: 'Collection' },
  { value: 'other', label: 'Other' },
] as const;

function getFileIcon(mimeType: string | null): string {
  if (!mimeType) return 'file';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
  return 'file';
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    video: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    audio: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3',
    pdf: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    spreadsheet: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    file: 'M7 21h10a2 2 0 002-2V9l-5-5H7a2 2 0 00-2 2v13a2 2 0 002 2z',
  };

  return (
    <svg
      className="w-8 h-8 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={icons[type] || icons.file} />
    </svg>
  );
}

export function GalleryMediaPage() {
  const { profile } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('press');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    files,
    loading: filesLoading,
    uploadFile: doUpload,
    downloadFile,
  } = useMediaFiles({
    category: activeCategory || undefined,
    galleryOnly: true,
  });

  const {
    entries: cvEntries,
    loading: cvLoading,
    exportPDF: exportCVPDF,
    exportXLS: exportCVXLS,
  } = useCVEntries();

  const publishedFiles = files.filter((f) => f.status === 'published');
  const pendingFiles = files.filter(
    (f) => f.status === 'pending_review' && f.submitted_by_gallery === profile?.gallery_id
  );
  const rejectedFiles = files.filter(
    (f) => f.status === 'rejected' && f.submitted_by_gallery === profile?.gallery_id
  );

  const filteredFiles = searchQuery
    ? publishedFiles.filter(
        (f) =>
          f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.file_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : publishedFiles;

  const loading = filesLoading || cvLoading;

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!uploadFile || !uploadTitle || !uploadCategory) return;
    setUploading(true);
    const result = await doUpload(uploadFile, uploadCategory, uploadTitle, uploadDescription);
    setUploading(false);
    if (result) {
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadCategory('press');
    }
  }, [uploadFile, uploadTitle, uploadCategory, uploadDescription, doUpload]);

  // Group CV entries by category
  const groupedCVEntries: Record<string, typeof cvEntries> = {};
  for (const entry of cvEntries) {
    if (!groupedCVEntries[entry.category]) {
      groupedCVEntries[entry.category] = [];
    }
    groupedCVEntries[entry.category].push(entry);
  }

  const cvCategoryOrder = CV_CATEGORIES.map((c) => c.value);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-sm text-gray-500 mt-1">Browse and download shared files.</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>Submit File</Button>
      </div>

      {/* Pending Submissions Banner */}
      {pendingFiles.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-yellow-600 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-yellow-800">
            You have <span className="font-semibold">{pendingFiles.length}</span> file
            {pendingFiles.length !== 1 ? 's' : ''} pending review.
          </p>
        </div>
      )}

      {/* Rejected Submissions Banner */}
      {rejectedFiles.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="text-sm text-red-800">
              <span className="font-semibold">{rejectedFiles.length}</span> file
              {rejectedFiles.length !== 1 ? 's were' : ' was'} rejected.
            </p>
          </div>
          <div className="mt-2 space-y-1 pl-8">
            {rejectedFiles.map((f) => (
              <p key={f.id} className="text-xs text-red-700">
                <span className="font-medium">{f.title}</span>
                {f.review_notes && <span className="text-red-500"> — {f.review_notes}</span>}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => setActiveCategory('')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeCategory === ''
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {MEDIA_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.value
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* CV Section — shown when CV category is selected */}
      {activeCategory === 'cv' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Curriculum Vitae</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCVPDF}>
                Download as PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportCVXLS}>
                Download as XLS
              </Button>
            </div>
          </div>

          {cvEntries.length === 0 ? (
            <EmptyState
              title="No CV entries"
              description="The artist's CV has not been published yet."
            />
          ) : (
            <div className="space-y-4">
              {cvCategoryOrder.map((catValue) => {
                const catEntries = groupedCVEntries[catValue];
                if (!catEntries || catEntries.length === 0) return null;
                const catLabel =
                  CV_CATEGORIES.find((c) => c.value === catValue)?.label || catValue;

                return (
                  <Card key={catValue} className="overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700">{catLabel}</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {catEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="px-4 py-3 flex items-center gap-4"
                        >
                          <div className="w-16 text-sm font-mono text-gray-500 flex-shrink-0">
                            {entry.year || '—'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {entry.title}
                            </p>
                            {entry.location && (
                              <p className="text-xs text-gray-500">{entry.location}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Also show CV-category media files below */}
          {filteredFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">CV Documents</h3>
            </div>
          )}
        </div>
      )}

      {/* Search (hidden for CV-only view when no files) */}
      {activeCategory !== 'cv' && (
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search files..."
        />
      )}

      {/* File Grid */}
      {filteredFiles.length === 0 && activeCategory !== 'cv' ? (
        <EmptyState
          title="No files found"
          description={
            activeCategory
              ? 'No files in this category yet.'
              : 'No media files available.'
          }
        />
      ) : filteredFiles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                  <FileIcon type={getFileIcon(file.mime_type)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {file.title}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">{file.file_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default">
                  {MEDIA_CATEGORIES.find((c) => c.value === file.category)?.label ||
                    file.category}
                </Badge>
                <span className="text-xs text-gray-400">{formatFileSize(file.file_size)}</span>
              </div>

              {file.description && (
                <p className="text-xs text-gray-500 line-clamp-2">{file.description}</p>
              )}

              <div className="text-xs text-gray-400">{formatDate(file.created_at)}</div>

              <div className="mt-auto pt-2 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => downloadFile(file.storage_path, file.file_name)}
                >
                  Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {/* My Pending Submissions */}
      {pendingFiles.length > 0 && (
        <div className="space-y-4 mt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            My Pending Submissions
            <Badge variant="secondary" className="ml-2">
              {pendingFiles.length}
            </Badge>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingFiles.map((file) => (
              <Card key={file.id} className="p-4 flex flex-col gap-2 border-yellow-200">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <FileIcon type={getFileIcon(file.mime_type)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {file.title}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">{file.file_name}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="self-start">
                  Pending Review
                </Badge>
                <p className="text-xs text-gray-400">{formatDate(file.created_at)}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          if (!uploading) {
            setShowUploadModal(false);
            setUploadFile(null);
            setUploadTitle('');
            setUploadDescription('');
          }
        }}
        title="Submit File"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              Your file will be submitted for review. Once approved by the admin, it will be
              available in the media library.
            </p>
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
          >
            {uploadFile ? (
              <div>
                <p className="text-sm font-medium text-gray-900">{uploadFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatFileSize(uploadFile.size)}
                </p>
                <p className="text-xs text-blue-600 mt-2">Click to change file</p>
              </div>
            ) : (
              <div>
                <svg
                  className="mx-auto h-10 w-10 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-sm text-gray-600 mt-2">
                  Drag and drop a file here, or click to browse
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <Input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="File title"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <Select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              options={[...MEDIA_CATEGORIES]}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="Optional file description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadModal(false);
                setUploadFile(null);
                setUploadTitle('');
                setUploadDescription('');
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || !uploadTitle || uploading}
            >
              {uploading ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
