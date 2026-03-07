import React, { useState, useCallback, useRef } from 'react';
import { useMediaFiles } from '../hooks/useMediaFiles';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
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
    text: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
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

// ---------------------------------------------------------------------------
// Upload mode type
// ---------------------------------------------------------------------------
type UploadMode = 'file' | 'text';

export function MediaLibraryPage() {
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>('file');

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('press');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  // Text entry state
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textCredit, setTextCredit] = useState('');
  const [textSourceUrl, setTextSourceUrl] = useState('');
  const [textCategory, setTextCategory] = useState('press');
  const [textDescription, setTextDescription] = useState('');

  // Reject state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  // Text detail view
  const [viewingTextEntry, setViewingTextEntry] = useState<typeof files[number] | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    files,
    loading,
    uploadFile: doUpload,
    createTextEntry,
    deleteFile,
    approveFile,
    rejectFile,
    downloadFile,
  } = useMediaFiles({ category: activeCategory || undefined });

  const pendingFiles = files.filter((f) => f.status === 'pending_review');
  const publishedFiles = files.filter((f) => f.status !== 'pending_review');

  const filteredFiles = searchQuery
    ? publishedFiles.filter(
        (f) =>
          f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.credit?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.text_content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : publishedFiles;

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

  const handleCreateTextEntry = useCallback(async () => {
    if (!textTitle || !textContent || !textCategory) return;
    setUploading(true);
    const result = await createTextEntry(
      textCategory,
      textTitle,
      textContent,
      textCredit,
      textSourceUrl,
      textDescription,
    );
    setUploading(false);
    if (result) {
      setShowUploadModal(false);
      resetTextForm();
    }
  }, [textTitle, textContent, textCategory, textCredit, textSourceUrl, textDescription, createTextEntry]);

  function resetTextForm() {
    setTextTitle('');
    setTextContent('');
    setTextCredit('');
    setTextSourceUrl('');
    setTextCategory('press');
    setTextDescription('');
  }

  function resetFileForm() {
    setUploadFile(null);
    setUploadTitle('');
    setUploadDescription('');
    setUploadCategory('press');
  }

  function openUploadModal() {
    setUploadMode('file');
    resetFileForm();
    resetTextForm();
    setShowUploadModal(true);
  }

  const handleDelete = useCallback(
    async (id: string) => {
      if (window.confirm('Are you sure you want to delete this entry?')) {
        await deleteFile(id);
      }
    },
    [deleteFile]
  );

  const handleReject = useCallback(
    async (id: string) => {
      if (!rejectNotes.trim()) return;
      await rejectFile(id, rejectNotes);
      setRejectingId(null);
      setRejectNotes('');
    },
    [rejectFile, rejectNotes]
  );

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
          <p className="text-sm text-gray-500 mt-1">Manage shared files, texts, and media.</p>
        </div>
        <Button onClick={openUploadModal}>Add Entry</Button>
      </div>

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

      {/* Search */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search files, texts, credits..."
      />

      {/* File Grid */}
      {filteredFiles.length === 0 ? (
        <EmptyState
          title="No entries found"
          description={
            activeCategory
              ? 'No entries in this category yet. Add one to get started.'
              : 'No media entries yet. Upload a file or create a text entry.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                  <FileIcon type={file.content_type === 'text' ? 'text' : getFileIcon(file.mime_type)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {file.title}
                  </h3>
                  {file.content_type === 'text' ? (
                    <p className="text-xs text-primary-500">Text Entry</p>
                  ) : (
                    <p className="text-xs text-gray-500 truncate">{file.file_name}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default">
                  {MEDIA_CATEGORIES.find((c) => c.value === file.category)?.label || file.category}
                </Badge>
                {file.content_type === 'text' && (
                  <Badge variant="secondary">Text</Badge>
                )}
                {file.status === 'rejected' && (
                  <Badge variant="destructive">Rejected</Badge>
                )}
                {file.content_type !== 'text' && file.file_size && (
                  <span className="text-xs text-gray-400">{formatFileSize(file.file_size)}</span>
                )}
              </div>

              {/* Text entry: show credit and preview */}
              {file.content_type === 'text' && (
                <>
                  {file.credit && (
                    <p className="text-xs text-primary-600">
                      <span className="font-medium">Credit:</span> {file.credit}
                    </p>
                  )}
                  {file.text_content && (
                    <p className="text-xs text-gray-500 line-clamp-3">{file.text_content}</p>
                  )}
                  {file.source_url && (
                    <a
                      href={file.source_url.startsWith('http') ? file.source_url : `https://${file.source_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline truncate block"
                    >
                      {file.source_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  )}
                </>
              )}

              {/* File entry: show description */}
              {file.content_type !== 'text' && file.description && (
                <p className="text-xs text-gray-500 line-clamp-2">{file.description}</p>
              )}

              <div className="text-xs text-gray-400">
                {formatDate(file.created_at)}
                {file.galleries?.name && (
                  <span className="ml-1">by {file.galleries.name}</span>
                )}
              </div>

              <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                {file.content_type === 'text' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setViewingTextEntry(file)}
                  >
                    View
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => downloadFile(file.storage_path, file.file_name)}
                  >
                    Download
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(file.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pending Gallery Submissions */}
      {pendingFiles.length > 0 && (
        <div className="space-y-4 mt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            Pending Gallery Submissions
            <Badge variant="secondary" className="ml-2">
              {pendingFiles.length}
            </Badge>
          </h2>

          <div className="space-y-3">
            {pendingFiles.map((file) => (
              <Card key={file.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                    <FileIcon type={file.content_type === 'text' ? 'text' : getFileIcon(file.mime_type)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900">{file.title}</h3>
                    <p className="text-xs text-gray-500">
                      {file.content_type === 'text' ? 'Text Entry' : `${file.file_name} \u00b7 ${formatFileSize(file.file_size)}`}
                      {file.galleries?.name && ` \u00b7 Submitted by ${file.galleries.name}`}
                    </p>
                    {file.description && (
                      <p className="text-xs text-gray-400 mt-1">{file.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {file.content_type === 'text' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingTextEntry(file)}
                      >
                        Preview
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadFile(file.storage_path, file.file_name)}
                      >
                        Preview
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => approveFile(file.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        setRejectingId(file.id);
                        setRejectNotes('');
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>

                {rejectingId === file.id && (
                  <div className="mt-3 flex gap-2">
                    <textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                      rows={2}
                    />
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => handleReject(file.id)}
                        disabled={!rejectNotes.trim()}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upload / Text Entry Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          if (!uploading) {
            setShowUploadModal(false);
            resetFileForm();
            resetTextForm();
          }
        }}
        title="Add Media Entry"
        size="lg"
      >
        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex rounded-lg border border-primary-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                uploadMode === 'file'
                  ? 'bg-primary-900 text-white'
                  : 'bg-white text-primary-600 hover:bg-primary-50'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload File
              </span>
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('text')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                uploadMode === 'text'
                  ? 'bg-primary-900 text-white'
                  : 'bg-white text-primary-600 hover:bg-primary-50'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Text Entry
              </span>
            </button>
          </div>

          {uploadMode === 'file' ? (
            <>
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

              <Input
                label="Title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="File title"
              />

              <Select
                label="Category"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                options={[...MEDIA_CATEGORIES]}
              />

              <Textarea
                label="Description (optional)"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Optional file description..."
              />

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadModal(false);
                    resetFileForm();
                  }}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!uploadFile || !uploadTitle || uploading}
                  loading={uploading}
                >
                  Upload
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Text Entry Form */}
              <Input
                label="Title *"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                placeholder="Entry title (e.g., article name)"
              />

              <Textarea
                label="Text Content *"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste or write the text content here..."
                rows={6}
              />

              <Input
                label="Credit"
                value={textCredit}
                onChange={(e) => setTextCredit(e.target.value)}
                placeholder="Author, photographer, or source credit"
              />

              <Input
                label="Source URL"
                value={textSourceUrl}
                onChange={(e) => setTextSourceUrl(e.target.value)}
                placeholder="https://..."
              />

              <Select
                label="Category"
                value={textCategory}
                onChange={(e) => setTextCategory(e.target.value)}
                options={[...MEDIA_CATEGORIES]}
              />

              <Textarea
                label="Description (optional)"
                value={textDescription}
                onChange={(e) => setTextDescription(e.target.value)}
                placeholder="Short description for this entry..."
              />

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadModal(false);
                    resetTextForm();
                  }}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTextEntry}
                  disabled={!textTitle || !textContent || uploading}
                  loading={uploading}
                >
                  Create Entry
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* View Text Entry Modal */}
      <Modal
        isOpen={viewingTextEntry !== null}
        onClose={() => setViewingTextEntry(null)}
        title={viewingTextEntry?.title ?? 'Text Entry'}
        size="lg"
      >
        {viewingTextEntry && (
          <div className="space-y-4">
            {viewingTextEntry.credit && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary-400 mb-1">Credit</p>
                <p className="text-sm text-primary-800">{viewingTextEntry.credit}</p>
              </div>
            )}

            {viewingTextEntry.source_url && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary-400 mb-1">Source</p>
                <a
                  href={viewingTextEntry.source_url.startsWith('http') ? viewingTextEntry.source_url : `https://${viewingTextEntry.source_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent hover:underline"
                >
                  {viewingTextEntry.source_url}
                </a>
              </div>
            )}

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400 mb-1">Content</p>
              <div className="whitespace-pre-wrap text-sm text-primary-700 bg-primary-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                {viewingTextEntry.text_content}
              </div>
            </div>

            {viewingTextEntry.description && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary-400 mb-1">Description</p>
                <p className="text-sm text-primary-600">{viewingTextEntry.description}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setViewingTextEntry(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
