// ---------------------------------------------------------------------------
// DashboardPage -- artwork inventory dashboard with live stats
// All monetary values converted to CHF using daily exchange rates
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface DashboardStats {
  total: number;
  available: number;
  onConsignment: number;
  sold: number;
  reserved: number;
  inProduction: number;
  inTransit: number;
  ordered: number;
}

interface GalleryCount {
  id: string;
  name: string;
  count: number;
  onConsignment: number;
  sold: number;
  available: number;
}

interface GalleryRevenue {
  id: string;
  name: string;
  revenue: number; // already in CHF
}

interface GalleryPotential {
  id: string;
  name: string;
  potential: number; // already in CHF
}

// Raw data interfaces (before currency conversion)
interface RawArtwork {
  status: string;
  gallery_id: string | null;
  price: number | null;
  currency: string | null;
}

interface RawSale {
  sale_price: number | null;
  currency: string | null;
  gallery_id: string | null;
  sale_date: string | null;
  commission_percent: number | null;
  artwork_id: string | null;
}

interface RawProdOrder {
  id: string;
  price: number | null;
  currency: string | null;
  status: string;
  gallery_id: string | null;
}

interface GalleryOrderRevenue {
  id: string;
  name: string;
  revenue: number; // in CHF
  orderCount: number;
}

// Revenue split (gallery / NOA / artist)
interface RevenueSplit {
  gallery: number; // CHF
  noa: number;     // CHF
  artist: number;  // CHF
  total: number;   // CHF
}

