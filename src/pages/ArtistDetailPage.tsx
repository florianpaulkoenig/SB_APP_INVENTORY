import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useArtist } from '../hooks/useArtists';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-primary-100 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-primary-900">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { artist, artworks, loading } = useArtist(id ?? '');

  // ---- Portfolio value timeline from valuations history ---------------------
  // Must be declared before any early returns (Rules of Hooks)

  const [chartData, setChartData] = useState<{ date: string; estimatedValue: number; purchaseValue: number }[]>([]);

  useEffect(() => {
    if (loading || artworks.length === 0) return;

    const artworkIds: string[] = artworks.map((aw: any) => aw.id);

    supabase
      .from('valuations')
      .select('artwork_id, value, valuation_date')
      .in('artwork_id', artworkIds)
      .order('valuation_date', { ascending: true })
      .then(({ data: vals }) => {
        // Collect unique YYYY-MM from valuations + purchase dates
        const valMonths = vals
          ? [...new Set(vals.map((v: any) => (v.valuation_date as string).slice(0, 7)))]
          : [];
        const purchaseMonths = (artworks as any[])
          .filter((aw) => aw.purchase_date && aw.purchase_price)
          .map((aw) => (aw.purchase_date as string).slice(0, 7));

        const allMonths = [...new Set([...valMonths, ...purchaseMonths])].sort();
        if (allMonths.length < 2) return;

        const computed = allMonths.map((month) => ({
          date: month,
          // Sum of most-recent valuation per artwork as of this month
          estimatedValue: vals
            ? artworkIds.reduce((sum, aid) => {
                const latest = vals
                  .filter((v: any) => v.artwork_id === aid && (v.valuation_date as string).slice(0, 7) <= month)
                  .at(-1);
                return sum + ((latest?.value as number) ?? 0);
              }, 0)
            : 0,
          // Cumulative purchase price of all artworks bought up to this month
          purchaseValue: (artworks as any[]).reduce((sum, aw) => {
            if (aw.purchase_date && aw.purchase_price && (aw.purchase_date as string).slice(0, 7) <= month) {
              return sum + (aw.purchase_price as number);
            }
            return sum;
          }, 0),
        }));

        setChartData(computed);
      });
  }, [loading, artworks]);

  // ---- Early returns --------------------------------------------------------

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!artist) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-primary-400">Artist not found.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/artists')}>Back to Artists</Button>
      </div>
    );
  }

  // ---- Stats ----------------------------------------------------------------

  const totalPurchase = artworks.reduce((s: number, a: any) => s + (a.purchase_price ?? 0), 0);
  const totalEstimated = artworks.reduce((s: number, a: any) => s + (a.estimated_value ?? 0), 0);
  const gain = totalPurchase > 0 ? ((totalEstimated - totalPurchase) / totalPurchase) * 100 : null;

  return (
    <div className="space-y-8">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/artists')}
        className="text-sm text-primary-400 hover:text-primary-700 flex items-center gap-1"
      >
        ← Artists
      </button>

      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-primary-900">{artist.name}</h1>
        <div className="mt-1 flex flex-wrap gap-3 text-sm text-primary-500">
          {artist.nationality && <span>{artist.nationality}</span>}
          {artist.birth_year && <span>b. {artist.birth_year}</span>}
          {artist.website && (
            <a href={artist.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              {artist.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
        {artist.biography && (
          <p className="mt-3 max-w-2xl text-sm text-primary-600 leading-relaxed">{artist.biography}</p>
        )}
        {artist.notes && (
          <p className="mt-2 max-w-2xl text-xs text-primary-400 italic">{artist.notes}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Works" value={String(artworks.length)} />
        <StatCard label="Invested" value={totalPurchase > 0 ? formatCurrency(totalPurchase, 'CHF') : '—'} />
        <StatCard label="Est. Value" value={totalEstimated > 0 ? formatCurrency(totalEstimated, 'CHF') : '—'} />
        <StatCard
          label="Performance"
          value={gain != null ? `${gain >= 0 ? '+' : ''}${gain.toFixed(1)} %` : '—'}
        />
      </div>

      {/* Value trend chart */}
      {chartData.length >= 2 && (
        <div className="bg-white border border-primary-100 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-primary-400">Gesamtportfolio-Wert (CHF)</h2>
            <div className="flex items-center gap-5 text-[10px] text-primary-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 bg-primary-900 rounded" />
                Schätzwert
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-px w-4 border-t border-dashed border-slate-400" />
                Ankaufswert
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="artistEstGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a1a2e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1a1a2e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="artistPurchaseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                width={50}
              />
              <Tooltip
                formatter={(v: number, name: string) => [
                  formatCurrency(v, 'CHF'),
                  name === 'estimatedValue' ? 'Schätzwert' : 'Ankaufswert',
                ]}
                labelStyle={{ fontSize: 12 }}
                contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0' }}
              />
              {/* Purchase value — step function, drawn first so estimated sits on top */}
              <Area
                type="stepAfter"
                dataKey="purchaseValue"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                fill="url(#artistPurchaseGrad)"
                dot={false}
              />
              {/* Estimated value — smooth line on top */}
              <Area
                type="monotone"
                dataKey="estimatedValue"
                stroke="#1a1a2e"
                strokeWidth={2}
                fill="url(#artistEstGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Artworks table */}
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wider text-primary-400 mb-3">Works</h2>
        {artworks.length === 0 ? (
          <p className="text-sm text-primary-400 py-8 text-center">No artworks linked to this artist.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">Title</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400 sm:table-cell">Year</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400 md:table-cell">Category</th>
                  <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-400 md:table-cell">Invested</th>
                  <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-400 lg:table-cell">Est. Value</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400 sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {artworks.map((aw: any) => (
                  <tr
                    key={aw.id}
                    onClick={() => navigate(`/artworks/${aw.id}`)}
                    className="cursor-pointer border-b border-primary-100 hover:bg-primary-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary-900">{aw.title}</p>
                      {aw.inventory_number && <p className="text-xs text-primary-400">{aw.inventory_number}</p>}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-primary-600 sm:table-cell">{aw.year ?? '—'}</td>
                    <td className="hidden px-4 py-3 text-sm text-primary-600 md:table-cell">{aw.category ?? '—'}</td>
                    <td className="hidden px-4 py-3 text-right text-sm text-primary-700 md:table-cell">
                      {aw.purchase_price ? formatCurrency(aw.purchase_price, aw.purchase_currency ?? 'CHF') : '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-sm text-primary-700 lg:table-cell">
                      {aw.estimated_value ? formatCurrency(aw.estimated_value, 'CHF') : '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-primary-600 sm:table-cell">{aw.status ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
