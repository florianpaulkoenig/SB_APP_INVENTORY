// ---------------------------------------------------------------------------
// NOA Inventory -- Gallery Dashboard Page (Full Analytics)
// Dashboard view for gallery-role users with KPIs, charts, and top artworks.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGalleryAnalytics } from '../hooks/useGalleryAnalytics';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate } from '../lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Status color map for pie chart
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  available: '#22c55e',
  sold: '#c9a96e',
  on_consignment: '#3b82f6',
  in_transit: '#f59e0b',
  reserved: '#a855f7',
  pending_sale: '#f97316',
  in_production: '#6366f1',
  paid: '#10b981',
  archived: '#a3a3a3',
  destroyed: '#a3a3a3',
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || '#a3a3a3';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleryDashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toCHF, ready: ratesReady } = useExchangeRates();

  const galleryId = profile?.gallery_id;
  const { data, loading, refresh } = useGalleryAnalytics(galleryId, toCHF, ratesReady);

  const [galleryName, setGalleryName] = useState<string>('Gallery');

  // Pending reporting sales
  const [pendingSales, setPendingSales] = useState<
    { id: string; title: string; sale_date: string; reporting_status: string }[]
  >([]);

  // Consignment aging
  const [consignmentAging, setConsignmentAging] = useState<
    { id: string; title: string; consigned_since: string; days: number }[]
  >([]);

  // Series trend (safe shared analytics)
  const [seriesTrend, setSeriesTrend] = useState<
    { series: string; count: number }[]
  >([]);

  // ---- Fetch gallery name + extended data ---------------------------------

  const fetchExtendedData = useCallback(async () => {
    if (!galleryId) return;

    // Gallery name
    const { data: gallery } = await supabase
      .from('galleries')
      .select('name')
      .eq('id', galleryId)
      .single();
    if (gallery?.name) setGalleryName(gallery.name);

    // Pending reporting sales (reporting_status not yet in DB — show recent sales instead)
    const { data: salesData } = await supabase
      .from('sales')
      .select('id, sale_date, artworks(title)')
      .eq('gallery_id', galleryId)
      .order('sale_date', { ascending: false })
      .limit(10);

    if (salesData) {
      setPendingSales(
        salesData.map((s) => ({
          id: s.id,
          title: (s.artworks as { title: string } | null)?.title ?? 'Untitled',
          sale_date: s.sale_date,
          reporting_status: 'draft',
        })),
      );
    }

    // Consignment aging (unsold works assigned to this gallery)
    const { data: consigned } = await supabase
      .from('artworks')
      .select('id, title, consigned_since')
      .eq('gallery_id', galleryId)
      .in('status', ['available', 'on_consignment', 'reserved'])
      .not('consigned_since', 'is', null)
      .order('consigned_since', { ascending: true })
      .limit(20);

    if (consigned) {
      const now = Date.now();
      setConsignmentAging(
        consigned.map((a) => ({
          id: a.id,
          title: a.title || 'Untitled',
          consigned_since: a.consigned_since!,
          days: Math.floor((now - new Date(a.consigned_since!).getTime()) / 86400000),
        })),
      );
    }

    // Series trend (how many works per series are at this gallery — safe, no comparative data)
    const { data: seriesData } = await supabase
      .from('artworks')
      .select('series')
      .eq('gallery_id', galleryId)
      .not('series', 'is', null);

    if (seriesData) {
      const map = new Map<string, number>();
      for (const a of seriesData) {
        const s = (a.series as string) || 'Other';
        map.set(s, (map.get(s) ?? 0) + 1);
      }
      setSeriesTrend(
        [...map.entries()]
          .map(([series, count]) => ({ series, count }))
          .sort((a, b) => b.count - a.count),
      );
    }
  }, [galleryId]);

  useEffect(() => {
    fetchExtendedData();
  }, [fetchExtendedData]);

  // ---- Render: no gallery configured --------------------------------------

  if (!loading && !galleryId) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary-900">
            Gallery Dashboard
          </h1>
        </div>
        <Card className="p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-primary-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-primary-900">
            Your gallery profile is not configured yet
          </h3>
          <p className="mt-1 text-sm text-primary-500">
            Please contact an administrator to link your account to a gallery.
          </p>
        </Card>
      </div>
    );
  }

  // ---- Render: loading ----------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ---- Prepare chart data -------------------------------------------------

  const statusData = data.statusBreakdown.map((s) => ({
    name: s.status.replace(/_/g, ' '),
    value: s.count,
    fill: getStatusColor(s.status),
  }));

  const geoData = data.geoDistribution.slice(0, 8);

  // ---- Render: dashboard --------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary-900">
          Gallery Dashboard
        </h1>
        <p className="mt-1 text-sm text-primary-500">{galleryName}</p>
      </div>

      {/* KPI Row */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
            Consigned Works
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-primary-900">
            {data.consignedCount}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
            Total Revenue
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-700">
            {formatCurrency(data.totalRevenue, 'CHF')}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
            Commission Earned
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-primary-900">
            {formatCurrency(data.commissionEarned, 'CHF')}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
            Avg Days to Sale
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-primary-900">
            {data.avgDaysToSale}
          </p>
        </Card>
      </div>

      {/* Row 1: Sales Timeline + Geographic Distribution */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sales Timeline */}
        <Card className="p-4">
          <h3 className="font-display text-sm font-semibold text-primary-900 mb-3">
            Sales Timeline
          </h3>
          {data.salesTimeline.length === 0 ? (
            <p className="text-sm text-primary-400 py-8 text-center">No sales data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.salesTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#737373' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#737373' }}
                  tickLine={false}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value, 'CHF'), 'Revenue']}
                  labelStyle={{ color: '#171717', fontWeight: 600 }}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e5e5' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#c9a96e"
                  strokeWidth={2}
                  dot={{ fill: '#c9a96e', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Geographic Distribution */}
        <Card className="p-4">
          <h3 className="font-display text-sm font-semibold text-primary-900 mb-3">
            Geographic Distribution
          </h3>
          {geoData.length === 0 ? (
            <p className="text-sm text-primary-400 py-8 text-center">No geographic data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={geoData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#737373' }}
                  tickLine={false}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="country"
                  tick={{ fontSize: 11, fill: '#737373' }}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value, 'CHF'), 'Revenue']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e5e5' }}
                />
                <Bar dataKey="revenue" fill="#c9a96e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Row 2: Price Performance + Consignment Status */}
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Price Performance */}
        <Card className="p-4">
          <h3 className="font-display text-sm font-semibold text-primary-900 mb-4">
            Price Performance
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                Avg Sale Price
              </p>
              <p className="mt-1 font-display text-lg font-bold text-primary-900">
                {formatCurrency(data.avgSalePrice, 'CHF')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                Avg Discount Rate
              </p>
              <p className="mt-1 font-display text-lg font-bold text-primary-900">
                {data.avgDiscountRate.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                At List Price
              </p>
              <p className="mt-1 font-display text-lg font-bold text-emerald-700">
                {data.atListPricePercent.toFixed(0)}%
              </p>
            </div>
          </div>
        </Card>

        {/* Consignment Status */}
        <Card className="p-4">
          <h3 className="font-display text-sm font-semibold text-primary-900 mb-3">
            Consignment Status
          </h3>
          {statusData.length === 0 ? (
            <p className="text-sm text-primary-400 py-8 text-center">No status data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [value, name]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e5e5' }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Row 3: Top Selling Artworks */}
      <Card className="mb-8 p-4">
        <h3 className="font-display text-sm font-semibold text-primary-900 mb-3">
          Top Selling Artworks
        </h3>
        {data.topArtworks.length === 0 ? (
          <p className="text-sm text-primary-400 py-4 text-center">No sales data yet</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-primary-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-50 text-left">
                  <th className="px-3 py-2 font-medium text-primary-600 w-10">#</th>
                  <th className="px-3 py-2 font-medium text-primary-600">Title</th>
                  <th className="px-3 py-2 font-medium text-primary-600 text-right">Revenue</th>
                  <th className="px-3 py-2 font-medium text-primary-600">Sale Date</th>
                </tr>
              </thead>
              <tbody>
                {data.topArtworks.slice(0, 10).map((artwork, i) => (
                  <tr key={artwork.artworkId} className="border-t border-primary-50">
                    <td className="px-3 py-2 text-primary-400">{i + 1}</td>
                    <td className="px-3 py-2 text-primary-900 font-medium">{artwork.title}</td>
                    <td className="px-3 py-2 text-right text-primary-900">
                      {formatCurrency(artwork.revenue, 'CHF')}
                    </td>
                    <td className="px-3 py-2 text-primary-600">
                      {artwork.saleDate ? formatDate(artwork.saleDate) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Row 4: Pending Reporting Tasks */}
      {pendingSales.length > 0 && (
        <Card className="mb-8 p-4">
          <h3 className="font-display text-sm font-semibold text-primary-900 mb-3">
            Pending Reporting
          </h3>
          <p className="text-xs text-primary-500 mb-3">
            These sales need your attention — complete reporting to unlock better partnership benefits.
          </p>
          <div className="overflow-x-auto rounded-lg border border-primary-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-50 text-left">
                  <th className="px-3 py-2 font-medium text-primary-600">Artwork</th>
                  <th className="px-3 py-2 font-medium text-primary-600">Sale Date</th>
                  <th className="px-3 py-2 font-medium text-primary-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingSales.map((s) => (
                  <tr key={s.id} className="border-t border-primary-50">
                    <td className="px-3 py-2 text-primary-900 font-medium">{s.title}</td>
                    <td className="px-3 py-2 text-primary-600">{s.sale_date ? formatDate(s.sale_date) : '—'}</td>
                    <td className="px-3 py-2">
                      <Badge variant={s.reporting_status === 'draft' ? 'default' : 'warning'}>
                        {s.reporting_status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Row 5: Consignment Aging */}
      {consignmentAging.length > 0 && (
        <Card className="mb-8 p-4">
          <h3 className="font-display text-sm font-semibold text-primary-900 mb-3">
            Consignment Aging
          </h3>
          <div className="overflow-x-auto rounded-lg border border-primary-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-50 text-left">
                  <th className="px-3 py-2 font-medium text-primary-600">Artwork</th>
                  <th className="px-3 py-2 font-medium text-primary-600">Consigned Since</th>
                  <th className="px-3 py-2 font-medium text-primary-600 text-right">Days</th>
                </tr>
              </thead>
              <tbody>
                {consignmentAging.map((a) => (
                  <tr key={a.id} className="border-t border-primary-50">
                    <td className="px-3 py-2 text-primary-900 font-medium">{a.title}</td>
                    <td className="px-3 py-2 text-primary-600">{formatDate(a.consigned_since)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-medium ${a.days > 180 ? 'text-red-600' : a.days > 90 ? 'text-amber-600' : 'text-primary-700'}`}>
                        {a.days}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Row 6: Series Distribution (safe shared analytics) */}
      {seriesTrend.length > 0 && (
        <Card className="mb-8 p-4">
          <h3 className="font-display text-sm font-semibold text-primary-900 mb-3">
            Works by Series
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={seriesTrend.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="series" tick={{ fontSize: 11, fill: '#737373' }} />
              <YAxis tick={{ fontSize: 11, fill: '#737373' }} />
              <Tooltip />
              <Bar dataKey="count" name="Works" fill="#c9a96e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Quick Links */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => navigate('/gallery/available-works')}>
          Available Works
        </Button>
        <Button variant="outline" onClick={() => navigate('/gallery/deliveries')}>
          Deliveries
        </Button>
        <Button variant="outline" onClick={() => navigate('/gallery/certificates')}>
          Certificates
        </Button>
      </div>
    </div>
  );
}