// Gallery performance analysis
interface GalleryPerformance {
  id: string;
  name: string;
  totalArtworks: number;
  sold: number;
  onConsignment: number;
  sellThroughRate: number; // percentage
  revenue: number; // CHF
  commission: number; // CHF
  avgDaysToSell: number | null;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { toCHF, ready: ratesReady } = useExchangeRates();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [galleryCounts, setGalleryCounts] = useState<GalleryCount[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPotential, setTotalPotential] = useState(0);
  const [confirmedOrdersRevenue, setConfirmedOrdersRevenue] = useState(0);
  const [galleryRevenues, setGalleryRevenues] = useState<GalleryRevenue[]>([]);
  const [galleryPotentials, setGalleryPotentials] = useState<GalleryPotential[]>([]);
  const [galleryOrderRevenues, setGalleryOrderRevenues] = useState<GalleryOrderRevenue[]>([]);
  const [galleryPerformance, setGalleryPerformance] = useState<GalleryPerformance[]>([]);
  const [revenueSplit, setRevenueSplit] = useState<RevenueSplit>({ gallery: 0, noa: 0, artist: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  // Store raw data so we can re-compute when exchange rates arrive
  const [rawArtworks, setRawArtworks] = useState<RawArtwork[]>([]);
  const [rawSales, setRawSales] = useState<RawSale[]>([]);
  const [rawProdOrders, setRawProdOrders] = useState<RawProdOrder[]>([]);
  const [galleryNameMap, setGalleryNameMap] = useState<Record<string, string>>({});
  const [galleryCommissionRates, setGalleryCommissionRates] = useState<Record<string, number>>({});
  const [galleryCommissionSplits, setGalleryCommissionSplits] = useState<Record<string, { gallery: number; noa: number; artist: number }>>({});
  const [consignmentDates, setConsignmentDates] = useState<Record<string, string>>({});

  // ---- Fetch raw data from Supabase (currency-agnostic) -------------------

  const fetchRawData = useCallback(async () => {
    // Fetch artworks
    const { data: artworks, error } = await supabase
      .from('artworks')
      .select('status, gallery_id, price, currency');

    if (error || !artworks) {
      setLoading(false);
      return;
    }

    setRawArtworks(artworks);

    // Fetch production orders (include gallery_id for per-gallery breakdown)
    const { data: prodOrders } = await supabase
      .from('production_orders')
      .select('id, price, currency, status, gallery_id')
      .not('status', 'in', '("draft","completed")');
    setRawProdOrders(prodOrders ?? []);

    // Fetch production order items count (total ordered items)
    const activeOrderIds = (prodOrders ?? []).map((o) => o.id);
    let orderedItemCount = 0;
    if (activeOrderIds.length > 0) {
      const { data: orderItems } = await supabase
        .from('production_order_items')
        .select('quantity')
        .in('production_order_id', activeOrderIds);
      orderedItemCount = (orderItems ?? []).reduce((sum, item) => sum + (item.quantity || 1), 0);
    }

    // Stat counts (no currency needed)
    setStats({
      total: artworks.length,
      available: artworks.filter((a) => a.status === 'available').length,
      onConsignment: artworks.filter((a) => a.status === 'on_consignment').length,
      sold: artworks.filter((a) => a.status === 'sold').length,
      reserved: artworks.filter((a) => a.status === 'reserved').length,
      inProduction: artworks.filter((a) => a.status === 'in_production').length,
      inTransit: artworks.filter((a) => a.status === 'in_transit').length,
      ordered: orderedItemCount,
    });

    // Gallery counts (no currency needed)
    const galleryIdCounts: Record<string, number> = {};
    const galleryConsignment: Record<string, number> = {};
    const gallerySold: Record<string, number> = {};
    const galleryAvailable: Record<string, number> = {};
    for (const row of artworks) {
      if (row.gallery_id) {
        galleryIdCounts[row.gallery_id] = (galleryIdCounts[row.gallery_id] || 0) + 1;
        if (row.status === 'on_consignment') {
          galleryConsignment[row.gallery_id] = (galleryConsignment[row.gallery_id] || 0) + 1;
        } else if (row.status === 'sold') {
          gallerySold[row.gallery_id] = (gallerySold[row.gallery_id] || 0) + 1;
        } else if (row.status === 'available') {
          galleryAvailable[row.gallery_id] = (galleryAvailable[row.gallery_id] || 0) + 1;
        }
      }
    }

    // Fetch sales with commission data
    const { data: sales } = await supabase
      .from('sales')
      .select('sale_price, currency, gallery_id, sale_date, commission_percent, artwork_id');
    setRawSales(sales ?? []);

    // Collect all gallery IDs (artworks, sales, AND production orders)
    const allGalleryIds = new Set<string>();
    for (const row of artworks) {
      if (row.gallery_id) allGalleryIds.add(row.gallery_id);
    }
    for (const sale of sales ?? []) {
      if (sale.gallery_id) allGalleryIds.add(sale.gallery_id);
    }
    for (const po of prodOrders ?? []) {
      if (po.gallery_id) allGalleryIds.add(po.gallery_id);
    }

    // Fetch gallery names + commission rates + splits
    const galleryIds = Array.from(allGalleryIds);
    const nameMap: Record<string, string> = {};
    const commissionMap: Record<string, number> = {};
    const splitMap: Record<string, { gallery: number; noa: number; artist: number }> = {};
    if (galleryIds.length > 0) {
      const { data: galleries } = await supabase
        .from('galleries')
        .select('id, name, commission_rate, commission_gallery, commission_noa, commission_artist')
        .in('id', galleryIds);
      for (const g of galleries ?? []) {
        nameMap[g.id] = g.name;
        if (g.commission_rate != null) {
          commissionMap[g.id] = g.commission_rate;
        }
        if (g.commission_gallery != null || g.commission_noa != null || g.commission_artist != null) {
          splitMap[g.id] = {
            gallery: g.commission_gallery ?? 0,
            noa: g.commission_noa ?? 0,
            artist: g.commission_artist ?? 0,
          };
        }
      }
    }
    setGalleryNameMap(nameMap);
    setGalleryCommissionRates(commissionMap);
    setGalleryCommissionSplits(splitMap);

    // Fetch consignment movements for avg-days-to-sell calculation
    // Get the earliest consignment date per artwork
    const soldArtworkIds = (sales ?? [])
      .filter((s) => s.artwork_id)
      .map((s) => s.artwork_id as string);
    if (soldArtworkIds.length > 0) {
      const { data: movements } = await supabase
        .from('artwork_movements')
        .select('artwork_id, movement_date, movement_type')
        .in('artwork_id', soldArtworkIds)
        .eq('movement_type', 'consignment')
        .order('movement_date', { ascending: true });
      // Store earliest consignment date per artwork
      const dateMap: Record<string, string> = {};
      for (const m of movements ?? []) {
        if (!dateMap[m.artwork_id]) {
          dateMap[m.artwork_id] = m.movement_date;
        }
      }
      setConsignmentDates(dateMap);
    }

    // Set gallery counts
    const counts: GalleryCount[] = galleryIds
      .filter((gId) => galleryIdCounts[gId])
      .map((gId) => ({
        id: gId,
        name: nameMap[gId] || 'Unknown',
        count: galleryIdCounts[gId] || 0,
        onConsignment: galleryConsignment[gId] || 0,
        sold: gallerySold[gId] || 0,
        available: galleryAvailable[gId] || 0,
      }))
      .sort((a, b) => b.count - a.count);
    setGalleryCounts(counts);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRawData();
  }, [fetchRawData]);

  // ---- Re-compute monetary values when exchange rates are ready -----------

  useEffect(() => {
    if (!ratesReady || rawArtworks.length === 0 && rawSales.length === 0 && rawProdOrders.length === 0) return;

    // ---- Total potential revenue (unsold artworks → CHF) ----
    const unsold = rawArtworks.filter((a) => a.status !== 'sold' && a.price != null && a.price > 0);
    const potentialTotal = unsold.reduce(
      (sum, a) => sum + toCHF(a.price ?? 0, a.currency ?? 'EUR'),
      0,
    );
    setTotalPotential(potentialTotal);

    // Potential per gallery (CHF)
    const galleryPotentialMap: Record<string, number> = {};
    for (const row of unsold) {
      if (row.gallery_id) {
        galleryPotentialMap[row.gallery_id] =
          (galleryPotentialMap[row.gallery_id] || 0) + toCHF(row.price ?? 0, row.currency ?? 'EUR');
      }
    }

    const potentials: GalleryPotential[] = Object.entries(galleryPotentialMap)
      .map(([gId, pot]) => ({
        id: gId,
        name: galleryNameMap[gId] || 'Unknown',
        potential: pot,
      }))
      .sort((a, b) => b.potential - a.potential);
    setGalleryPotentials(potentials);

    // ---- Confirmed production orders revenue (CHF) — total + per gallery ----
    const confirmedTotal = rawProdOrders.reduce(
      (sum, o) => sum + (o.price != null && o.price > 0 ? toCHF(o.price, o.currency ?? 'EUR') : 0),
      0,
    );
    setConfirmedOrdersRevenue(confirmedTotal);

    // Orders revenue per gallery (CHF)
    const galleryOrderMap: Record<string, { revenue: number; count: number }> = {};
    for (const po of rawProdOrders) {
      if (po.gallery_id && po.price != null && po.price > 0) {
        const chfVal = toCHF(po.price, po.currency ?? 'EUR');
        if (!galleryOrderMap[po.gallery_id]) {
          galleryOrderMap[po.gallery_id] = { revenue: 0, count: 0 };
        }
        galleryOrderMap[po.gallery_id].revenue += chfVal;
        galleryOrderMap[po.gallery_id].count += 1;
      }
    }
    const orderRevs: GalleryOrderRevenue[] = Object.entries(galleryOrderMap)
      .map(([gId, data]) => ({
        id: gId,
        name: galleryNameMap[gId] || 'Unknown',
        revenue: data.revenue,
        orderCount: data.count,
      }))
      .sort((a, b) => b.revenue - a.revenue);
    setGalleryOrderRevenues(orderRevs);

    // ---- Sales revenue (CHF) ----
    const revenueTotal = rawSales.reduce(
      (sum, s) => sum + toCHF(s.sale_price ?? 0, s.currency ?? 'EUR'),
      0,
    );
    setTotalRevenue(revenueTotal);

    // Revenue per gallery (CHF)
    const galleryRevenueMap: Record<string, number> = {};
    for (const sale of rawSales) {
      if (sale.gallery_id) {
        galleryRevenueMap[sale.gallery_id] =
          (galleryRevenueMap[sale.gallery_id] || 0) + toCHF(sale.sale_price ?? 0, sale.currency ?? 'EUR');
      }
    }

    const revenues: GalleryRevenue[] = Object.entries(galleryRevenueMap)
      .map(([gId, rev]) => ({
        id: gId,
        name: galleryNameMap[gId] || 'Unknown',
        revenue: rev,
      }))
      .sort((a, b) => b.revenue - a.revenue);
    setGalleryRevenues(revenues);

    // ---- Revenue split: Gallery / NOA / Artist (CHF) ----
    let splitGallery = 0;
    let splitNoa = 0;
    let splitArtist = 0;
    for (const sale of rawSales) {
      const chfPrice = toCHF(sale.sale_price ?? 0, sale.currency ?? 'EUR');
      if (sale.gallery_id && galleryCommissionSplits[sale.gallery_id]) {
        const split = galleryCommissionSplits[sale.gallery_id];
        splitGallery += chfPrice * (split.gallery / 100);
        splitNoa += chfPrice * (split.noa / 100);
        splitArtist += chfPrice * (split.artist / 100);
      } else {
        // No split defined — entire revenue attributed to artist/NOA
        splitArtist += chfPrice;
      }
    }
    setRevenueSplit({ gallery: splitGallery, noa: splitNoa, artist: splitArtist, total: revenueTotal });

    // ---- Gallery Performance Analysis ----
    // Collect per-gallery: sell-through rate, revenue, commission, avg days to sell
    const allGalleryIds = new Set<string>();
    for (const a of rawArtworks) {
      if (a.gallery_id) allGalleryIds.add(a.gallery_id);
    }
    for (const s of rawSales) {
      if (s.gallery_id) allGalleryIds.add(s.gallery_id);
    }

    const perfMap: Record<string, {
      totalArtworks: number;
      sold: number;
      onConsignment: number;
      revenue: number;
      commission: number;
      daysToSell: number[];
    }> = {};

    // Initialise per gallery
    for (const gId of allGalleryIds) {
      perfMap[gId] = { totalArtworks: 0, sold: 0, onConsignment: 0, revenue: 0, commission: 0, daysToSell: [] };
    }

    // Artwork counts
    for (const a of rawArtworks) {
      if (!a.gallery_id || !perfMap[a.gallery_id]) continue;
      perfMap[a.gallery_id].totalArtworks += 1;
      if (a.status === 'sold') perfMap[a.gallery_id].sold += 1;
      if (a.status === 'on_consignment') perfMap[a.gallery_id].onConsignment += 1;
    }

    // Revenue + commission from sales
    for (const s of rawSales) {
      if (!s.gallery_id || !perfMap[s.gallery_id]) continue;
      const chfPrice = toCHF(s.sale_price ?? 0, s.currency ?? 'EUR');
      perfMap[s.gallery_id].revenue += chfPrice;

      // Commission: use sale's commission_percent if set, otherwise gallery default
      const commPct = s.commission_percent ?? galleryCommissionRates[s.gallery_id] ?? 0;
      perfMap[s.gallery_id].commission += chfPrice * (commPct / 100);

      // Days to sell: from consignment date to sale date
      if (s.artwork_id && s.sale_date && consignmentDates[s.artwork_id]) {
        const consignDate = new Date(consignmentDates[s.artwork_id]);
        const saleDate = new Date(s.sale_date);
        const diffDays = Math.floor((saleDate.getTime() - consignDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
          perfMap[s.gallery_id].daysToSell.push(diffDays);
        }
      }
    }

    const performances: GalleryPerformance[] = Array.from(allGalleryIds)
      .map((gId) => {
        const p = perfMap[gId];
        const engagedCount = p.sold + p.onConsignment;
        return {
          id: gId,
          name: galleryNameMap[gId] || 'Unknown',
          totalArtworks: p.totalArtworks,
          sold: p.sold,
          onConsignment: p.onConsignment,
          sellThroughRate: engagedCount > 0 ? (p.sold / engagedCount) * 100 : 0,
          revenue: p.revenue,
          commission: p.commission,
          avgDaysToSell: p.daysToSell.length > 0
            ? Math.round(p.daysToSell.reduce((a, b) => a + b, 0) / p.daysToSell.length)
            : null,
        };
      })
      .filter((p) => p.totalArtworks > 0 || p.revenue > 0)
      .sort((a, b) => b.sellThroughRate - a.sellThroughRate);
    setGalleryPerformance(performances);
  }, [ratesReady, toCHF, rawArtworks, rawSales, rawProdOrders, galleryNameMap, galleryCommissionRates, galleryCommissionSplits, consignmentDates]);

  // ---- Stat cards ---------------------------------------------------------

  const statCards = stats
    ? [
        { label: 'Total Artworks', value: stats.total, onClick: () => navigate('/artworks') },
        { label: 'Available', value: stats.available, color: 'text-emerald-600' },
        { label: 'On Consignment', value: stats.onConsignment, color: 'text-sky-600' },
        { label: 'Sold', value: stats.sold, color: 'text-red-600' },
        { label: 'Reserved', value: stats.reserved, color: 'text-amber-600' },
        { label: 'In Production', value: stats.inProduction, color: 'text-blue-600' },
        { label: 'Ordered', value: stats.ordered, color: 'text-violet-600', onClick: () => navigate('/production') },
      ]
    : [];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-primary-900">
          Welcome to NOA Inventory
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Your artwork management dashboard
        </p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {statCards.map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={stat.onClick}
              className="rounded-lg border border-primary-100 bg-white p-6 text-left transition-shadow hover:shadow-md"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                {stat.label}
              </p>
              <p className={`mt-2 font-display text-3xl font-bold ${stat.color ?? 'text-primary-900'}`}>
                {stat.value}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Revenue Summary Cards */}
      {!loading && (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-primary-100 bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
              Total Revenue (Sales)
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-emerald-600">
              {formatCurrency(totalRevenue, 'CHF')}
            </p>
          </div>
          <div className="rounded-lg border border-primary-100 bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
              Total Potential Revenue
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-accent">
              {formatCurrency(totalPotential, 'CHF')}
            </p>
            <p className="mt-1 text-xs text-primary-400">
              Unsold artworks with prices
            </p>
          </div>
          <div
            className="cursor-pointer rounded-lg border border-primary-100 bg-white p-6 transition-shadow hover:shadow-md"
            onClick={() => navigate('/production')}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
              Confirmed Orders Revenue
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-blue-600">
              {formatCurrency(confirmedOrdersRevenue, 'CHF')}
            </p>
            <p className="mt-1 text-xs text-primary-400">
              Active production orders
            </p>
          </div>
        </div>
      )}

      {/* Revenue Split (Gallery / NOA / Artist) */}
      {!loading && revenueSplit.total > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Revenue Split
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-primary-100 bg-white p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                Gallery Share
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-sky-600">
                {formatCurrency(revenueSplit.gallery, 'CHF')}
              </p>
              {revenueSplit.total > 0 && (
                <p className="mt-1 text-xs text-primary-400">
                  {((revenueSplit.gallery / revenueSplit.total) * 100).toFixed(1)}% of revenue
                </p>
              )}
            </div>
            <div className="rounded-lg border border-primary-100 bg-white p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                NOA Share
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-accent">
                {formatCurrency(revenueSplit.noa, 'CHF')}
              </p>
              {revenueSplit.total > 0 && (
                <p className="mt-1 text-xs text-primary-400">
                  {((revenueSplit.noa / revenueSplit.total) * 100).toFixed(1)}% of revenue
                </p>
              )}
            </div>
            <div className="rounded-lg border border-primary-100 bg-white p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                Artist Share (Simon Berger)
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-emerald-600">
                {formatCurrency(revenueSplit.artist, 'CHF')}
              </p>
              {revenueSplit.total > 0 && (
                <p className="mt-1 text-xs text-primary-400">
                  {((revenueSplit.artist / revenueSplit.total) * 100).toFixed(1)}% of revenue
                </p>
              )}
            </div>
          </div>
          {/* Visual bar */}
          {revenueSplit.total > 0 && (
            <div className="mt-3 flex h-3 overflow-hidden rounded-full">
              <div
                className="bg-sky-500 transition-all"
                style={{ width: `${(revenueSplit.gallery / revenueSplit.total) * 100}%` }}
              />
              <div
                className="bg-amber-500 transition-all"
                style={{ width: `${(revenueSplit.noa / revenueSplit.total) * 100}%` }}
              />
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${(revenueSplit.artist / revenueSplit.total) * 100}%` }}
              />
            </div>
          )}
          <p className="mt-2 text-xs text-primary-400">
            Based on commission split percentages defined per gallery profile. Revenue without a gallery split is attributed to the artist.
          </p>
        </div>
      )}

      {/* Artworks per Gallery */}
      {!loading && galleryCounts.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Artworks per Gallery
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {galleryCounts.map((gc) => (
              <button
                key={gc.id}
                type="button"
                onClick={() => navigate(`/galleries/${gc.id}`)}
                className="rounded-lg border border-primary-100 bg-white px-5 py-4 text-left transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-display text-sm font-semibold text-primary-900">
                    {gc.name}
                  </span>
                  <span className="ml-3 flex-shrink-0 rounded-full bg-sky-50 px-3 py-1 font-display text-lg font-bold text-sky-600">
                    {gc.count}
                  </span>
                </div>
                <div className="mt-2 flex gap-3 text-xs">
                  {gc.onConsignment > 0 && (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
                      {gc.onConsignment} consignment
                    </span>
                  )}
                  {gc.sold > 0 && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                      {gc.sold} sold
                    </span>
                  )}
                  {gc.available > 0 && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                      {gc.available} available
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Revenue per Gallery */}
      {!loading && galleryRevenues.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Revenue per Gallery
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {galleryRevenues.map((gr) => (
              <button
                key={gr.id}
                type="button"
                onClick={() => navigate(`/galleries/${gr.id}`)}
                className="flex items-center justify-between rounded-lg border border-primary-100 bg-white px-5 py-4 text-left transition-shadow hover:shadow-md"
              >
                <span className="truncate font-display text-sm font-semibold text-primary-900">
                  {gr.name}
                </span>
                <span className="ml-3 flex-shrink-0 rounded-full bg-emerald-50 px-3 py-1 font-display text-sm font-bold text-emerald-600">
                  {formatCurrency(gr.revenue, 'CHF')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Orders Revenue per Gallery */}
      {!loading && galleryOrderRevenues.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Orders Revenue per Gallery
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {galleryOrderRevenues.map((go) => (
              <button
                key={go.id}
                type="button"
                onClick={() => navigate(`/galleries/${go.id}`)}
                className="rounded-lg border border-primary-100 bg-white px-5 py-4 text-left transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-display text-sm font-semibold text-primary-900">
                    {go.name}
                  </span>
                  <span className="ml-3 flex-shrink-0 rounded-full bg-blue-50 px-3 py-1 font-display text-sm font-bold text-blue-600">
                    {formatCurrency(go.revenue, 'CHF')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-primary-400">
                  {go.orderCount} active order{go.orderCount !== 1 ? 's' : ''}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Potential Revenue per Gallery */}
      {!loading && galleryPotentials.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Potential Revenue per Gallery
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {galleryPotentials.map((gp) => (
              <button
                key={gp.id}
                type="button"
                onClick={() => navigate(`/galleries/${gp.id}`)}
                className="flex items-center justify-between rounded-lg border border-primary-100 bg-white px-5 py-4 text-left transition-shadow hover:shadow-md"
              >
                <span className="truncate font-display text-sm font-semibold text-primary-900">
                  {gp.name}
                </span>
                <span className="ml-3 flex-shrink-0 rounded-full bg-amber-50 px-3 py-1 font-display text-sm font-bold text-amber-600">
                  {formatCurrency(gp.potential, 'CHF')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gallery Performance Analysis */}
      {!loading && galleryPerformance.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Gallery Performance Analysis
          </h2>
          <div className="overflow-x-auto rounded-lg border border-primary-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-primary-100 bg-primary-50/50">
                  <th className="px-4 py-3 font-medium text-primary-500">Gallery</th>
                  <th className="px-4 py-3 text-center font-medium text-primary-500">Artworks</th>
                  <th className="px-4 py-3 text-center font-medium text-primary-500">Sold</th>
                  <th className="px-4 py-3 text-center font-medium text-primary-500">Consigned</th>
                  <th className="px-4 py-3 font-medium text-primary-500">Sell-Through</th>
                  <th className="hidden px-4 py-3 text-center font-medium text-primary-500 sm:table-cell">Avg Days</th>
                  <th className="px-4 py-3 text-right font-medium text-primary-500">Revenue</th>
                  <th className="hidden px-4 py-3 text-right font-medium text-primary-500 sm:table-cell">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-50">
                {galleryPerformance.map((gp) => (
                  <tr
                    key={gp.id}
                    className="cursor-pointer transition-colors hover:bg-primary-50/50"
                    onClick={() => navigate(`/galleries/${gp.id}`)}
                  >
                    <td className="px-4 py-3 font-semibold text-primary-900">
                      {gp.name}
                    </td>
                    <td className="px-4 py-3 text-center text-primary-600">
                      {gp.totalArtworks}
                    </td>
                    <td className="px-4 py-3 text-center text-primary-600">
                      {gp.sold}
                    </td>
                    <td className="px-4 py-3 text-center text-primary-600">
                      {gp.onConsignment}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-primary-100">
                          <div
                            className={`h-full rounded-full ${
                              gp.sellThroughRate >= 60
                                ? 'bg-emerald-500'
                                : gp.sellThroughRate >= 30
                                  ? 'bg-amber-500'
                                  : 'bg-red-400'
                            }`}
                            style={{ width: `${Math.min(gp.sellThroughRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-primary-600">
                          {gp.sellThroughRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-center text-primary-600 sm:table-cell">
                      {gp.avgDaysToSell != null ? `${gp.avgDaysToSell}d` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {gp.revenue > 0 ? formatCurrency(gp.revenue, 'CHF') : '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-right font-medium text-primary-500 sm:table-cell">
                      {gp.commission > 0 ? formatCurrency(gp.commission, 'CHF') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-primary-400">
            Sell-through = Sold ÷ (Sold + Consigned). Avg Days = consignment to sale date.
          </p>
        </div>
      )}
    </div>
  );
}
