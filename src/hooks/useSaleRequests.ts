import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useAuth } from './useAuth';
import { formatCurrency } from '../lib/utils';

export interface SaleRequest {
  id: string;
  artwork_id: string;
  gallery_id: string;
  requested_by: string;
  realized_price: number;
  currency: string;
  buyer_name: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  artworks?: { title: string; reference_code: string; status: string };
  galleries?: { name: string };
}

interface CreateRequestData {
  artwork_id: string;
  realized_price: number;
  currency: string;
  buyer_name?: string;
  notes?: string;
}

interface UseSaleRequestsOptions {
  galleryId?: string;
}

export function useSaleRequests(options?: UseSaleRequestsOptions) {
  const [requests, setRequests] = useState<SaleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useAuth();

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('sale_requests')
        .select('*, artworks(title, reference_code, status), galleries(name)')
        .order('created_at', { ascending: false });

      if (options?.galleryId) {
        query = query.eq('gallery_id', options.galleryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests((data as SaleRequest[]) || []);
    } catch (err) {
      console.error('Error fetching sale requests:', err);
      toast({
        title: 'Error',
        description: 'Failed to load sale requests.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [options?.galleryId, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const createRequest = useCallback(
    async (data: CreateRequestData): Promise<SaleRequest | null> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          toast({
            title: 'Error',
            description: 'You must be logged in to create a sale request.',
            variant: 'destructive',
          });
          return null;
        }

        if (!profile?.gallery_id) {
          toast({
            title: 'Error',
            description: 'No gallery associated with your profile.',
            variant: 'destructive',
          });
          return null;
        }

        // Get artwork details for email notification
        const { data: artwork } = await supabase
          .from('artworks')
          .select('title')
          .eq('id', data.artwork_id)
          .single();

        const { data: gallery } = await supabase
          .from('galleries')
          .select('name')
          .eq('id', profile.gallery_id)
          .single();

        const artworkTitle = artwork?.title || 'Unknown Artwork';
        const galleryName = gallery?.name || 'Unknown Gallery';
        const price = formatCurrency(data.realized_price, data.currency);

        // Insert sale request
        const { data: request, error } = await supabase
          .from('sale_requests')
          .insert({
            artwork_id: data.artwork_id,
            gallery_id: profile.gallery_id,
            requested_by: session.user.id,
            realized_price: data.realized_price,
            currency: data.currency,
            buyer_name: data.buyer_name || null,
            notes: data.notes || null,
            status: 'pending',
          } as never)
          .select('*, artworks(title, reference_code, status), galleries(name)')
          .single();

        if (error) throw error;

        // Update artwork status to pending_sale
        const { error: artworkError } = await supabase
          .from('artworks')
          .update({ status: 'pending_sale' } as never)
          .eq('id', data.artwork_id);

        if (artworkError) {
          console.error('Error updating artwork status:', artworkError);
        }

        // Send email notification to admin
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: 'info@noacontemporary.com',
              subject: `Sale Request: ${artworkTitle}`,
              html: `<p>Gallery "${galleryName}" has requested to mark artwork "${artworkTitle}" as sold for ${price} ${data.currency}.</p><p>Please review in the admin panel.</p>`,
            },
          });
        } catch (emailErr) {
          console.error('Error sending email notification:', emailErr);
        }

        toast({
          title: 'Sale Request Submitted',
          description: 'Your sale request has been submitted for admin review.',
        });

        await fetchRequests();
        return request as SaleRequest;
      } catch (err) {
        console.error('Error creating sale request:', err);
        toast({
          title: 'Error',
          description: 'Failed to create sale request.',
          variant: 'destructive',
        });
        return null;
      }
    },
    [profile, toast, fetchRequests]
  );

  const approveRequest = useCallback(
    async (id: string, adminNotes?: string): Promise<boolean> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return false;

        // Get the request details first
        const request = requests.find((r) => r.id === id);
        if (!request) {
          toast({
            title: 'Error',
            description: 'Sale request not found.',
            variant: 'destructive',
          });
          return false;
        }

        // Update sale request status
        const { error: updateError } = await supabase
          .from('sale_requests')
          .update({
            status: 'approved',
            admin_notes: adminNotes || null,
            reviewed_by: session.user.id,
            reviewed_at: new Date().toISOString(),
          } as never)
          .eq('id', id);

        if (updateError) throw updateError;

        // Create sale record
        const { error: saleError } = await supabase
          .from('sales')
          .insert({
            artwork_id: request.artwork_id,
            gallery_id: request.gallery_id,
            sale_date: new Date().toISOString().split('T')[0],
            sale_price: request.realized_price,
            currency: request.currency,
            buyer_name: request.buyer_name,
          } as never);

        if (saleError) {
          console.error('Error creating sale record:', saleError);
        }

        // Update artwork status to sold
        const { error: artworkError } = await supabase
          .from('artworks')
          .update({ status: 'sold' } as never)
          .eq('id', request.artwork_id);

        if (artworkError) {
          console.error('Error updating artwork status:', artworkError);
        }

        toast({
          title: 'Request Approved',
          description: 'The sale request has been approved and the sale has been recorded.',
        });

        await fetchRequests();
        return true;
      } catch (err) {
        console.error('Error approving sale request:', err);
        toast({
          title: 'Error',
          description: 'Failed to approve sale request.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [requests, toast, fetchRequests]
  );

  const rejectRequest = useCallback(
    async (id: string, adminNotes: string): Promise<boolean> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return false;

        // Get the request details first
        const request = requests.find((r) => r.id === id);
        if (!request) {
          toast({
            title: 'Error',
            description: 'Sale request not found.',
            variant: 'destructive',
          });
          return false;
        }

        // Update sale request status
        const { error: updateError } = await supabase
          .from('sale_requests')
          .update({
            status: 'rejected',
            admin_notes: adminNotes,
            reviewed_by: session.user.id,
            reviewed_at: new Date().toISOString(),
          } as never)
          .eq('id', id);

        if (updateError) throw updateError;

        // Revert artwork status to on_consignment
        const { error: artworkError } = await supabase
          .from('artworks')
          .update({ status: 'on_consignment' } as never)
          .eq('id', request.artwork_id);

        if (artworkError) {
          console.error('Error reverting artwork status:', artworkError);
        }

        toast({
          title: 'Request Rejected',
          description: 'The sale request has been rejected.',
        });

        await fetchRequests();
        return true;
      } catch (err) {
        console.error('Error rejecting sale request:', err);
        toast({
          title: 'Error',
          description: 'Failed to reject sale request.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [requests, toast, fetchRequests]
  );

  return {
    requests,
    loading,
    createRequest,
    approveRequest,
    rejectRequest,
    refetch: fetchRequests,
  };
}
