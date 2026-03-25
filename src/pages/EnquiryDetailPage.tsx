import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate } from '../lib/utils';
import { ENQUIRY_SOURCES, ENQUIRY_STATUSES, ENQUIRY_PRIORITIES } from '../lib/constants';

interface Enquiry {
  id: string;
  source: string;
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  subject: string | null;
  body: string | null;
  interest_description: string | null;
  location_city: string | null;
  location_country: string | null;
  estimated_value: number | null;
  currency: string | null;
  priority: string;
  status: string;
  contact_id: string | null;
  deal_id: string | null;
  created_at: string;
  user_id: string;
}

export function EnquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEnquiry = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('enquiries')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      toast({ title: 'Failed to load enquiry', type: 'error' });
    } else {
      setEnquiry(data as Enquiry);
    }
    setLoading(false);
  }, [id, toast]);

  useEffect(() => {
    fetchEnquiry();
  }, [fetchEnquiry]);

  const convertToLead = useCallback(async () => {
    if (!enquiry) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { data: contact, error: contactErr } = await supabase
        .from('contacts')
        .insert({
          name: enquiry.sender_name || 'Unknown',
          email: enquiry.sender_email,
          phone: enquiry.sender_phone,
          city: enquiry.location_city,
          country: enquiry.location_country,
          source: enquiry.source,
          user_id: userId,
        } as never)
        .select()
        .single();
      if (contactErr) throw contactErr;

      const { data: deal, error: dealErr } = await supabase
        .from('deals')
        .insert({
          title: enquiry.subject || `Deal from ${enquiry.sender_name}`,
          contact_id: contact.id,
          value: enquiry.estimated_value,
          currency: enquiry.currency || 'EUR',
          stage: 'enquiry',
          user_id: userId,
        } as never)
        .select()
        .single();
      if (dealErr) throw dealErr;

      const { error: updateErr } = await supabase
        .from('enquiries')
        .update({
          status: 'converted',
          contact_id: contact.id,
          deal_id: deal.id,
        } as never)
        .eq('id', enquiry.id);
      if (updateErr) throw updateErr;

      toast({ title: 'Enquiry converted to lead', type: 'success' });
      fetchEnquiry();
    } catch {
      toast({ title: 'Failed to convert enquiry', type: 'error' });
    }
  }, [enquiry, toast, fetchEnquiry]);

  const handleArchive = useCallback(async () => {
    if (!enquiry) return;
    const { error } = await supabase
      .from('enquiries')
      .update({ status: 'archived' } as never)
      .eq('id', enquiry.id);
    if (error) {
      toast({ title: 'Failed to archive enquiry', type: 'error' });
    } else {
      toast({ title: 'Enquiry archived', type: 'success' });
      fetchEnquiry();
    }
  }, [enquiry, toast, fetchEnquiry]);

  const handleDelete = useCallback(async () => {
    if (!enquiry) return;
    if (!window.confirm('Are you sure you want to delete this enquiry? This action cannot be undone.')) return;
    const { error } = await supabase
      .from('enquiries')
      .delete()
      .eq('id', enquiry.id);
    if (error) {
      toast({ title: 'Failed to delete enquiry', type: 'error' });
    } else {
      toast({ title: 'Enquiry deleted', type: 'success' });
      navigate('/enquiries');
    }
  }, [enquiry, toast, navigate]);

  const getSourceBadge = (source: string) => {
    const entry = ENQUIRY_SOURCES.find((s) => s.value === source);
    return <Badge variant="default" style={{ backgroundColor: entry?.color }}>{entry?.label || source}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const entry = ENQUIRY_PRIORITIES.find((p) => p.value === priority);
    return <Badge variant="default" style={{ backgroundColor: entry?.color }}>{entry?.label || priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const entry = ENQUIRY_STATUSES.find((s) => s.value === status);
    return <Badge variant="default" style={{ backgroundColor: entry?.color }}>{entry?.label || status}</Badge>;
  };

  if (loading) return <LoadingSpinner />;
  if (!enquiry) return <div className="p-8 text-center text-gray-500">Enquiry not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => navigate('/enquiries')}>Back</Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {enquiry.subject || enquiry.sender_name || 'Untitled Enquiry'}
          </h1>
          {getStatusBadge(enquiry.status)}
        </div>
      </div>

      <Card>
        <div className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Details</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Source</p>
              <div className="mt-1">{getSourceBadge(enquiry.source)}</div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Sender Name</p>
              <p className="mt-1 text-sm text-gray-900">{enquiry.sender_name || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="mt-1 text-sm text-gray-900">{enquiry.sender_email || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <p className="mt-1 text-sm text-gray-900">{enquiry.sender_phone || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Location</p>
              <p className="mt-1 text-sm text-gray-900">
                {enquiry.location_city && enquiry.location_country
                  ? `${enquiry.location_city}, ${enquiry.location_country}`
                  : enquiry.location_country || enquiry.location_city || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Estimated Value</p>
              <p className="mt-1 text-sm text-gray-900">
                {enquiry.estimated_value
                  ? formatCurrency(enquiry.estimated_value, enquiry.currency)
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Priority</p>
              <div className="mt-1">{getPriorityBadge(enquiry.priority)}</div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Date</p>
              <p className="mt-1 text-sm text-gray-900">{formatDate(enquiry.created_at)}</p>
            </div>
          </div>
        </div>
      </Card>

      {(enquiry.subject || enquiry.body) && (
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Message</h2>
            {enquiry.subject && (
              <p className="mb-2 font-medium text-gray-900">{enquiry.subject}</p>
            )}
            {enquiry.body && (
              <p className="whitespace-pre-wrap text-sm text-gray-700">{enquiry.body}</p>
            )}
          </div>
        </Card>
      )}

      {enquiry.interest_description && (
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Interest Description</h2>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{enquiry.interest_description}</p>
          </div>
        </Card>
      )}

      {enquiry.status === 'converted' && (enquiry.contact_id || enquiry.deal_id) && (
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Converted Lead</h2>
            <div className="flex gap-4">
              {enquiry.contact_id && (
                <Button variant="secondary" onClick={() => navigate(`/contacts/${enquiry.contact_id}`)}>
                  View Contact
                </Button>
              )}
              {enquiry.deal_id && (
                <Button variant="secondary" onClick={() => navigate(`/deals`)}>
                  View Deal
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        {enquiry.status !== 'converted' && (
          <Button variant="primary" onClick={convertToLead}>Convert to Lead</Button>
        )}
        <Button variant="secondary" onClick={handleArchive}>Archive</Button>
        <Button variant="danger" onClick={handleDelete}>Delete</Button>
      </div>
    </div>
  );
}
