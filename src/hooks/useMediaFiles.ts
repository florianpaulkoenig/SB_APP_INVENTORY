import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from '../components/ui/Toast';

interface MediaFile {
  id: string;
  category: string;
  title: string;
  description: string | null;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  status: 'published' | 'pending_review' | 'rejected';
  submitted_by_gallery: string | null;
  review_notes: string | null;
  content_type: 'file' | 'text';
  text_content: string | null;
  credit: string | null;
  source_url: string | null;
  created_at: string;
  galleries?: { name: string } | null;
}

interface UseMediaFilesOptions {
  category?: string;
  status?: string;
  galleryOnly?: boolean;
}

export function useMediaFiles(options?: UseMediaFilesOptions) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile, isAdmin, isGallery } = useAuth();
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('media_files')
        .select('*, galleries:submitted_by_gallery(name)')
        .order('created_at', { ascending: false });

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.galleryOnly && isGallery && profile?.gallery_id) {
        // Gallery users see published files + their own submissions regardless of status
        query = query.or(
          `status.eq.published,submitted_by_gallery.eq.${profile.gallery_id}`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setFiles((data as MediaFile[]) || []);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to load media files.',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [options?.category, options?.status, options?.galleryOnly, isGallery, profile?.gallery_id, toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFile = useCallback(
    async (
      file: File,
      category: string,
      title: string,
      description?: string
    ): Promise<MediaFile | null> => {
      // Validate file size and MIME type before uploading
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      const ALLOWED_MIME_TYPES = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'application/pdf',
        'video/mp4', 'video/quicktime',
      ];

      if (file.size > MAX_FILE_SIZE) {
        toast({ title: 'Error', description: 'File too large. Maximum size is 100MB.', variant: 'error' });
        return null;
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast({ title: 'Error', description: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF, MP4, MOV.', variant: 'error' });
        return null;
      }

      try {
        if (!profile?.id) {
          toast({ title: 'Error', description: 'You must be logged in.', variant: 'error' });
          return null;
        }

        const fileExt = file.name.split('.').pop();
        const storagePath = `${category}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('media-files')
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        const status = isAdmin ? 'published' : 'pending_review';
        const submittedByGallery = isGallery ? profile.gallery_id : null;

        const { data, error } = await supabase
          .from('media_files')
          .insert({
            category,
            title,
            description: description || null,
            file_name: file.name,
            storage_path: storagePath,
            file_size: file.size,
            mime_type: file.type || null,
            uploaded_by: profile.id,
            status,
            submitted_by_gallery: submittedByGallery,
          } as never)
          .select('*, galleries:submitted_by_gallery(name)')
          .single();

        if (error) throw error;

        toast({
          title: 'File Uploaded',
          description: isAdmin
            ? 'File has been published.'
            : 'File submitted for review.',
          variant: 'success',
        });

        await fetchFiles();
        return data as MediaFile;
      } catch (err) {
        toast({
          title: 'Upload Failed',
          description: 'Could not upload the file. Please try again.',
          variant: 'error',
        });
        return null;
      }
    },
    [profile, isAdmin, isGallery, toast, fetchFiles]
  );

  const createTextEntry = useCallback(
    async (
      category: string,
      title: string,
      textContent: string,
      credit?: string,
      sourceUrl?: string,
      description?: string,
    ): Promise<MediaFile | null> => {
      try {
        if (!profile?.id) {
          toast({ title: 'Error', description: 'You must be logged in.', variant: 'error' });
          return null;
        }

        const status = isAdmin ? 'published' : 'pending_review';
        const submittedByGallery = isGallery ? profile.gallery_id : null;

        const { data, error } = await supabase
          .from('media_files')
          .insert({
            category,
            title,
            description: description || null,
            file_name: `${title}.txt`,
            storage_path: `text/${Date.now()}_${Math.random().toString(36).substring(2)}`,
            file_size: null,
            mime_type: null,
            uploaded_by: profile.id,
            status,
            submitted_by_gallery: submittedByGallery,
            content_type: 'text',
            text_content: textContent || null,
            credit: credit || null,
            source_url: sourceUrl || null,
          } as never)
          .select('*, galleries:submitted_by_gallery(name)')
          .single();

        if (error) throw error;

        toast({
          title: 'Text Entry Created',
          description: isAdmin
            ? 'Entry has been published.'
            : 'Entry submitted for review.',
          variant: 'success',
        });

        await fetchFiles();
        return data as MediaFile;
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Could not create text entry. Please try again.',
          variant: 'error',
        });
        return null;
      }
    },
    [profile, isAdmin, isGallery, toast, fetchFiles]
  );

  const deleteFile = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const file = files.find((f) => f.id === id);
        if (!file) return false;

        // Only delete from storage for file entries (not text entries)
        if (file.content_type !== 'text') {
          const { error: storageError } = await supabase.storage
            .from('media-files')
            .remove([file.storage_path]);

          if (storageError) {
            // Storage deletion is best-effort; continue with DB deletion
          }
        }

        const { error } = await supabase.from('media_files').delete().eq('id', id);

        if (error) throw error;

        toast({
          title: 'Entry Deleted',
          description: 'The entry has been removed.',
          variant: 'success',
        });

        await fetchFiles();
        return true;
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to delete the entry.',
          variant: 'error',
        });
        return false;
      }
    },
    [files, toast, fetchFiles]
  );

  const approveFile = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('media_files')
          .update({ status: 'published', review_notes: null } as never)
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'File Approved',
          description: 'The file is now published.',
          variant: 'success',
        });

        await fetchFiles();
        return true;
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to approve the file.',
          variant: 'error',
        });
        return false;
      }
    },
    [toast, fetchFiles]
  );

  const rejectFile = useCallback(
    async (id: string, notes: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('media_files')
          .update({ status: 'rejected', review_notes: notes } as never)
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'File Rejected',
          description: 'The submission has been rejected.',
          variant: 'success',
        });

        await fetchFiles();
        return true;
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to reject the file.',
          variant: 'error',
        });
        return false;
      }
    },
    [toast, fetchFiles]
  );

  const downloadFile = useCallback(
    async (storagePath: string, fileName: string): Promise<void> => {
      try {
        const { data, error } = await supabase.storage
          .from('media-files')
          .createSignedUrl(storagePath, 60);

        if (error) throw error;

        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        toast({
          title: 'Download Failed',
          description: 'Could not download the file.',
          variant: 'error',
        });
      }
    },
    [toast]
  );

  const refetch = useCallback(async () => {
    await fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    loading,
    uploadFile,
    createTextEntry,
    deleteFile,
    approveFile,
    rejectFile,
    downloadFile,
    refetch,
  };
}
