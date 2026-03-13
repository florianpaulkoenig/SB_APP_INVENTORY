import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { useExhibitions } from '../hooks/useExhibitions';
import { EXHIBITION_TYPES, CURRENCIES } from '../lib/constants';

type ExhibitionType = string;

interface ExhibitionForm {
  title: string;
  type: ExhibitionType;
  venue: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
  budget: string;
  budget_currency: string;
  gallery_id: string;
  contact_id: string;
  catalogue_reference: string;
  notes: string;
}

const emptyForm: ExhibitionForm = {
  title: '',
  type: '',
  venue: '',
  city: '',
  country: '',
  start_date: '',
  end_date: '',
  budget: '',
  budget_currency: 'CHF',
  gallery_id: '',
  contact_id: '',
  catalogue_reference: '',
  notes: '',
};

const FILTER_TABS = ['All', 'Exhibitions', 'Art Fairs', 'Solo Shows', 'Group Shows'] as const;

function getTypeFilterValue(tab: string): string | null {
  switch (tab) {
    case 'Exhibitions': return 'exhibition';
    case 'Art Fairs': return 'art_fair';
    case 'Solo Shows': return 'solo_show';
    case 'Group Shows': return 'group_show';
    default: return null;
  }
}

export function ExhibitionsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { exhibitions, loading, createExhibition, updateExhibition, deleteExhibition } = useExhibitions();

  const [activeTab, setActiveTab] = useState<string>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExhibitionForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [galleryOptions, setGalleryOptions] = useState<{ value: string; label: string }[]>([]);
  const [contactOptions, setContactOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;
      const [gRes, cRes] = await Promise.all([
        supabase.from('galleries').select('id, name').eq('user_id', uid).order('name'),
        supabase.from('contacts').select('id, first_name, last_name').eq('user_id', uid).order('last_name'),
      ]);
      setGalleryOptions((gRes.data ?? []).map((g) => ({ value: g.id, label: g.name })));
      setContactOptions((cRes.data ?? []).map((c) => ({ value: c.id, label: [c.first_name, c.last_name].filter(Boolean).join(' ') })));
    })();
  }, []);

  const filteredExhibitions = exhibitions.filter((ex) => {
    const filterValue = getTypeFilterValue(activeTab);
    if (!filterValue) return true;
    return ex.type === filterValue;
  });

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((ex: typeof exhibitions[0]) => {
    setEditingId(ex.id);
    setForm({
      title: ex.title || '',
      type: ex.type || '',
      venue: ex.venue || '',
      city: ex.city || '',
      country: ex.country || '',
      start_date: ex.start_date || '',
      end_date: ex.end_date || '',
      budget: ex.budget ? String(ex.budget) : '',
      budget_currency: ex.budget_currency || 'CHF',
      gallery_id: ex.gallery_id || '',
      contact_id: ex.contact_id || '',
      catalogue_reference: ex.catalogue_reference || '',
      notes: ex.notes || '',
    });
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) {
      toast({ title: 'Title is required', variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type || null,
        venue: form.venue.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: form.budget ? parseFloat(form.budget) : null,
        budget_currency: form.budget_currency || null,
        gallery_id: form.gallery_id || null,
        contact_id: form.contact_id || null,
        catalogue_reference: form.catalogue_reference.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editingId) {
        await updateExhibition(editingId, payload as never);
        toast({ title: 'Exhibition updated', variant: 'success' });
      } else {
        await createExhibition(payload as never);
        toast({ title: 'Exhibition created', variant: 'success' });
      }
      setModalOpen(false);
    } catch {
      toast({ title: 'Failed to save exhibition', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [form, editingId, createExhibition, updateExhibition, toast]);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this exhibition?')) return;
    try {
      await deleteExhibition(id);
      toast({ title: 'Exhibition deleted', variant: 'success' });
    } catch {
      toast({ title: 'Failed to delete exhibition', variant: 'error' });
    }
  }, [deleteExhibition, toast]);

  const getTypeBadge = (type: string) => {
    const found = EXHIBITION_TYPES.find((t) => t.value === type);
    return found ? <Badge variant="default">{found.label}</Badge> : <span className="text-gray-400">—</span>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Exhibitions &amp; Art Fairs</h1>
        <Button onClick={openAdd} variant="primary">Add Exhibition</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <Card>
        {filteredExhibitions.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No exhibitions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExhibitions.map((ex) => (
                  <tr
                    key={ex.id}
                    onClick={() => navigate(`/exhibitions/${ex.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{ex.title}</td>
                    <td className="px-4 py-3 text-sm">{getTypeBadge(ex.type)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ex.venue || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {[ex.city, ex.country].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ex.start_date ? formatDate(ex.start_date) : '—'}
                      {ex.end_date ? ` — ${formatDate(ex.end_date)}` : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ex.budget ? formatCurrency(ex.budget, ex.budget_currency) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEdit(ex); }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="primary"
                          onClick={(e: React.MouseEvent) => handleDelete(ex.id, e)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Exhibition' : 'Add Exhibition'}>
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={256} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[{value: '', label: 'Select type'}, ...EXHIBITION_TYPES]} />
          <Input label="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} maxLength={256} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={256} />
            <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} maxLength={256} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Budget" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            <Select label="Currency" value={form.budget_currency} onChange={(e) => setForm({ ...form, budget_currency: e.target.value })} options={CURRENCIES} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Gallery" value={form.gallery_id} onChange={(e) => setForm({ ...form, gallery_id: e.target.value })} options={[{ value: '', label: 'None' }, ...galleryOptions]} />
            <Select label="Contact" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })} options={[{ value: '', label: 'None' }, ...contactOptions]} />
          </div>
          <Input label="Catalogue Reference" value={form.catalogue_reference} onChange={(e) => setForm({ ...form, catalogue_reference: e.target.value })} maxLength={256} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              maxLength={5000}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="primary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
