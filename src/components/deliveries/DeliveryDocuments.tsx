import { useState, useEffect, useCallback, useRef } from 'react';
import { sanitizeStoragePath } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import type { DeliveryDocumentRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DeliveryDocumentsProps {
  deliveryId: string;
}

// Import/export paperwork arrives as PDFs or as scans/photos
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeliveryDocuments({ deliveryId }: DeliveryDocumentsProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<DeliveryDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ---- Fetch ---------------------------------------------------------------

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('delivery_documents')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('created_at', { ascending: true });
    setDocs((data as DeliveryDocumentRow[]) ?? []);
    setLoading(false);
  }, [deliveryId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // ---- Upload --------------------------------------------------------------

  async function handleFiles(files: FileList | File[]) {
    const validFiles = Array.from(files).filter((f) => ACCEPTED_TYPES.includes(f.type));
    if (validFiles.length === 0) {
      toast({ title: 'Invalid file type', description: 'Only PDF, JPG, and PNG files are allowed.', variant: 'error' });
      return;
    }
    const oversized = validFiles.filter((f) => f.size > 50 * 1024 * 1024);
    if (oversized.length > 0) {
      toast({ title: 'File too large', description: 'Maximum file size is 50 MB.', variant: 'error' });
      return;
    }

    setUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setUploading(false); return; }
    const userId = session.user.id;

    let uploaded = 0;
    for (const file of validFiles) {
      const safeName = sanitizeStoragePath(file.name);
      const storagePath = `delivery-docs/${deliveryId}/${safeName}`;
      const { error: uploadErr } = await supabase.storage
        .from('media-files')
        .upload(storagePath, file, { upsert: true, contentType: file.type });
      if (uploadErr) continue;

      const { error: dbErr } = await supabase
        .from('delivery_documents')
        .upsert({
          user_id: userId,
          delivery_id: deliveryId,
          file_name: file.name,
          storage_path: storagePath,
        } as never, { onConflict: 'storage_path' });
      if (!dbErr) uploaded++;
    }

    setUploading(false);
    if (uploaded > 0) {
      toast({ title: 'Upload complete', description: `${uploaded} document(s) uploaded.`, variant: 'success' });
      await fetchDocs();
    } else {
      toast({ title: 'Upload failed', variant: 'error' });
    }
  }

  // ---- Download ------------------------------------------------------------

  async function handleDownload(doc: DeliveryDocumentRow) {
    const { data } = await supabase.storage
      .from('media-files')
      .createSignedUrl(doc.storage_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  // ---- Delete --------------------------------------------------------------

  async function handleDelete(doc: DeliveryDocumentRow) {
    await supabase.storage.from('media-files').remove([doc.storage_path]);
    await supabase.from('delivery_documents').delete().eq('id', doc.id);
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    toast({ title: 'Document deleted', variant: 'success' });
  }

  // ---- Drag & drop ---------------------------------------------------------

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave(e: React.DragEvent) { e.preventDefault(); setIsDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  // ---- Render --------------------------------------------------------------

  return (
    <section className="rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
      <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
        Import / Export Documents
        {!loading && docs.length > 0 && (
          <span className="ml-2 text-sm font-normal text-primary-400">({docs.length})</span>
        )}
      </h2>

      {/* Document list */}
      {loading ? (
        <div className="flex justify-center py-4"><LoadingSpinner /></div>
      ) : docs.length > 0 ? (
        <ul className="mb-4 divide-y divide-primary-100">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <svg className="h-5 w-5 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="truncate text-sm text-primary-800">{doc.file_name}</span>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors sm:p-6
          ${isDragging ? 'border-accent bg-accent/5' : 'border-primary-200 hover:border-primary-300'}
          ${uploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
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
            <p className="text-sm text-primary-500">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg className="h-8 w-8 text-primary-300" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm text-primary-500">
              Drop customs / shipping documents here or <span className="font-medium text-accent">browse</span>
            </p>
            <p className="text-xs text-primary-400">PDF, JPG, PNG · max 50 MB</p>
          </div>
        )}
      </div>
    </section>
  );
}
