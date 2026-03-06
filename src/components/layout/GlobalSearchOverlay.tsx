import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface GlobalSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResults {
  artworks: { id: string; title: string; reference_code: string | null }[];
  contacts: { id: string; first_name: string; last_name: string; email: string | null }[];
  productionOrders: { id: string; order_number: string; title: string | null }[];
  deliveries: { id: string; delivery_number: string }[];
  invoices: { id: string; invoice_number: string }[];
}

const EMPTY_RESULTS: SearchResults = {
  artworks: [],
  contacts: [],
  productionOrders: [],
  deliveries: [],
  invoices: [],
};

// ---------------------------------------------------------------------------
// GlobalSearchOverlay component
// ---------------------------------------------------------------------------
export function GlobalSearchOverlay({ isOpen, onClose }: GlobalSearchOverlayProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the element is rendered
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else {
      // Reset state when closed
      setQuery('');
      setResults(EMPTY_RESULTS);
      setLoading(false);
      setHasSearched(false);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Search function
  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    const pattern = `%${term.trim()}%`;

    try {
      const [artworksRes, contactsRes, productionRes, deliveriesRes, invoicesRes] =
        await Promise.all([
          supabase
            .from('artworks')
            .select('id, title, reference_code')
            .or(`title.ilike.${pattern},reference_code.ilike.${pattern}`)
            .limit(5),
          supabase
            .from('contacts')
            .select('id, first_name, last_name, email')
            .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`)
            .limit(5),
          supabase
            .from('production_orders')
            .select('id, order_number, title')
            .or(`order_number.ilike.${pattern},title.ilike.${pattern}`)
            .limit(5),
          supabase
            .from('deliveries')
            .select('id, delivery_number')
            .or(`delivery_number.ilike.${pattern}`)
            .limit(5),
          supabase
            .from('invoices')
            .select('id, invoice_number')
            .or(`invoice_number.ilike.${pattern}`)
            .limit(5),
        ]);

      setResults({
        artworks: (artworksRes.data ?? []) as SearchResults['artworks'],
        contacts: (contactsRes.data ?? []) as SearchResults['contacts'],
        productionOrders: (productionRes.data ?? []) as SearchResults['productionOrders'],
        deliveries: (deliveriesRes.data ?? []) as SearchResults['deliveries'],
        invoices: (invoicesRes.data ?? []) as SearchResults['invoices'],
      });
    } catch {
      setResults(EMPTY_RESULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced input handler
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    },
    [performSearch],
  );

  // Navigate to result and close
  const goTo = useCallback(
    (path: string) => {
      onClose();
      navigate(path);
    },
    [navigate, onClose],
  );

  // Count total results
  const totalResults =
    results.artworks.length +
    results.contacts.length +
    results.productionOrders.length +
    results.deliveries.length +
    results.invoices.length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[10vh]"
      onClick={onClose}
    >
      {/* Search panel */}
      <div
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-primary-100 px-4 py-3">
          {/* Search icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-5 w-5 shrink-0 text-primary-400"
          >
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path strokeLinecap="round" d="M13 13l4 4" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search artworks, contacts, orders..."
            className="flex-1 bg-transparent text-lg text-primary-900 placeholder-primary-300 outline-none"
          />

          {/* Shortcut hint / close */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-primary-400 transition-colors hover:bg-primary-50 hover:text-primary-700"
            aria-label="Close search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Results area */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              <span className="ml-3 text-sm text-primary-500">Searching...</span>
            </div>
          )}

          {/* No results */}
          {!loading && hasSearched && totalResults === 0 && (
            <div className="py-8 text-center text-sm text-primary-400">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Results */}
          {!loading && totalResults > 0 && (
            <div className="py-2">
              {/* Artworks */}
              {results.artworks.length > 0 && (
                <ResultSection title="Artworks">
                  {results.artworks.map((a) => (
                    <ResultItem
                      key={a.id}
                      onClick={() => goTo(`/artworks/${a.id}`)}
                      primary={a.title}
                      secondary={a.reference_code ?? undefined}
                    />
                  ))}
                </ResultSection>
              )}

              {/* Contacts */}
              {results.contacts.length > 0 && (
                <ResultSection title="Contacts">
                  {results.contacts.map((c) => (
                    <ResultItem
                      key={c.id}
                      onClick={() => goTo(`/contacts/${c.id}`)}
                      primary={`${c.first_name} ${c.last_name}`}
                      secondary={c.email ?? undefined}
                    />
                  ))}
                </ResultSection>
              )}

              {/* Production Orders */}
              {results.productionOrders.length > 0 && (
                <ResultSection title="Production Orders">
                  {results.productionOrders.map((p) => (
                    <ResultItem
                      key={p.id}
                      onClick={() => goTo(`/production/${p.id}`)}
                      primary={p.order_number}
                      secondary={p.title ?? undefined}
                    />
                  ))}
                </ResultSection>
              )}

              {/* Deliveries */}
              {results.deliveries.length > 0 && (
                <ResultSection title="Deliveries">
                  {results.deliveries.map((d) => (
                    <ResultItem
                      key={d.id}
                      onClick={() => goTo(`/deliveries/${d.id}`)}
                      primary={d.delivery_number}
                    />
                  ))}
                </ResultSection>
              )}

              {/* Invoices */}
              {results.invoices.length > 0 && (
                <ResultSection title="Invoices">
                  {results.invoices.map((i) => (
                    <ResultItem
                      key={i.id}
                      onClick={() => goTo(`/invoices/${i.id}`)}
                      primary={i.invoice_number}
                    />
                  ))}
                </ResultSection>
              )}
            </div>
          )}

          {/* Idle state */}
          {!loading && !hasSearched && (
            <div className="py-8 text-center text-sm text-primary-400">
              Start typing to search across your inventory
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-primary-100 px-4 py-2">
          <span className="text-xs text-primary-400">
            <kbd className="rounded border border-primary-200 bg-primary-50 px-1.5 py-0.5 font-mono text-[10px]">
              ESC
            </kbd>{' '}
            to close
          </span>
          <span className="text-xs text-primary-400">
            <kbd className="rounded border border-primary-200 bg-primary-50 px-1.5 py-0.5 font-mono text-[10px]">
              {'\u2318'}K
            </kbd>{' '}
            to open
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ResultItem({
  onClick,
  primary,
  secondary,
}: {
  onClick: () => void;
  primary: string;
  secondary?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-primary-50"
    >
      {/* Arrow / chevron icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-4 w-4 shrink-0 text-primary-300"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4l6 6-6 6" />
      </svg>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary-900">{primary}</p>
        {secondary && (
          <p className="truncate text-xs text-primary-400">{secondary}</p>
        )}
      </div>
    </button>
  );
}
