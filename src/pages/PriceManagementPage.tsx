// ---------------------------------------------------------------------------
// NOA Inventory -- Price Management Page
// Central price management with bulk updates, price history, and AI research.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useBulkPriceUpdate } from '../hooks/useBulkPriceUpdate';
import { usePricingStrategy } from '../hooks/usePricingStrategy';
import { usePriceTrajectory } from '../hooks/usePriceTrajectory';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { formatCurrency, formatDate } from '../lib/utils';
import { ARTWORK_CATEGORIES, ARTWORK_SERIES, CURRENCIES } from '../lib/constants';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PricePreview {
  id: string;
  title: string;
  currentPrice: number;
  currency: string;
  newPrice: number;
  change: number;
  galleryId: string | null;
}

interface PriceHistoryRow {
  id: string;
  artwork_id: string;
  price: number;
  currency: string;
  effective_date: string;
  notes: string | null;
  artworks: { title: string } | null;
}

interface PriceReport {
  id: string;
  created_at: string;
  title: string | null;
  summary: string | null;
  report_data: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function elasticityLabel(e: number): { text: string; color: string } {
  if (e > -0.5) return { text: 'Inelastic', color: 'text-emerald-600' };
  if (e > -1.0) return { text: 'Moderate', color: 'text-amber-600' };
  return { text: 'Elastic', color: 'text-red-600' };
}

function pricingPowerBadge(premium: number): { text: string; bg: string } {
  if (premium > 10) return { text: 'Strong', bg: 'bg-emerald-100 text-emerald-800' };
  if (premium > -5) return { text: 'Average', bg: 'bg-primary-100 text-primary-800' };
  return { text: 'Weak', bg: 'bg-red-100 text-red-800' };
}

function directionIcon(current: number, recommended: number): { label: string; color: string } {
  if (recommended > current * 1.01) return { label: 'Increase', color: 'text-emerald-600' };
  if (recommended < current * 0.99) return { label: 'Decrease', color: 'text-red-600' };
  return { label: 'Hold', color: 'text-primary-500' };
}

const SCENARIO_COLORS: Record<string, string> = {
  conservative: '#6b7280',
  moderate: '#2563eb',
  aggressive: '#16a34a',
};

// ---------------------------------------------------------------------------
// Chevron component
// ---------------------------------------------------------------------------

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-primary-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PriceManagementPage() {
  const { toast } = useToast();
  const { previewPriceChange, applyPriceChange, notifyGalleries } = useBulkPriceUpdate();

  // ---- Section 1: Bulk Price Update state ---------------------------------

  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSeries, setBulkSeries] = useState('');
  const [changeType, setChangeType] = useState<'percentage' | 'fixed'>('percentage');
  const [changeValue, setChangeValue] = useState('');
  const [changeCurrency, setChangeCurrency] = useState('EUR');
  const [previews, setPreviews] = useState<PricePreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyNote, setApplyNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  // ---- Section 2: Price History state -------------------------------------

  const [history, setHistory] = useState<PriceHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // ---- Section 3: AI Price Research state ---------------------------------

  const [reports, setReports] = useState<PriceReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // ---- Section 4 & 5: Collapsible sections --------------------------------

  const [showPricingIntel, setShowPricingIntel] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(false);

  const { data: pricingData, loading: pricingLoading } = usePricingStrategy();
  const { data: trajectoryData, loading: trajectoryLoading } = usePriceTrajectory();

  // ---- Fetch price history and reports on mount ---------------------------

