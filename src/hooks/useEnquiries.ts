import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from '../components/ui/Toast';
import { sanitizeFilterTerm } from '../lib/utils';
import type { EnquiryRow, EnquiryInsert, EnquiryUpdate } from '../types/database';

interface UseEnquiriesOptions {
  status?: string;
  source?: string;
  priority?: string;
  search?: string;
}

export function useEnquiries(options?: UseEnquiriesOptions) {
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('enquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.status) query = query.eq('status', options.status);
    if (options?.source) query = query.eq('source', options.source);
    if (options?.priority) query = query.eq('priority', options.priority);
    if (options?.search) {
      const term = sanitizeFilterTerm(options.search);
      if (term) {
        query = query.or(
          `sender_name.ilike.%${term}%,sender_email.ilike.%${term}%,subject.ilike.%${term}%,interest_description.ilike.%${term}%`,
        );
      }
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: 'Failed to load enquiries', variant: 'error' });
    }
    setEnquiries((data as EnquiryRow[]) || []);
    setLoading(false);
  }, [options?.status, options?.source, options?.priority, options?.search, toast]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createEnquiry = useCallback(
    async (data: EnquiryInsert) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return null;

      const { data: created, error } = await supabase
        .from('enquiries')
        .insert({ ...data, user_id: session.user.id } as never)
        .select()
        .single();

      if (error) {
        toast({ title: 'Failed to create enquiry', variant: 'error' });
        return null;
      }
      toast({ title: 'Enquiry created', variant: 'success' });
      fetch();
      return created as EnquiryRow;
    },
    [toast, fetch],
  );

  const updateEnquiry = useCallback(
    async (id: string, data: EnquiryUpdate) => {
      const { error } = await supabase
        .from('enquiries')
        .update(data as never)
        .eq('id', id);

      if (error) {
        toast({ title: 'Failed to update enquiry', variant: 'error' });
        return false;
      }
      toast({ title: 'Enquiry updated', variant: 'success' });
      fetch();
      return true;
    },
    [toast, fetch],
  );

  const deleteEnquiry = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('enquiries').delete().eq('id', id);
      if (error) {
        toast({ title: 'Failed to delete enquiry', variant: 'error' });
        return false;
      }
      toast({ title: 'Enquiry deleted', variant: 'success' });
      fetch();
      return true;
    },
    [toast, fetch],
  );

  const convertToLead = useCallback(
    async (enquiryId: string) => {
      const enquiry = enquiries.find((e) => e.id === enquiryId);
      if (!enquiry) return false;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return false;

      // 1. Create or find contact
      let contactId: string | null = null;
      if (enquiry.sender_email) {
        const { data: existing } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', enquiry.sender_email)
          .limit(1)
          .single();

        if (existing) {
          contactId = existing.id;
        } else {
          const names = (enquiry.sender_name || 'Unknown').split(' ');
          const { data: newContact } = await supabase
            .from('contacts')
            .insert({
              user_id: session.user.id,
              first_name: names[0] || 'Unknown',
              last_name: names.slice(1).join(' ') || '',
              email: enquiry.sender_email,
              phone: enquiry.sender_phone,
              city: enquiry.location_city,
              country: enquiry.location_country,
              type: 'prospect',
              source: `Enquiry (${enquiry.source})`,
              tags: [],
            } as never)
            .select()
            .single();
          if (newContact) contactId = newContact.id;
        }
      }

      if (!contactId) {
        // Create contact even without email
        const names = (enquiry.sender_name || 'Unknown').split(' ');
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            user_id: session.user.id,
            first_name: names[0] || 'Unknown',
            last_name: names.slice(1).join(' ') || '',
            phone: enquiry.sender_phone,
            city: enquiry.location_city,
            country: enquiry.location_country,
            type: 'prospect',
            source: `Enquiry (${enquiry.source})`,
            tags: [],
          } as never)
          .select()
          .single();
        if (newContact) contactId = newContact.id;
      }

      if (!contactId) {
        toast({ title: 'Failed to create contact', variant: 'error' });
        return false;
      }

      // 2. Create deal at "lead" stage
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
          user_id: session.user.id,
          contact_id: contactId,
          stage: 'lead',
          value: enquiry.estimated_value,
          currency: enquiry.currency || 'EUR',
          notes: `Converted from enquiry: ${enquiry.subject || ''}\n${enquiry.interest_description || ''}`.trim(),
        } as never)
        .select()
        .single();

      if (dealError || !deal) {
        toast({ title: 'Failed to create deal', variant: 'error' });
        return false;
      }

      // 3. Update enquiry status
      await supabase
        .from('enquiries')
        .update({
          status: 'converted',
          converted_deal_id: deal.id,
          converted_contact_id: contactId,
        } as never)
        .eq('id', enquiryId);

      toast({ title: 'Enquiry converted to lead', variant: 'success' });
      fetch();
      return true;
    },
    [enquiries, toast, fetch],
  );

  return { enquiries, loading, refetch: fetch, createEnquiry, updateEnquiry, deleteEnquiry, convertToLead };
}
