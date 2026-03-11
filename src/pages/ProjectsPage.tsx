import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { useProjects } from '../hooks/useProjects';
import { PROJECT_STATUSES } from '../lib/constants';

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
  notes: string;
}

const emptyForm: ProjectForm = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  status: 'planned',
  color: 'rose',
  notes: '',
};

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

const FILTER_TABS = ['All', 'Planned', 'In Progress', 'Completed', 'On Hold'] as const;

function getStatusFilter(tab: string): string | null {
  switch (tab) {
    case 'Planned': return 'planned';
    case 'In Progress': return 'in_progress';
    case 'Completed': return 'completed';
    case 'On Hold': return 'on_hold';
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects();

  const [activeTab, setActiveTab] = useState<string>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const filteredProjects = projects.filter((p) => {
    const filterValue = getStatusFilter(activeTab);
    if (!filterValue) return true;
    return p.status === filterValue;
  });

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((p: typeof projects[0]) => {
    setEditingId(p.id);
    setForm({
      title: p.title || '',
      description: p.description || '',
      start_date: p.start_date || '',
      end_date: p.end_date || '',
      status: p.status || 'planned',
      color: p.color || 'rose',
      notes: p.notes || '',
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
        description: form.description.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status || 'planned',
        color: form.color || 'rose',
        notes: form.notes.trim() || null,
      };
      if (editingId) {
        await updateProject(editingId, payload as never);
      } else {
        await createProject(payload as never);
      }
      setModalOpen(false);
    } catch {
      toast({ title: 'Failed to save project', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [form, editingId, createProject, updateProject, toast]);

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    try {
      await deleteProject(id);
    } catch {
      toast({ title: 'Failed to delete project', variant: 'error' });
    }
  }, [deleteProject, toast]);

  const getStatusBadge = (status: string) => {
    const found = PROJECT_STATUSES.find((s) => s.value === status);
    return found ? <Badge variant="default">{found.label}</Badge> : <span className="text-gray-400">—</span>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <Button onClick={openAdd} variant="primary">Add Project</Button>
      </div>

      {/* Filter tabs */}
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

      {/* Table */}
      <Card>
        {filteredProjects.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No projects yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProjects.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.title}</td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.start_date ? formatDate(p.start_date) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.end_date ? formatDate(p.end_date) : '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <Button variant="primary" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEdit(p); }}>
                          Edit
                        </Button>
                        <Button variant="primary" onClick={(e: React.MouseEvent) => handleDelete(p.id, e)}>
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

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Project' : 'Add Project'}>
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
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            />
            <Select
              label="Color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              options={COLOR_OPTIONS}
            />
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
