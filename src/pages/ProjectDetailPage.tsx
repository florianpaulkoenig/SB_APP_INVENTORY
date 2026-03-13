import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { formatDate } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { PROJECT_STATUSES } from '../lib/constants';
import type { ProjectRow } from '../types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectForm {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  color: string;
  gallery_id: string;
  contact_id: string;
  notes: string;
}

interface LinkedArtwork {
  id: string;
  project_id: string;
  artwork_id: string;
  artworks: {
    id: string;
    title: string;
    medium: string | null;
    year: number | null;
    status: string | null;
  };
}

interface LinkedProductionOrder {
  id: string;
  project_id: string;
  production_order_id: string;
  production_orders: {
    id: string;
    title: string;
    order_number: string;
    status: string | null;
    deadline: string | null;
  };
}

interface ArtworkOption {
  id: string;
  title: string;
  medium: string | null;
  year: number | null;
}

interface POOption {
  id: string;
  title: string;
  order_number: string;
  deadline: string | null;
}

const COLOR_OPTIONS = [
  { value: 'rose', label: 'Rose' },
  { value: 'blue', label: 'Blue' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'purple', label: 'Purple' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'amber', label: 'Amber' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'pink', label: 'Pink' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<ProjectForm>({
    title: '', description: '', start_date: '', end_date: '', status: 'planned', color: 'rose', gallery_id: '', contact_id: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [galleryOptions, setGalleryOptions] = useState<{ value: string; label: string }[]>([]);
  const [contactOptions, setContactOptions] = useState<{ value: string; label: string }[]>([]);

  // Linked artworks
  const [linkedArtworks, setLinkedArtworks] = useState<LinkedArtwork[]>([]);
  const [artworkModalOpen, setArtworkModalOpen] = useState(false);
  const [artworkOptions, setArtworkOptions] = useState<ArtworkOption[]>([]);
  const [artworkSearch, setArtworkSearch] = useState('');
  const [artworkLoading, setArtworkLoading] = useState(false);

  // Linked production orders
  const [linkedPOs, setLinkedPOs] = useState<LinkedProductionOrder[]>([]);
  const [poModalOpen, setPOModalOpen] = useState(false);
  const [poOptions, setPOOptions] = useState<POOption[]>([]);
  const [poSearch, setPOSearch] = useState('');
  const [poLoading, setPOLoading] = useState(false);

  // -------------------------------------------------------------------------
  // Fetchers
  // -------------------------------------------------------------------------

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setProject(data as ProjectRow);
    } catch {
      toast({ title: 'Failed to load project', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  const fetchLinkedArtworks = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('project_artworks')
        .select('*, artworks(id, title, medium, year, status)')
        .eq('project_id', id);
      if (error) throw error;
      setLinkedArtworks((data || []) as LinkedArtwork[]);
    } catch {
      // table may not exist yet
    }
  }, [id]);

  const fetchLinkedPOs = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('project_production_orders')
        .select('*, production_orders(id, title, order_number, status, deadline)')
        .eq('project_id', id);
      if (error) throw error;
      setLinkedPOs((data || []) as LinkedProductionOrder[]);
    } catch {
      // table may not exist yet
    }
  }, [id]);

  const fetchOptions = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const uid = session.user.id;
    const [gRes, cRes] = await Promise.all([
      supabase.from('galleries').select('id, name').eq('user_id', uid).order('name'),
      supabase.from('contacts').select('id, first_name, last_name').eq('user_id', uid).order('last_name'),
    ]);
    setGalleryOptions((gRes.data ?? []).map((g) => ({ value: g.id, label: g.name })));
    setContactOptions((cRes.data ?? []).map((c) => ({ value: c.id, label: [c.first_name, c.last_name].filter(Boolean).join(' ') })));
  }, []);

  useEffect(() => {
    fetchProject();
    fetchLinkedArtworks();
    fetchLinkedPOs();
    fetchOptions();
  }, [fetchProject, fetchLinkedArtworks, fetchLinkedPOs, fetchOptions]);

  // -------------------------------------------------------------------------
  // Edit project
  // -------------------------------------------------------------------------

  const openEdit = useCallback(() => {
    if (!project) return;
    setForm({
      title: project.title || '',
      description: project.description || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      status: project.status || 'planned',
      color: project.color || 'rose',
      gallery_id: project.gallery_id || '',
      contact_id: project.contact_id || '',
      notes: project.notes || '',
    });
    setEditOpen(true);
  }, [project]);

  const handleSave = useCallback(async () => {
    if (!id || !form.title.trim()) {
      toast({ title: 'Title is required', variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status || 'planned',
        color: form.color || 'rose',
        gallery_id: form.gallery_id || null,
        contact_id: form.contact_id || null,
        notes: form.notes.trim() || null,
      };
      const { error } = await supabase.from('projects').update(payload as never).eq('id', id);
      if (error) throw error;
      toast({ title: 'Project updated', variant: 'success' });
      setEditOpen(false);
      fetchProject();
    } catch {
      toast({ title: 'Failed to update project', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [id, form, toast, fetchProject]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (!confirm('Delete this project?')) return;
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Project deleted', variant: 'success' });
      navigate('/projects');
    } catch {
      toast({ title: 'Failed to delete project', variant: 'error' });
    }
  }, [id, toast, navigate]);

  // -------------------------------------------------------------------------
  // Artwork linking
  // -------------------------------------------------------------------------

  const openArtworkModal = useCallback(async () => {
    setArtworkModalOpen(true);
    setArtworkLoading(true);
    try {
      const { data, error } = await supabase.from('artworks').select('id, title, medium, year');
      if (error) throw error;
      setArtworkOptions((data || []) as ArtworkOption[]);
    } catch {
      toast({ title: 'Failed to load artworks', variant: 'error' });
    } finally {
      setArtworkLoading(false);
    }
  }, [toast]);

  const handleAddArtwork = useCallback(async (artworkId: string) => {
    if (!id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { error } = await supabase
        .from('project_artworks')
        .insert({ project_id: id, artwork_id: artworkId, user_id: session.user.id } as never);
      if (error) throw error;
      toast({ title: 'Artwork linked', variant: 'success' });
      setArtworkModalOpen(false);
      fetchLinkedArtworks();
    } catch {
      toast({ title: 'Failed to link artwork', variant: 'error' });
    }
  }, [id, fetchLinkedArtworks, toast]);

  const handleRemoveArtwork = useCallback(async (linkId: string) => {
    if (!confirm('Remove this artwork?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { error } = await supabase.from('project_artworks').delete().eq('id', linkId);
      if (error) throw error;
      toast({ title: 'Artwork removed', variant: 'success' });
      fetchLinkedArtworks();
    } catch {
      toast({ title: 'Failed to remove artwork', variant: 'error' });
    }
  }, [fetchLinkedArtworks, toast]);

  const filteredArtworkOptions = artworkOptions.filter((a) =>
    a.title?.toLowerCase().includes(artworkSearch.toLowerCase())
  );

  // -------------------------------------------------------------------------
  // Production order linking
  // -------------------------------------------------------------------------

  const openPOModal = useCallback(async () => {
    setPOModalOpen(true);
    setPOLoading(true);
    try {
      const { data, error } = await supabase.from('production_orders').select('id, title, order_number, deadline');
      if (error) throw error;
      setPOOptions((data || []) as POOption[]);
    } catch {
      toast({ title: 'Failed to load production orders', variant: 'error' });
    } finally {
      setPOLoading(false);
    }
  }, [toast]);

  const handleAddPO = useCallback(async (poId: string) => {
    if (!id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { error } = await supabase
        .from('project_production_orders')
        .insert({ project_id: id, production_order_id: poId, user_id: session.user.id } as never);
      if (error) throw error;
      toast({ title: 'Production order linked', variant: 'success' });
      setPOModalOpen(false);
      fetchLinkedPOs();
    } catch {
      toast({ title: 'Failed to link production order', variant: 'error' });
    }
  }, [id, fetchLinkedPOs, toast]);

  const handleRemovePO = useCallback(async (linkId: string) => {
    if (!confirm('Remove this production order?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { error } = await supabase.from('project_production_orders').delete().eq('id', linkId);
      if (error) throw error;
      toast({ title: 'Production order removed', variant: 'success' });
      fetchLinkedPOs();
    } catch {
      toast({ title: 'Failed to remove production order', variant: 'error' });
    }
  }, [fetchLinkedPOs, toast]);

  const filteredPOOptions = poOptions.filter((p) =>
    (p.title || p.order_number || '').toLowerCase().includes(poSearch.toLowerCase())
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const getStatusBadge = (status: string) => {
    const found = PROJECT_STATUSES.find((s) => s.value === status);
    return found ? <Badge variant="default">{found.label}</Badge> : null;
  };

  if (loading) return <LoadingSpinner />;
  if (!project) return <p className="text-center text-gray-500 py-12">Project not found.</p>;

  const durationDays = project.start_date && project.end_date
    ? Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / 86400000) + 1
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="primary" onClick={() => navigate('/projects')}>
            ← Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
              {getStatusBadge(project.status)}
            </div>
            {(project.start_date || project.end_date) && (
              <p className="text-sm text-gray-500 mt-1">
                {project.start_date ? formatDate(project.start_date) : ''}
                {project.end_date ? ` — ${formatDate(project.end_date)}` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={openEdit}>Edit</Button>
          <Button variant="primary" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Status</p>
            <p className="text-sm font-medium">{PROJECT_STATUSES.find((s) => s.value === project.status)?.label || project.status}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Duration</p>
            <p className="text-sm font-medium">{durationDays ? `${durationDays} days` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Start Date</p>
            <p className="text-sm font-medium">{project.start_date ? formatDate(project.start_date) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">End Date</p>
            <p className="text-sm font-medium">{project.end_date ? formatDate(project.end_date) : '—'}</p>
          </div>
        </div>
        {project.description && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 uppercase mb-1">Description</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.description}</p>
          </div>
        )}
        {project.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 uppercase mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.notes}</p>
          </div>
        )}
      </Card>

      {/* Linked Artworks */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Linked Artworks</h2>
          <Button variant="primary" onClick={openArtworkModal}>Add Artwork</Button>
        </div>
        {linkedArtworks.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No artworks linked yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medium</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {linkedArtworks.map((la) => (
                  <tr key={la.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{la.artworks.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{la.artworks.medium || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{la.artworks.year || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {la.artworks.status ? <Badge variant="default">{la.artworks.status}</Badge> : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button variant="primary" onClick={() => handleRemoveArtwork(la.id)}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Linked Production Orders */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Linked Production Orders</h2>
          <Button variant="primary" onClick={openPOModal}>Add Production Order</Button>
        </div>
        {linkedPOs.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No production orders linked yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {linkedPOs.map((lpo) => (
                  <tr key={lpo.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{lpo.production_orders.title || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lpo.production_orders.order_number || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {lpo.production_orders.status ? <Badge variant="default">{lpo.production_orders.status}</Badge> : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lpo.production_orders.deadline ? formatDate(lpo.production_orders.deadline) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button variant="primary" onClick={() => handleRemovePO(lpo.id)}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Project">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={256} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={5000}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
            <Select label="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} options={COLOR_OPTIONS} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Gallery" value={form.gallery_id} onChange={(e) => setForm({ ...form, gallery_id: e.target.value })} options={[{ value: '', label: 'None' }, ...galleryOptions]} />
            <Select label="Contact" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })} options={[{ value: '', label: 'None' }, ...contactOptions]} />
          </div>
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
            <Button variant="primary" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={submitting}>
              {submitting ? 'Saving...' : 'Update'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Artwork Selector Modal */}
      <Modal isOpen={artworkModalOpen} onClose={() => setArtworkModalOpen(false)} title="Add Artwork">
        <div className="space-y-4">
          <Input label="Search Artworks" value={artworkSearch} onChange={(e) => setArtworkSearch(e.target.value)} />
          {artworkLoading ? (
            <LoadingSpinner />
          ) : filteredArtworkOptions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No artworks found.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-200">
              {filteredArtworkOptions.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleAddArtwork(a.id)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-gray-900">{a.title}</span>
                  <span className="text-xs text-gray-500">
                    {[a.medium, a.year].filter(Boolean).join(' · ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Production Order Selector Modal */}
      <Modal isOpen={poModalOpen} onClose={() => setPOModalOpen(false)} title="Add Production Order">
        <div className="space-y-4">
          <Input label="Search Production Orders" value={poSearch} onChange={(e) => setPOSearch(e.target.value)} />
          {poLoading ? (
            <LoadingSpinner />
          ) : filteredPOOptions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No production orders found.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-200">
              {filteredPOOptions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAddPO(p.id)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-gray-900">{p.title || p.order_number}</span>
                  <span className="text-xs text-gray-500">
                    {p.deadline ? formatDate(p.deadline) : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
