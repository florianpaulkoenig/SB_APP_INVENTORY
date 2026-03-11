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
// Edit form
// ---------------------------------------------------------------------------

interface ProjectForm {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  color: string;
  notes: string;
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
    title: '', description: '', start_date: '', end_date: '', status: 'planned', color: 'rose', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => { fetchProject(); }, [fetchProject]);

  const openEdit = useCallback(() => {
    if (!project) return;
    setForm({
      title: project.title || '',
      description: project.description || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      status: project.status || 'planned',
      color: project.color || 'rose',
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

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Project">
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
    </div>
  );
}
