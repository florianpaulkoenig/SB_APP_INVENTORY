// ---------------------------------------------------------------------------
// NOA Inventory -- Price Management Page
// Central price management with bulk updates, price history, and AI research.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useBulkPriceUpdate } from '../hooks/useBulkPriceUpdate';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { formatCurrency, formatDate } from '../lib/utils';
import { ARTWORK_CATEGORIES, ARTWORK_SERIES, CURRENCIES } from '../lib/constants';

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
      <Card className="p-6">
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
    </div>
  );
}
