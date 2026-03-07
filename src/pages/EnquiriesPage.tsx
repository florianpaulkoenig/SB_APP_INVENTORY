import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnquiries } from '../hooks/useEnquiries';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate } from '../lib/utils';
import { ENQUIRY_SOURCES, ENQUIRY_STATUSES, ENQUIRY_PRIORITIES, CURRENCIES } from '../lib/constants';

export function EnquiriesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { enquiries, loading, createEnquiry, updateEnquiry, convertToLead } = useEnquiries();

  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    source: '',
    sender_name: '',
    sender_email: '',
    sender_phone: '',
    subject: '',
    body: '',
    interest_description: '',
    location_city: '',
    location_country: '',
    estimated_value: '',
    currency: 'EUR',
    priority: 'medium',
  });

  const resetForm = useCallback(() => {
    setFormData({
      source: '',
      sender_name: '',
      sender_email: '',
      sender_phone: '',
      subject: '',
      body: '',
      interest_description: '',
      location_city: '',
      location_country: '',
      estimated_value: '',
      currency: 'EUR',
      priority: 'medium',
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      await createEnquiry({
        ...formData,
        estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
      } as never);
      toast({ title: 'Enquiry created successfully', type: 'success' });
      setShowModal(false);
      resetForm();
    } catch {
      toast({ title: 'Failed to create enquiry', type: 'error' });
    }
  }, [formData, createEnquiry, toast, resetForm]);

  const handleConvert = useCallback(async (id: string) => {
    try {
      await convertToLead(id);
      toast({ title: 'Enquiry converted to lead', type: 'success' });
    } catch {
      toast({ title: 'Failed to convert enquiry', type: 'error' });
    }
  }, [convertToLead, toast]);

  const handleArchive = useCallback(async (id: string) => {
    try {
      await updateEnquiry(id, { status: 'archived' } as never);
      toast({ title: 'Enquiry archived', type: 'success' });
    } catch {
      toast({ title: 'Failed to archive enquiry', type: 'error' });
    }
  }, [updateEnquiry, toast]);

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

  const formatLocation = (city?: string, country?: string) => {
    if (city && country) return `${city}, ${country}`;
    return country || city || '—';
  };

  const filteredEnquiries = enquiries.filter((e) => {
    if (filterStatus && e.status !== filterStatus) return false;
    if (filterSource && e.source !== filterSource) return false;
    if (filterPriority && e.priority !== filterPriority) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = e.sender_name?.toLowerCase().includes(q);
      const matchSubject = e.subject?.toLowerCase().includes(q);
      const matchEmail = e.sender_email?.toLowerCase().includes(q);
      if (!matchName && !matchSubject && !matchEmail) return false;
    }
    return true;
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
        <Button variant="primary" onClick={() => setShowModal(true)}>Add Enquiry</Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-4">
          <Select label="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} options={[{value: '', label: 'All Statuses'}, ...ENQUIRY_STATUSES]} />
          <Select label="Source" value={filterSource} onChange={(e) => setFilterSource(e.target.value)} options={[{value: '', label: 'All Sources'}, ...ENQUIRY_SOURCES]} />
          <Select label="Priority" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} options={[{value: '', label: 'All Priorities'}, ...ENQUIRY_PRIORITIES]} />
          <Input label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, subject, email..." />
        </div>
      </Card>

      <Card>
        {filteredEnquiries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No enquiries yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Sender</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Subject/Interest</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Est. Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredEnquiries.map((enquiry) => (
                  <tr
                    key={enquiry.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/enquiries/${enquiry.id}`)}
                  >
                    <td className="whitespace-nowrap px-4 py-3">{getSourceBadge(enquiry.source)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{enquiry.sender_name || '—'}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-900">{enquiry.subject || enquiry.interest_description || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatLocation(enquiry.location_city, enquiry.location_country)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {enquiry.estimated_value ? formatCurrency(enquiry.estimated_value, enquiry.currency) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{getPriorityBadge(enquiry.priority)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{getStatusBadge(enquiry.status)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(enquiry.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {enquiry.status !== 'converted' && (
                          <Button variant="secondary" onClick={() => handleConvert(enquiry.id)}>Convert</Button>
                        )}
                        <Button variant="secondary" onClick={() => handleArchive(enquiry.id)}>Archive</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Enquiry">
        <div className="space-y-4">
          <Select label="Source" value={formData.source} onChange={(e) => updateField('source', e.target.value)} options={[{value: '', label: 'Select source...'}, ...ENQUIRY_SOURCES]} />
          <Input label="Sender Name" value={formData.sender_name} onChange={(e) => updateField('sender_name', e.target.value)} />
          <Input label="Sender Email" value={formData.sender_email} onChange={(e) => updateField('sender_email', e.target.value)} />
          <Input label="Sender Phone" value={formData.sender_phone} onChange={(e) => updateField('sender_phone', e.target.value)} />
          <Input label="Subject" value={formData.subject} onChange={(e) => updateField('subject', e.target.value)} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Body</label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              value={formData.body}
              onChange={(e) => updateField('body', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Interest Description</label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              value={formData.interest_description}
              onChange={(e) => updateField('interest_description', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={formData.location_city} onChange={(e) => updateField('location_city', e.target.value)} />
            <Input label="Country" value={formData.location_country} onChange={(e) => updateField('location_country', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Estimated Value" type="number" value={formData.estimated_value} onChange={(e) => updateField('estimated_value', e.target.value)} />
            <Select label="Currency" value={formData.currency} onChange={(e) => updateField('currency', e.target.value)} options={CURRENCIES} />
          </div>
          <Select label="Priority" value={formData.priority} onChange={(e) => updateField('priority', e.target.value)} options={ENQUIRY_PRIORITIES} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit}>Create Enquiry</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
