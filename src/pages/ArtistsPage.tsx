import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArtists } from '../hooks/useArtists';
import { formatCurrency } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import type { ArtistInsert, ArtistUpdate } from '../types/database';
import type { ArtistWithStats } from '../hooks/useArtists';

// ---------------------------------------------------------------------------
// Artist form (create / edit)
// ---------------------------------------------------------------------------

interface ArtistFormProps {
  initial?: Partial<ArtistInsert>;
  onSubmit: (data: ArtistInsert | ArtistUpdate) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  submitLabel: string;
}

function ArtistForm({ initial, onSubmit, onCancel, loading, submitLabel }: ArtistFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [nationality, setNationality] = useState(initial?.nationality ?? '');
  const [birthYear, setBirthYear] = useState(initial?.birth_year?.toString() ?? '');
  const [biography, setBiography] = useState(initial?.biography ?? '');
  const [website, setWebsite] = useState(initial?.website ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      nationality: nationality.trim() || null,
      birth_year: birthYear ? parseInt(birthYear) : null,
      biography: biography.trim() || null,
      website: website.trim() || null,
      notes: notes.trim() || null,
    });
  }

  const inputCls = 'w-full border-0 border-b border-primary-200 bg-transparent px-0 py-2 text-sm text-primary-900 placeholder:text-primary-300 focus:border-accent focus:outline-none';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Artist name" required />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="e.g. Swiss" />
        <Input label="Birth Year" type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="e.g. 1975" />
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-primary-400 mb-1">Website</label>
        <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-primary-400 mb-1">Biography</label>
        <Textarea value={biography} onChange={(e) => setBiography(e.target.value)} placeholder="Short biography…" />
      </div>
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-primary-400 mb-1">Notes</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes…" />
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-primary-100">
        <Button variant="outline" type="button" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>{submitLabel}</Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ArtistsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [createOpen, setCreateOpen] = useState(false);
  const [editArtist, setEditArtist] = useState<ArtistWithStats | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { artists, loading, error, createArtist, updateArtist, deleteArtist } = useArtists({
    filters: { search, sortBy },
  });

  async function handleCreate(data: ArtistInsert | ArtistUpdate) {
    setSubmitting(true);
    await createArtist(data as ArtistInsert);
    setSubmitting(false);
    setCreateOpen(false);
  }

  async function handleUpdate(data: ArtistUpdate) {
    if (!editArtist) return;
    setSubmitting(true);
    await updateArtist(editArtist.id, data);
    setSubmitting(false);
    setEditArtist(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete artist "${name}"? This will unlink all their artworks.`)) return;
    await deleteArtist(id);
  }

  const gain = (a: ArtistWithStats) => {
    if (!a.total_purchase || !a.total_estimated) return null;
    return ((a.total_estimated - a.total_purchase) / a.total_purchase) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">Artists</h1>
          <p className="mt-1 text-sm text-primary-400">{artists.length} artists in NOA Collection</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Add Artist</Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-xs">
          <SearchInput value={search} onChange={setSearch} placeholder="Search artists…" />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border-0 border-b border-primary-200 bg-transparent py-2 text-sm text-primary-500 focus:border-accent focus:outline-none"
        >
          <option value="name">Sort: Name</option>
          <option value="nationality">Sort: Nationality</option>
          <option value="birth_year">Sort: Birth Year</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : artists.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-primary-400">No artists found.</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>Add first artist</Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">Artist</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400 sm:table-cell">Nationality</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-primary-400">Works</th>
                <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-400 md:table-cell">Invested</th>
                <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-400 md:table-cell">Est. Value</th>
                <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-400 lg:table-cell">Performance</th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {artists.map((a) => {
                const g = gain(a);
                return (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/artists/${a.id}`)}
                    className="cursor-pointer border-b border-primary-100 hover:bg-primary-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary-900">{a.name}</p>
                      {a.birth_year && <p className="text-xs text-primary-400">b. {a.birth_year}</p>}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-primary-600 sm:table-cell">{a.nationality ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-primary-900">{a.artwork_count}</td>
                    <td className="hidden px-4 py-3 text-right text-sm text-primary-700 md:table-cell">
                      {a.total_purchase > 0 ? formatCurrency(a.total_purchase, 'CHF') : '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-sm text-primary-700 md:table-cell">
                      {a.total_estimated > 0 ? formatCurrency(a.total_estimated, 'CHF') : '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-sm lg:table-cell">
                      {g != null ? (
                        <span className={g >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {g >= 0 ? '+' : ''}{g.toFixed(1)} %
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditArtist(a)}
                          className="text-xs text-primary-400 hover:text-primary-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id, a.name)}
                          className="text-xs text-red-400 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add Artist" size="md">
        <ArtistForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} loading={submitting} submitLabel="Create Artist" />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editArtist} onClose={() => setEditArtist(null)} title="Edit Artist" size="md">
        {editArtist && (
          <ArtistForm
            initial={editArtist}
            onSubmit={handleUpdate}
            onCancel={() => setEditArtist(null)}
            loading={submitting}
            submitLabel="Save Changes"
          />
        )}
      </Modal>
    </div>
  );
}