  useEffect(() => {
    async function fetchHistory() {
      setHistoryLoading(true);
      const { data } = await supabase
        .from('price_history')
        .select('*, artworks(title)')
        .order('effective_date', { ascending: false })
        .limit(50);

      if (data) setHistory(data as PriceHistoryRow[]);
      setHistoryLoading(false);
    }

    async function fetchReports() {
      setReportsLoading(true);
      const { data } = await supabase
        .from('price_intelligence_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) setReports(data as PriceReport[]);
      setReportsLoading(false);
    }

    fetchHistory();
    fetchReports();
  }, []);

  // ---- Preview handler ----------------------------------------------------

  const handlePreview = useCallback(async () => {
    const value = parseFloat(changeValue);
    if (isNaN(value)) {
      toast({ title: 'Please enter a valid number', variant: 'error' });
      return;
    }

    setPreviewLoading(true);
    setPreviews([]);
    setApplied(false);

    const result = await previewPriceChange(
      { category: bulkCategory || undefined, series: bulkSeries || undefined },
      changeType,
      value,
    );

    setPreviews(result);
    setPreviewLoading(false);
  }, [bulkCategory, bulkSeries, changeType, changeValue, previewPriceChange, toast]);

  // ---- Apply handler ------------------------------------------------------

  const handleApply = useCallback(async () => {
    if (!applyNote.trim()) {
      toast({ title: 'Please enter a note for this change', variant: 'error' });
      return;
    }

    const success = await applyPriceChange(previews, applyNote.trim());
    if (success) {
      setApplied(true);
      setShowNoteInput(false);

      // Refresh price history
      const { data } = await supabase
        .from('price_history')
        .select('*, artworks(title)')
        .order('effective_date', { ascending: false })
        .limit(50);

      if (data) setHistory(data as PriceHistoryRow[]);
    }
  }, [previews, applyNote, applyPriceChange, toast]);

  // ---- Notify galleries handler -------------------------------------------

  const handleNotify = useCallback(async () => {
    await notifyGalleries(previews);
  }, [previews, notifyGalleries]);

  // ---- AI analysis handler ------------------------------------------------

  const handleRunAnalysis = useCallback(async () => {
    setAnalysisRunning(true);
    setAnalysisError(null);

    const { error } = await supabase.functions.invoke('price-research-agent', {
      body: { artist: 'Simon Berger' },
    });

    if (error) {
      setAnalysisError(
        'Unable to run AI analysis. The edge function may not be deployed yet.',
      );
      setAnalysisRunning(false);
      return;
    }

    // Refresh reports after analysis completes
    const { data } = await supabase
      .from('price_intelligence_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setReports(data as PriceReport[]);
    setAnalysisRunning(false);
    toast({ title: 'AI analysis completed', variant: 'success' });
  }, [toast]);

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary-900">
          Price Management
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Manage artwork pricing, apply bulk updates, and run AI market analysis
        </p>
      </div>

      {/* ================================================================== */}
      {/* Section 1: Bulk Price Update                                       */}
      {/* ================================================================== */}
      <Card className="mb-8 p-6">
        <h2 className="font-display text-lg font-semibold text-primary-900 mb-4">
          Bulk Price Update
        </h2>

        {/* Filter row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-primary-500 mb-1">Category</label>
            <Select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} options={[{value: '', label: 'All Categories'}, ...ARTWORK_CATEGORIES]} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-primary-500 mb-1">Series</label>
            <Select value={bulkSeries} onChange={(e) => setBulkSeries(e.target.value)} options={[{value: '', label: 'All Series'}, ...ARTWORK_SERIES]} />
          </div>
        </div>

        {/* Change type */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-primary-500 mb-2">Change Type</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-primary-700 cursor-pointer">
              <input
                type="radio"
                name="changeType"
                value="percentage"
                checked={changeType === 'percentage'}
                onChange={() => setChangeType('percentage')}
                className="accent-primary-900"
              />
              Percentage (%)
            </label>
            <label className="flex items-center gap-2 text-sm text-primary-700 cursor-pointer">
              <input
                type="radio"
                name="changeType"
                value="fixed"
                checked={changeType === 'fixed'}
                onChange={() => setChangeType('fixed')}
                className="accent-primary-900"
              />
              Fixed Price
            </label>
          </div>
        </div>

        {/* Value + currency */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-primary-500 mb-1">
              {changeType === 'percentage' ? 'Change (%)' : 'New Price'}
            </label>
            <Input
              type="number"
              step={changeType === 'percentage' ? '0.1' : '1'}
              placeholder={changeType === 'percentage' ? 'e.g. 10 for +10%' : 'e.g. 5000'}
              value={changeValue}
              onChange={(e) => setChangeValue(e.target.value)}
            />
          </div>
          {changeType === 'fixed' && (
            <div className="w-32">
              <label className="block text-xs font-medium text-primary-500 mb-1">Currency</label>
              <Select value={changeCurrency} onChange={(e) => setChangeCurrency(e.target.value)} options={CURRENCIES} />
            </div>
          )}
          <Button onClick={handlePreview} disabled={previewLoading || !changeValue}>
            {previewLoading ? 'Loading...' : 'Preview Changes'}
          </Button>
        </div>

        {/* Preview table */}
        {previews.length > 0 && (
          <div className="mt-4">
            <div className="overflow-x-auto rounded-lg border border-primary-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-50 text-left">
                    <th className="px-3 py-2 font-medium text-primary-600">Artwork</th>
                    <th className="px-3 py-2 font-medium text-primary-600 text-right">Current Price</th>
                    <th className="px-3 py-2 font-medium text-primary-600 text-right">New Price</th>
                    <th className="px-3 py-2 font-medium text-primary-600 text-right">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {previews.map((p) => (
                    <tr key={p.id} className="border-t border-primary-50">
                      <td className="px-3 py-2 text-primary-900">{p.title}</td>
                      <td className="px-3 py-2 text-right text-primary-600">
                        {formatCurrency(p.currentPrice, p.currency)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-primary-900">
                        {formatCurrency(p.newPrice, p.currency)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          p.change > 0 ? 'text-emerald-600' : p.change < 0 ? 'text-red-600' : 'text-primary-400'
                        }`}
                      >
                        {p.change > 0 ? '+' : ''}
                        {formatCurrency(p.change, p.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-2 text-sm text-primary-500">
              {previews.length} artwork{previews.length !== 1 ? 's' : ''} will be updated
            </p>

            {/* Apply / Notify actions */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {!applied && !showNoteInput && (
                <Button onClick={() => setShowNoteInput(true)}>
                  Apply Changes
                </Button>
              )}

              {showNoteInput && !applied && (
                <div className="flex items-end gap-2 w-full sm:w-auto">
                  <div className="flex-1 sm:w-64">
                    <label className="block text-xs font-medium text-primary-500 mb-1">
                      Note for this update
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Annual price increase 2026"
                      value={applyNote}
                      onChange={(e) => setApplyNote(e.target.value)}
                      maxLength={256}
                    />
                  </div>
                  <Button onClick={handleApply} disabled={!applyNote.trim()}>
                    Confirm
                  </Button>
                  <Button variant="outline" onClick={() => setShowNoteInput(false)}>
                    Cancel
                  </Button>
                </div>
              )}

              {applied && (
                <Button variant="outline" onClick={handleNotify}>
                  Notify Galleries
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ================================================================== */}
      {/* Section 2: Price History Overview                                   */}
      {/* ================================================================== */}
      <Card className="mb-8 p-6">
        <h2 className="font-display text-lg font-semibold text-primary-900 mb-4">
          Recent Price Changes
        </h2>

        {historyLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-primary-500">No price changes recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-primary-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-50 text-left">
                  <th className="px-3 py-2 font-medium text-primary-600">Artwork</th>
                  <th className="px-3 py-2 font-medium text-primary-600 text-right">Price</th>
                  <th className="px-3 py-2 font-medium text-primary-600">Currency</th>
                  <th className="px-3 py-2 font-medium text-primary-600">Date</th>
                  <th className="px-3 py-2 font-medium text-primary-600">Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-primary-50">
                    <td className="px-3 py-2 text-primary-900">
                      {h.artworks?.title ?? 'Unknown'}
                    </td>
                    <td className="px-3 py-2 text-right text-primary-900">
                      {formatCurrency(h.price, h.currency)}
                    </td>
                    <td className="px-3 py-2 text-primary-600">{h.currency}</td>
                    <td className="px-3 py-2 text-primary-600">
                      {formatDate(h.effective_date)}
                    </td>
                    <td className="px-3 py-2 text-primary-500 max-w-xs truncate">
                      {h.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ================================================================== */}
      {/* Section 3: AI Price Research                                        */}
      {/* ================================================================== */}
      <Card className="mb-8 p-6">
        <h2 className="font-display text-lg font-semibold text-primary-900 mb-2">
          AI Price Research
        </h2>
        <p className="text-sm text-primary-500 mb-4">
          Run an AI-powered market analysis for Simon Berger&apos;s artwork pricing.
        </p>

        <Button onClick={handleRunAnalysis} disabled={analysisRunning}>
          {analysisRunning ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              Running Analysis...
            </span>
          ) : (
            'Run Market Analysis'
          )}
        </Button>

        {analysisError && (
          <p className="mt-3 text-sm text-red-600">{analysisError}</p>
        )}

        {/* Reports list */}
        <div className="mt-6">
          {reportsLoading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-primary-500">
              No AI reports yet. Run your first analysis above.
            </p>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-lg border border-primary-100 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-sm font-medium text-primary-900">
                      {report.title || 'Market Analysis Report'}
                    </h3>
                    <span className="text-xs text-primary-400 whitespace-nowrap">
                      {formatDate(report.created_at)}
                    </span>
                  </div>
                  {report.summary && (
                    <p className="mt-2 text-sm text-primary-600">{report.summary}</p>
                  )}
                  {report.report_data &&
                    Array.isArray((report.report_data as Record<string, unknown>).recommendations) && (
                      <div className="mt-3">
                        <h4 className="text-xs font-medium text-primary-500 uppercase tracking-wider mb-1">
                          Recommendations
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {(
                            (report.report_data as Record<string, unknown>)
                              .recommendations as string[]
                          ).map((rec, i) => (
                            <li key={i} className="text-sm text-primary-700">
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ================================================================== */}
      {/* Section 4: Pricing Intelligence (collapsible)                      */}
      {/* ================================================================== */}
      <Card className="mb-8">
        <button
          type="button"
          className="w-full flex items-center justify-between p-6 text-left"
          onClick={() => setShowPricingIntel((v) => !v)}
        >
          <div>
            <h2 className="font-display text-lg font-semibold text-primary-900">
              Pricing Intelligence
            </h2>
            <p className="mt-0.5 text-sm text-primary-500">
              Series elasticity, gallery pricing power, size premiums &amp; seasonal patterns
            </p>
          </div>
          <ChevronIcon open={showPricingIntel} />
        </button>

        {showPricingIntel && (
          <div className="px-6 pb-6">
            {pricingLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : !pricingData ? (
              <p className="text-sm text-primary-500">No pricing intelligence data available.</p>
            ) : (
              <div className="space-y-8">
                {/* 4a. Series Price Elasticity */}
                {pricingData.seriesElasticity.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary-800 mb-3">
                      Series Price Elasticity
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-primary-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-primary-50 text-left">
                            <th className="px-3 py-2 font-medium text-primary-600">Series</th>
                            <th className="px-3 py-2 font-medium text-primary-600 text-right">Optimal Low</th>
                            <th className="px-3 py-2 font-medium text-primary-600 text-right">Optimal High</th>
                            <th className="px-3 py-2 font-medium text-primary-600">Elasticity</th>
                            <th className="px-3 py-2 font-medium text-primary-600">Recommendation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricingData.seriesElasticity.map((se) => {
                            const label = elasticityLabel(se.elasticity);
                            return (
                              <tr key={se.series} className="border-t border-primary-50">
                                <td className="px-3 py-2 text-primary-900 font-medium">{se.series}</td>
                                <td className="px-3 py-2 text-right text-primary-700">
                                  {formatCurrency(se.optimalPriceRange.min, 'CHF')}
                                </td>
                                <td className="px-3 py-2 text-right text-primary-700">
                                  {formatCurrency(se.optimalPriceRange.max, 'CHF')}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`font-medium ${label.color}`}>
                                    {label.text}
                                  </span>
                                  <span className="text-primary-400 ml-1 text-xs">({se.elasticity})</span>
                                </td>
                                <td className="px-3 py-2 text-primary-600 text-xs max-w-xs">
                                  Target {formatCurrency(se.revenueMaximizingPrice, 'CHF')} for max revenue ({se.salesCount} sales)
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4b. Gallery Pricing Power */}
                {pricingData.galleryPricing.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary-800 mb-3">
                      Gallery Pricing Power
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-primary-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-primary-50 text-left">
                            <th className="px-3 py-2 font-medium text-primary-600">Gallery</th>
                            <th className="px-3 py-2 font-medium text-primary-600 text-right">Avg Discount %</th>
                            <th className="px-3 py-2 font-medium text-primary-600 text-right">At List Price %</th>
                            <th className="px-3 py-2 font-medium text-primary-600 text-right">Price Premium %</th>
                            <th className="px-3 py-2 font-medium text-primary-600">Power</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricingData.galleryPricing.map((gp) => {
                            const badge = pricingPowerBadge(gp.pricePremium);
                            return (
                              <tr key={gp.galleryId} className="border-t border-primary-50">
                                <td className="px-3 py-2 text-primary-900 font-medium">{gp.galleryName}</td>
                                <td className="px-3 py-2 text-right text-primary-700">{gp.avgDiscountPercent}%</td>
                                <td className="px-3 py-2 text-right text-primary-700">{gp.atListPriceRate}%</td>
                                <td className="px-3 py-2 text-right text-primary-700">
                                  {gp.pricePremium > 0 ? '+' : ''}{gp.pricePremium}%
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg}`}>
                                    {badge.text}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4c. Size Premiums */}
                {pricingData.sizePremiums.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary-800 mb-3">
                      Size Premiums
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-primary-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-primary-50 text-left">
                            <th className="px-3 py-2 font-medium text-primary-600">Size Category</th>
                            <th className="px-3 py-2 font-medium text-primary-600 text-right">Avg Price (CHF)</th>
                            <th className="px-3 py-2 font-medium text-primary-600 text-right">Premium vs Smallest</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricingData.sizePremiums.map((sp) => (
                            <tr key={sp.sizeCategory} className="border-t border-primary-50">
                              <td className="px-3 py-2 text-primary-900 font-medium capitalize">{sp.sizeCategory}</td>
                              <td className="px-3 py-2 text-right text-primary-700">
                                {formatCurrency(sp.avgPriceCHF, 'CHF')}
                              </td>
                              <td className="px-3 py-2 text-right text-primary-700">
                                {sp.premiumVsSmallest > 0 ? '+' : ''}{sp.premiumVsSmallest}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4d. Seasonal Patterns */}
                {pricingData.seasonalPatterns.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary-800 mb-3">
                      Seasonal Patterns
                    </h3>

                    {/* Bar chart */}
                    <div className="h-56 mb-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pricingData.seasonalPatterns}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value, 'CHF')}
                          />
                          <Bar dataKey="avgPriceCHF" name="Avg Revenue (CHF)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-primary-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-primary-50 text-left">
                            <th className="px-3 py-2 font-medium text-primary-600">Month</th>
                            <th className="px-3 py-2 font-medium text-primary-600 text-right">Sales</th>
                            <th className="px-3 py-2 font-medium text-primary-600 text-right">Revenue (CHF)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricingData.seasonalPatterns
                            .filter((sp) => sp.salesCount > 0)
                            .map((sp) => (
                              <tr key={sp.month} className="border-t border-primary-50">
                                <td className="px-3 py-2 text-primary-900">{sp.monthName}</td>
                                <td className="px-3 py-2 text-right text-primary-700">{sp.salesCount}</td>
                                <td className="px-3 py-2 text-right text-primary-700">
                                  {formatCurrency(sp.avgPriceCHF * sp.salesCount, 'CHF')}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4e. Pricing Recommendations */}
                {pricingData.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary-800 mb-3">
                      Pricing Recommendations
                    </h3>
                    <div className="space-y-3">
                      {pricingData.recommendations.map((rec) => {
                        const dir = directionIcon(rec.currentAvgPrice, rec.recommendedPrice);
                        return (
                          <div
                            key={rec.series}
                            className="rounded-lg border border-primary-100 p-4"
                          >
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-medium text-primary-900">{rec.series}</span>
                              <span className={`text-xs font-semibold ${dir.color}`}>
                                {dir.label}
                              </span>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                rec.confidence === 'high'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.confidence === 'medium'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-primary-100 text-primary-600'
                              }`}>
                                {rec.confidence} confidence
                              </span>
                            </div>
                            <p className="text-sm text-primary-600">{rec.reasoning}</p>
                            <div className="mt-2 flex gap-4 text-xs text-primary-500">
                              <span>Current: {formatCurrency(rec.currentAvgPrice, 'CHF')}</span>
                              <span>Recommended: {formatCurrency(rec.recommendedPrice, 'CHF')}</span>
                              <span>Projected revenue change: {rec.projectedRevenueChange > 0 ? '+' : ''}{rec.projectedRevenueChange}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ================================================================== */}
      {/* Section 5: 5-Year Price Trajectory (collapsible)                   */}
      {/* ================================================================== */}
      <Card className="mb-8">
        <button
          type="button"
          className="w-full flex items-center justify-between p-6 text-left"
          onClick={() => setShowTrajectory((v) => !v)}
        >
          <div>
            <h2 className="font-display text-lg font-semibold text-primary-900">
              5-Year Price Trajectory
            </h2>
            <p className="mt-0.5 text-sm text-primary-500">
              Conservative, moderate &amp; aggressive pricing scenarios
            </p>
          </div>
          <ChevronIcon open={showTrajectory} />
        </button>

        {showTrajectory && (
          <div className="px-6 pb-6">
            {trajectoryLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : !trajectoryData ? (
              <p className="text-sm text-primary-500">No trajectory data available.</p>
            ) : (
              <div className="space-y-8">
                {/* KPI Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-lg border border-primary-100 p-4 text-center">
                    <p className="text-xs text-primary-500 mb-1">Current Avg Price</p>
                    <p className="text-lg font-semibold text-primary-900">
                      {formatCurrency(trajectoryData.currentAvgPrice, 'CHF')}
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary-100 p-4 text-center">
                    <p className="text-xs text-primary-500 mb-1">Median Price</p>
                    <p className="text-lg font-semibold text-primary-900">
                      {formatCurrency(trajectoryData.currentMedianPrice, 'CHF')}
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary-100 p-4 text-center">
                    <p className="text-xs text-primary-500 mb-1">Historical Growth</p>
                    <p className="text-lg font-semibold text-primary-900">
                      {trajectoryData.historicalGrowthRate > 0 ? '+' : ''}
                      {trajectoryData.historicalGrowthRate}% / yr
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary-100 p-4 text-center">
                    <p className="text-xs text-primary-500 mb-1">Milestones Achieved</p>
                    <p className="text-lg font-semibold text-primary-900">
                      {trajectoryData.milestonesAchieved}
                    </p>
                  </div>
                </div>

                {/* Combined Line Chart */}
                {trajectoryData.scenarios.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-primary-800 mb-3">
                      Price Projection (CHF)
                    </h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={trajectoryData.scenarios[0].years.map((y, i) => ({
                            year: y.year,
                            conservative: trajectoryData.scenarios.find((s) => s.name === 'conservative')?.years[i]?.avgPrice ?? 0,
                            moderate: trajectoryData.scenarios.find((s) => s.name === 'moderate')?.years[i]?.avgPrice ?? 0,
                            aggressive: trajectoryData.scenarios.find((s) => s.name === 'aggressive')?.years[i]?.avgPrice ?? 0,
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                          <Tooltip formatter={(value: number) => formatCurrency(value, 'CHF')} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="conservative"
                            name="Conservative"
                            stroke={SCENARIO_COLORS.conservative}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="moderate"
                            name="Moderate"
                            stroke={SCENARIO_COLORS.moderate}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="aggressive"
                            name="Aggressive"
                            stroke={SCENARIO_COLORS.aggressive}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Summary Table */}
                <div>
                  <h3 className="text-sm font-semibold text-primary-800 mb-3">
                    Scenario Summary
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-primary-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-primary-50 text-left">
                          <th className="px-3 py-2 font-medium text-primary-600">Scenario</th>
                          <th className="px-3 py-2 font-medium text-primary-600 text-right">Y1 Price</th>
                          <th className="px-3 py-2 font-medium text-primary-600 text-right">Y3 Price</th>
                          <th className="px-3 py-2 font-medium text-primary-600 text-right">Y5 Price</th>
                          <th className="px-3 py-2 font-medium text-primary-600 text-right">Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trajectoryData.scenarios.map((sc) => (
                          <tr key={sc.name} className="border-t border-primary-50">
                            <td className="px-3 py-2">
                              <span className="font-medium text-primary-900">{sc.label}</span>
                              <span className="block text-xs text-primary-500">{sc.description}</span>
                            </td>
                            <td className="px-3 py-2 text-right text-primary-700">
                              {sc.years[0] ? formatCurrency(sc.years[0].avgPrice, 'CHF') : '-'}
                            </td>
                            <td className="px-3 py-2 text-right text-primary-700">
                              {sc.years[2] ? formatCurrency(sc.years[2].avgPrice, 'CHF') : '-'}
                            </td>
                            <td className="px-3 py-2 text-right text-primary-700">
                              {sc.years[4] ? formatCurrency(sc.years[4].avgPrice, 'CHF') : '-'}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-primary-900">
                              {formatCurrency(sc.totalProjectedRevenue, 'CHF')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
