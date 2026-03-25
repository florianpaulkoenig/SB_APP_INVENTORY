import { useState, useCallback, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { useAuctionAlerts } from '../hooks/useAuctionAlerts';
import { useAuctionBenchmarking } from '../hooks/useAuctionBenchmarking';
import { useSecondaryMarket } from '../hooks/useSecondaryMarket';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { AUCTION_RESULTS, AUCTION_HOUSES, CURRENCIES } from '../lib/constants';

interface AlertForm {
  auction_house: string;
  sale_title: string;
  sale_date: string;
  lot_number: string;
  artwork_title: string;
  artwork_description: string;
  estimate_low: string;
  estimate_high: string;
  currency: string;
  source_url: string;
  notes: string;
}

interface UpdateForm {
  result: string;
  hammer_price: string;
  notes: string;
}

const emptyAlertForm: AlertForm = {
  auction_house: '',
  sale_title: '',
  sale_date: '',
  lot_number: '',
  artwork_title: '',
  artwork_description: '',
  estimate_low: '',
  estimate_high: '',
  currency: 'USD',
  source_url: '',
  notes: '',
};

const emptyUpdateForm: UpdateForm = {
  result: '',
  hammer_price: '',
  notes: '',
};

export function AuctionTrackingPage() {
  const { toast } = useToast();
  const showSuccess = (msg: string) => toast({ title: msg, variant: 'success' });
  const showError = (msg: string) => toast({ title: msg, variant: 'error' });
  const { alerts, loading, createAlert, updateAlert, deleteAlert, matchToDatabase } = useAuctionAlerts();
  const { toCHF } = useExchangeRates();
  const benchmarking = useAuctionBenchmarking(alerts, toCHF);
  const secondaryMarket = useSecondaryMarket(alerts, toCHF);
  const [showBenchmarking, setShowBenchmarking] = useState(false);
  const [showSecondaryMarket, setShowSecondaryMarket] = useState(false);

  const [filterHouse, setFilterHouse] = useState('');
  const [filterResult, setFilterResult] = useState('');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [alertForm, setAlertForm] = useState<AlertForm>(emptyAlertForm);
  const [submitting, setSubmitting] = useState(false);

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateForm, setUpdateForm] = useState<UpdateForm>(emptyUpdateForm);

  const filteredAlerts = alerts.filter((a) => {
    if (filterHouse && a.auction_house !== filterHouse) return false;
    if (filterResult && a.result !== filterResult) return false;
    return true;
  });

  const upcomingCount = useMemo(
    () => alerts.filter((a) => a.result === 'upcoming').length,
    [alerts]
  );

  const currentYear = new Date().getFullYear();
  const soldThisYear = useMemo(
    () => alerts.filter((a) => {
      if (a.result !== 'sold' && a.result !== 'bought_in') return false;
      if (!a.sale_date) return false;
      return new Date(a.sale_date).getFullYear() === currentYear;
    }).length,
    [alerts, currentYear]
  );

  const totalHammerValue = useMemo(
    () => alerts.reduce((sum, a) => sum + toCHF(a.hammer_price || 0, (a.currency as string) ?? 'CHF'), 0),
    [alerts, toCHF]
  );

  const avgEstimateAccuracy = useMemo(() => {
    const withBoth = alerts.filter((a) => a.hammer_price && a.estimate_low && a.estimate_high);
    if (withBoth.length === 0) return '—';
    const totalAccuracy = withBoth.reduce((sum, a) => {
      const mid = ((a.estimate_low || 0) + (a.estimate_high || 0)) / 2;
      if (mid === 0) return sum;
      return sum + ((a.hammer_price || 0) / mid) * 100;
    }, 0);
    return `${Math.round(totalAccuracy / withBoth.length)}%`;
  }, [alerts]);

  const handleCreateAlert = useCallback(async () => {
    if (!alertForm.artwork_title.trim()) {
      showError('Artwork title is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        auction_house: alertForm.auction_house || null,
        sale_title: alertForm.sale_title.trim() || null,
        sale_date: alertForm.sale_date || null,
        lot_number: alertForm.lot_number.trim() || null,
        artwork_title: alertForm.artwork_title.trim(),
        artwork_description: alertForm.artwork_description.trim() || null,
        estimate_low: alertForm.estimate_low ? parseFloat(alertForm.estimate_low) : null,
        estimate_high: alertForm.estimate_high ? parseFloat(alertForm.estimate_high) : null,
        currency: alertForm.currency || null,
        source_url: alertForm.source_url.trim() || null,
        notes: alertForm.notes.trim() || null,
      };
      await createAlert(payload as never);
      showSuccess('Alert created');
      setAddModalOpen(false);
      setAlertForm(emptyAlertForm);
    } catch {
      showError('Failed to create alert');
    } finally {
      setSubmitting(false);
    }
  }, [alertForm, createAlert, showSuccess, showError]);

  const openUpdateModal = useCallback((alert: typeof alerts[0]) => {
    setUpdatingId(alert.id);
    setUpdateForm({
      result: alert.result || '',
      hammer_price: alert.hammer_price ? String(alert.hammer_price) : '',
      notes: alert.notes || '',
    });
    setUpdateModalOpen(true);
  }, []);

  const handleUpdateResult = useCallback(async () => {
    if (!updatingId) return;
    setSubmitting(true);
    try {
      const payload = {
        result: updateForm.result || null,
        hammer_price: updateForm.hammer_price ? parseFloat(updateForm.hammer_price) : null,
        notes: updateForm.notes.trim() || null,
      };
      await updateAlert(updatingId, payload as never);
      showSuccess('Alert updated');
      setUpdateModalOpen(false);
      setUpdatingId(null);
    } catch {
      showError('Failed to update alert');
    } finally {
      setSubmitting(false);
    }
  }, [updatingId, updateForm, updateAlert, showSuccess, showError]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this auction alert?')) return;
    try {
      await deleteAlert(id);
      showSuccess('Alert deleted');
    } catch {
      showError('Failed to delete alert');
    }
  }, [deleteAlert, showSuccess, showError]);

  const handleMatch = useCallback(async (id: string) => {
    try {
      await matchToDatabase(id);
      showSuccess('Matched to database');
    } catch {
      showError('Failed to match');
    }
  }, [matchToDatabase, showSuccess, showError]);

  const getResultBadge = (result: string | null) => {
    if (!result) return <span className="text-gray-400">—</span>;
    const found = AUCTION_RESULTS.find((r) => r.value === result);
    return <Badge variant="default">{found ? found.label : result}</Badge>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">Auction Tracking</h1>
          <p className="mt-1 text-sm text-primary-500">Track lots, benchmarks, and secondary market performance.</p>
        </div>
        <Button variant="primary" onClick={() => { setAlertForm(emptyAlertForm); setAddModalOpen(true); }}>
          Add Alert
        </Button>
      </div>

      {/* Filter Row */}
      <div className="flex gap-4 flex-wrap">
        <Select
          label="Auction House"
          value={filterHouse}
          onChange={(e) => setFilterHouse(e.target.value)}
          options={[{value: '', label: 'All Houses'}, ...AUCTION_HOUSES.map((h) => ({ value: h, label: h }))]}
        />
        <Select
          label="Result"
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
          options={[{value: '', label: 'All Results'}, ...AUCTION_RESULTS]}
        />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Upcoming Lots</p>
          <p className="mt-1 text-2xl font-bold text-primary-900">{upcomingCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Sold This Year</p>
          <p className="mt-1 text-2xl font-bold text-primary-900">{soldThisYear}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Total Hammer Value</p>
          <p className="mt-1 text-2xl font-bold text-primary-900">{formatCurrency(totalHammerValue, 'CHF')}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Avg Estimate Accuracy</p>
          <p className="mt-1 text-2xl font-bold text-primary-900">{avgEstimateAccuracy}</p>
        </Card>
      </div>

      {/* Benchmarking Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-primary-900">Auction Benchmarking</h2>
        <Button variant="primary" onClick={() => setShowBenchmarking(!showBenchmarking)}>
          {showBenchmarking ? 'Hide Analytics' : 'Show Analytics'}
        </Button>
      </div>

      {showBenchmarking && (
        <div className="space-y-6">
          {/* Overall Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Overall Sell-Through Rate</p>
              <p className="mt-1 text-2xl font-bold text-primary-900">{benchmarking.overallSellThroughRate}%</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Auction Strength Index</p>
              <p className="mt-1 text-2xl font-bold text-primary-900">{benchmarking.overallStrengthIndex}x</p>
              <p className="text-xs text-primary-400">Hammer / High Estimate</p>
            </Card>
          </div>

          {/* Estimate Accuracy Distribution */}
          <Card className="p-6">
            <h3 className="font-display text-sm font-semibold text-primary-900 mb-4">Estimate Accuracy Distribution</h3>
            <div className="flex gap-4">
              {benchmarking.estimateAccuracy.map((bucket) => (
                <div key={bucket.label} className="flex-1 text-center rounded-lg border border-primary-100 p-4">
                  <div className="text-2xl font-bold text-primary-900">{bucket.percentage}%</div>
                  <div className="text-xs text-primary-600 mt-1">{bucket.label}</div>
                  <div className="text-xs text-primary-400">{bucket.count} lots</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Per-Auction-House Performance */}
          {benchmarking.houseStats.length > 0 && (
            <Card className="p-6">
              <h3 className="font-display text-sm font-semibold text-primary-900 mb-4">Performance by Auction House</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                      <th className="pb-3 pr-4">House</th>
                      <th className="pb-3 pr-4">Lots</th>
                      <th className="pb-3 pr-4">Sold</th>
                      <th className="pb-3 pr-4">Bought In</th>
                      <th className="pb-3 pr-4">Sell-Through</th>
                      <th className="pb-3 pr-4">Strength Index</th>
                      <th className="pb-3">Total Hammer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarking.houseStats.map((h) => (
                      <tr key={h.auctionHouse} className="border-b border-primary-100 hover:bg-primary-50">
                        <td className="py-3 pr-4 font-medium text-primary-900">{h.auctionHouse}</td>
                        <td className="py-3 pr-4 text-primary-600">{h.totalLots}</td>
                        <td className="py-3 pr-4 text-primary-600">{h.soldCount}</td>
                        <td className="py-3 pr-4 text-primary-600">{h.boughtInCount}</td>
                        <td className="py-3 pr-4">
                          <span className={h.sellThroughRate >= 70 ? 'text-emerald-600 font-medium' : h.sellThroughRate >= 50 ? 'text-amber-600' : 'text-red-600'}>
                            {h.sellThroughRate}%
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={h.auctionStrengthIndex >= 1 ? 'text-emerald-600 font-medium' : 'text-red-600'}>
                            {h.auctionStrengthIndex}x
                          </span>
                        </td>
                        <td className="py-3 text-primary-700">{formatCurrency(h.totalHammerCHF, 'CHF')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Yearly Price Trends */}
          {benchmarking.priceTrends.length > 0 && (
            <Card className="p-6">
              <h3 className="font-display text-sm font-semibold text-primary-900 mb-4">Price Trends by Year</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                      <th className="pb-3 pr-4">Year</th>
                      <th className="pb-3 pr-4">Lots Sold</th>
                      <th className="pb-3 pr-4">Avg Hammer (CHF)</th>
                      <th className="pb-3">Estimate Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarking.priceTrends.map((t) => (
                      <tr key={t.year} className="border-b border-primary-100 hover:bg-primary-50">
                        <td className="py-3 pr-4 font-medium text-primary-900">{t.year}</td>
                        <td className="py-3 pr-4 text-primary-600">{t.lotCount}</td>
                        <td className="py-3 pr-4 text-primary-700">{formatCurrency(t.avgHammerCHF, 'CHF')}</td>
                        <td className="py-3 text-primary-600">{t.avgEstimateAccuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Secondary Market Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-primary-900">Secondary Market Analysis</h2>
        <Button variant="primary" onClick={() => setShowSecondaryMarket(!showSecondaryMarket)}>
          {showSecondaryMarket ? 'Hide Analysis' : 'Show Analysis'}
        </Button>
      </div>

      {showSecondaryMarket && (
        <div className="space-y-6">
          {secondaryMarket.loading ? (
            <LoadingSpinner />
          ) : (
            <>
              {/* Secondary Market KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Matched Artworks</p>
                  <p className="mt-1 text-2xl font-bold text-primary-900">{secondaryMarket.data.matchedCount}</p>
                  <p className="text-xs text-primary-400">{secondaryMarket.data.unmatchedCount} unmatched</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Avg Appreciation</p>
                  <p className={`mt-1 text-2xl font-bold ${secondaryMarket.data.avgAppreciation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {secondaryMarket.data.avgAppreciation > 0 ? '+' : ''}{secondaryMarket.data.avgAppreciation}%
                  </p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Appreciating</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">{secondaryMarket.data.appreciatingCount}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Depreciating</p>
                  <p className="mt-1 text-2xl font-bold text-red-600">{secondaryMarket.data.depreciatingCount}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Total Secondary Volume</p>
                  <p className="mt-1 text-2xl font-bold text-primary-900">{formatCurrency(secondaryMarket.data.totalSecondaryVolume, 'CHF')}</p>
                </Card>
              </div>

              {/* Matched Artworks Table */}
              {secondaryMarket.data.items.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-display text-sm font-semibold text-primary-900 mb-4">Matched Artworks — Primary vs Secondary</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                          <th className="pb-3 pr-4">Title</th>
                          <th className="pb-3 pr-4">Auction House</th>
                          <th className="pb-3 pr-4">Primary Price</th>
                          <th className="pb-3 pr-4">Hammer Price</th>
                          <th className="pb-3 pr-4">Appreciation</th>
                          <th className="pb-3 pr-4">Years Held</th>
                          <th className="pb-3">Gallery of Origin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {secondaryMarket.data.items.map((item) => (
                          <tr key={item.auctionAlertId} className="border-b border-primary-100 hover:bg-primary-50">
                            <td className="py-3 pr-4 font-medium text-primary-900">{item.artworkTitle}</td>
                            <td className="py-3 pr-4 text-primary-600">{item.auctionHouse}</td>
                            <td className="py-3 pr-4 text-primary-600">
                              {item.primarySalePrice !== null && item.primaryCurrency
                                ? formatCurrency(item.primarySalePrice, item.primaryCurrency)
                                : '—'}
                            </td>
                            <td className="py-3 pr-4 text-primary-600">
                              {formatCurrency(item.hammerPrice, item.hammerCurrency)}
                            </td>
                            <td className="py-3 pr-4">
                              {item.appreciation !== null ? (
                                <span className={item.appreciation >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                                  {item.appreciation > 0 ? '+' : ''}{item.appreciation}%
                                </span>
                              ) : (
                                <span className="text-primary-400">—</span>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-primary-600">
                              {item.yearsSincePrimary !== null ? `${item.yearsSincePrimary} yr` : '—'}
                            </td>
                            <td className="py-3 text-primary-600">{item.galleryOfOrigin || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Gallery Performance Summary */}
              {secondaryMarket.data.galleryPerformance.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-display text-sm font-semibold text-primary-900 mb-4">Gallery Secondary Market Performance</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                          <th className="pb-3 pr-4">Gallery</th>
                          <th className="pb-3 pr-4">Auction Count</th>
                          <th className="pb-3 pr-4">Avg Appreciation</th>
                          <th className="pb-3">Total Hammer (CHF)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {secondaryMarket.data.galleryPerformance.map((g) => (
                          <tr key={g.galleryId} className="border-b border-primary-100 hover:bg-primary-50">
                            <td className="py-3 pr-4 font-medium text-primary-900">{g.galleryName}</td>
                            <td className="py-3 pr-4 text-primary-600">{g.auctionCount}</td>
                            <td className="py-3 pr-4">
                              <span className={g.avgAppreciation >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                                {g.avgAppreciation > 0 ? '+' : ''}{g.avgAppreciation}%
                              </span>
                            </td>
                            <td className="py-3 text-primary-700">{formatCurrency(g.totalHammerCHF, 'CHF')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {secondaryMarket.data.items.length === 0 && (
                <Card className="p-8">
                  <p className="text-primary-500 text-center">
                    No matched sold artworks found. Match auction alerts to database artworks to see secondary market analysis.
                  </p>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        {filteredAlerts.length === 0 ? (
          <p className="text-primary-500 text-center py-12">No auction alerts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  <th className="px-4 pb-3 pt-4">Auction House</th>
                  <th className="px-4 pb-3 pt-4">Sale</th>
                  <th className="px-4 pb-3 pt-4">Date</th>
                  <th className="px-4 pb-3 pt-4">Lot #</th>
                  <th className="px-4 pb-3 pt-4">Title</th>
                  <th className="px-4 pb-3 pt-4">Estimate</th>
                  <th className="px-4 pb-3 pt-4">Hammer Price</th>
                  <th className="px-4 pb-3 pt-4">Result</th>
                  <th className="px-4 pb-3 pt-4">Matched</th>
                  <th className="px-4 pb-3 pt-4">AI</th>
                  <th className="px-4 pb-3 pt-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="border-b border-primary-100 hover:bg-primary-50">
                    <td className="px-4 py-3 font-medium text-primary-900">{alert.auction_house || '—'}</td>
                    <td className="px-4 py-3 text-primary-600">{alert.sale_title || '—'}</td>
                    <td className="px-4 py-3 text-primary-600 whitespace-nowrap">
                      {alert.sale_date ? formatDate(alert.sale_date) : '—'}
                    </td>
                    <td className="px-4 py-3 text-primary-600">{alert.lot_number || '—'}</td>
                    <td className="px-4 py-3 font-medium text-primary-900">{alert.artwork_title}</td>
                    <td className="px-4 py-3 text-primary-600 whitespace-nowrap">
                      {alert.estimate_low && alert.estimate_high
                        ? `${formatCurrency(alert.estimate_low, alert.currency)} – ${formatCurrency(alert.estimate_high, alert.currency)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-primary-700 whitespace-nowrap">
                      {alert.hammer_price ? formatCurrency(alert.hammer_price, alert.currency) : '—'}
                    </td>
                    <td className="px-4 py-3">{getResultBadge(alert.result)}</td>
                    <td className="px-4 py-3">
                      {alert.matched_artwork_id ? (
                        <Badge variant="success">Matched</Badge>
                      ) : (
                        <span className="text-primary-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {alert.ai_detected ? <Badge variant="default">AI</Badge> : <span className="text-primary-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!alert.matched_artwork_id && (
                          <Button size="sm" variant="outline" onClick={() => handleMatch(alert.id)}>Match</Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openUpdateModal(alert)}>Update</Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(alert.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Alert Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Alert">
        <div className="space-y-4">
          <Select
            label="Auction House"
            value={alertForm.auction_house}
            onChange={(e) => setAlertForm({ ...alertForm, auction_house: e.target.value })}
            options={[{value: '', label: 'Select house'}, ...AUCTION_HOUSES.map((h) => ({ value: h, label: h }))]}
          />
          <Input
            label="Sale Title"
            value={alertForm.sale_title}
            onChange={(e) => setAlertForm({ ...alertForm, sale_title: e.target.value })}
            maxLength={256}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sale Date"
              type="date"
              value={alertForm.sale_date}
              onChange={(e) => setAlertForm({ ...alertForm, sale_date: e.target.value })}
            />
            <Input
              label="Lot Number"
              value={alertForm.lot_number}
              onChange={(e) => setAlertForm({ ...alertForm, lot_number: e.target.value })}
              maxLength={50}
            />
          </div>
          <Input
            label="Artwork Title"
            value={alertForm.artwork_title}
            onChange={(e) => setAlertForm({ ...alertForm, artwork_title: e.target.value })}
            maxLength={256}
          />
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">Artwork Description</label>
            <textarea
              className="w-full rounded-lg border border-primary-200 px-3 py-2 text-sm text-primary-900 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              rows={3}
              value={alertForm.artwork_description}
              onChange={(e) => setAlertForm({ ...alertForm, artwork_description: e.target.value })}
              maxLength={5000}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Estimate Low"
              type="number"
              value={alertForm.estimate_low}
              onChange={(e) => setAlertForm({ ...alertForm, estimate_low: e.target.value })}
            />
            <Input
              label="Estimate High"
              type="number"
              value={alertForm.estimate_high}
              onChange={(e) => setAlertForm({ ...alertForm, estimate_high: e.target.value })}
            />
            <Select
              label="Currency"
              value={alertForm.currency}
              onChange={(e) => setAlertForm({ ...alertForm, currency: e.target.value })}
              options={CURRENCIES}
            />
          </div>
          <Input
            label="Source URL"
            value={alertForm.source_url}
            onChange={(e) => setAlertForm({ ...alertForm, source_url: e.target.value })}
            maxLength={2048}
          />
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-primary-200 px-3 py-2 text-sm text-primary-900 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              rows={3}
              value={alertForm.notes}
              onChange={(e) => setAlertForm({ ...alertForm, notes: e.target.value })}
              maxLength={5000}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="primary" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateAlert} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Alert'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Update Result Modal */}
      <Modal isOpen={updateModalOpen} onClose={() => setUpdateModalOpen(false)} title="Update Result">
        <div className="space-y-4">
          <Select
            label="Result"
            value={updateForm.result}
            onChange={(e) => setUpdateForm({ ...updateForm, result: e.target.value })}
            options={[{value: '', label: 'Select result'}, ...AUCTION_RESULTS]}
          />
          <Input
            label="Hammer Price"
            type="number"
            value={updateForm.hammer_price}
            onChange={(e) => setUpdateForm({ ...updateForm, hammer_price: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-primary-200 px-3 py-2 text-sm text-primary-900 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              rows={3}
              value={updateForm.notes}
              onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
              maxLength={5000}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="primary" onClick={() => setUpdateModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateResult} disabled={submitting}>
              {submitting ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
