import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { usePortfolio } from '../../contexts/PortfolioContext';

export interface ArtistSelectProps {
  value: string | null;
  onChange: (artistId: string | null) => void;
  onChangeName?: (name: string | null) => void;
  label?: string;
  error?: string;
  allowCreate?: boolean;
  onCreateNew?: (name: string) => Promise<string | null>;
}

interface ArtistOption {
  id: string;
  name: string;
}

const inputCls = 'w-full border-0 border-b border-primary-200 bg-transparent px-0 py-2 text-sm text-primary-900 placeholder:text-primary-300 focus:border-accent focus:outline-none';

export function ArtistSelect({ value, onChange, onChangeName, label = 'Artist', error, allowCreate, onCreateNew }: ArtistSelectProps) {
  const { portfolio } = usePortfolio();
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('artists')
        .select('id, name')
        .eq('portfolio', portfolio)
        .order('name');
      setArtists((data as ArtistOption[]) ?? []);
      setLoading(false);
    }
    load();
  }, [portfolio]);

  const selected = artists.find((a) => a.id === value);
  const filtered = search
    ? artists.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : artists;
  const showCreate = allowCreate && onCreateNew && search.trim() && !artists.some((a) => a.name.toLowerCase() === search.toLowerCase());

  async function handleCreate() {
    if (!onCreateNew || !search.trim()) return;
    setCreating(true);
    const newId = await onCreateNew(search.trim());
    if (newId) {
      setArtists((prev) => [...prev, { id: newId, name: search.trim() }].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(newId);
      setSearch('');
      setOpen(false);
    }
    setCreating(false);
  }

  return (
    <div className="relative">
      {label && <label className="block text-xs font-medium uppercase tracking-wider text-primary-400 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setSearch(''); }}
        className={inputCls + ' text-left flex items-center justify-between'}
        disabled={loading}
      >
        <span className={selected ? 'text-primary-900' : 'text-primary-300'}>
          {selected ? selected.name : (loading ? 'Loading…' : 'Select artist')}
        </span>
        <svg className="h-4 w-4 text-primary-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        </svg>
      </button>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-primary-200 shadow-lg max-h-64 overflow-auto">
          <div className="p-2 border-b border-primary-100">
            <input
              autoFocus
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm outline-none"
            />
          </div>
          {value && (
            <button
              type="button"
              onClick={() => { onChange(null); onChangeName?.(null); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm text-primary-400 hover:bg-primary-50"
            >
              — No artist
            </button>
          )}
          {filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => { onChange(a.id); onChangeName?.(a.name); setSearch(''); setOpen(false); }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-primary-50 ${a.id === value ? 'font-medium text-primary-900 bg-primary-50' : 'text-primary-700'}`}
            >
              {a.name}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="w-full px-3 py-2 text-left text-sm text-accent hover:bg-accent/5 border-t border-primary-100"
            >
              {creating ? 'Creating…' : `+ Create "${search.trim()}"`}
            </button>
          )}
          {filtered.length === 0 && !showCreate && (
            <p className="px-3 py-2 text-sm text-primary-400">No artists found</p>
          )}
        </div>
      )}
    </div>
  );
}
