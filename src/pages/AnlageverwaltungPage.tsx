import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { usePortfolio } from '../contexts/PortfolioContext';
import { formatCurrency, downloadBlob } from '../lib/utils';
import { getSignedUrls } from '../lib/signedUrlCache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArtworkInvestment {
  id: string;
  title: string;
  artist_name: string | null;
  reference_code: string | null;
  year: number | null;
  category: string | null;
  medium: string | null;
  purchase_price: number | null;
  purchase_currency: string;
  purchase_date: string | null;
  estimated_value: number | null;
  estimated_value_date: string | null;
  primary_image_path: string | null;
  signed_url: string | null;
}

interface EditState {
  purchase_price: string;
  purchase_currency: string;
  purchase_date: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gainPercent(purchase: number | null, estimated: number | null): number | null {
  if (!purchase || !estimated || purchase === 0) return null;
  return ((estimated - purchase) / purchase) * 100;
}

function gainAbs(purchase: number | null, estimated: number | null): number | null {
  if (purchase == null || estimated == null) return null;
  return estimated - purchase;
}

function fmt(n: number | null, currency = 'CHF'): string {
  if (n == null) return '—';
  return formatCurrency(n, currency);
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('de-CH');
}

function fmtPercent(p: number | null): string {
  if (p == null) return '—';
  const sign = p >= 0 ? '+' : '';
  return `${sign}${p.toFixed(1)} %`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AnlageverwaltungPage() {
  const { portfolio } = usePortfolio();
  const { toast } = useToast();

  const [artworks, setArtworks] = useState<ArtworkInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [artistFilter, setArtistFilter] = useState('');
  const [valuationModal, setValuationModal] = useState<{ artwork: ArtworkInvestment } | null>(null);
  const [valForm, setValForm] = useState({ value: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [valSaving, setValSaving] = useState(false);

  // ---- Fetch -----------------------------------------------------------------

  const fetchArtworks = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('artworks')
        .select('id, title, artist_name, reference_code, year, category, medium, purchase_price, purchase_currency, purchase_date, estimated_value, estimated_value_date')
        .eq('portfolio', portfolio)
        .order('title', { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as Omit<ArtworkInvestment, 'primary_image_path' | 'signed_url'>[];

      // Fetch primary images
      const ids = rows.map((r) => r.id);
      let imageMap = new Map<string, string>();

      if (ids.length > 0) {
        const { data: imgData } = await supabase
          .from('artwork_images')
          .select('artwork_id, storage_path')
          .in('artwork_id', ids)
          .eq('is_primary', true);

        if (imgData && imgData.length > 0) {
          const paths = imgData.map((i) => i.storage_path);
          const urlMap = await getSignedUrls('artwork-images', paths);
          imgData.forEach((i) => {
            const url = urlMap.get(i.storage_path);
            if (url) imageMap.set(i.artwork_id, url);
          });
        }
      }

      setArtworks(
        rows.map((r) => ({
          ...r,
          purchase_currency: r.purchase_currency ?? 'CHF',
          primary_image_path: null,
          signed_url: imageMap.get(r.id) ?? null,
        })),
      );
    } catch {
      toast({ title: 'Fehler', description: 'Daten konnten nicht geladen werden.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [portfolio, toast]);

  useEffect(() => { fetchArtworks(); }, [fetchArtworks]);

  // ---- Edit ------------------------------------------------------------------

  function startEdit(a: ArtworkInvestment) {
    setEditingId(a.id);
    setEditState({
      purchase_price: a.purchase_price?.toString() ?? '',
      purchase_currency: a.purchase_currency ?? 'CHF',
      purchase_date: a.purchase_date ?? '',
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  function openValuationModal(a: ArtworkInvestment) {
    setValuationModal({ artwork: a });
    setValForm({
      value: a.estimated_value?.toString() ?? '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  }

  async function submitValuation() {
    if (!valuationModal) return;
    const val = Number(valForm.value);
    if (!valForm.value || isNaN(val) || val <= 0) return;

    setValSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('valuations')
        .insert({
          artwork_id: valuationModal.artwork.id,
          user_id: session.user.id,
          value: val,
          currency: 'CHF',
          valuation_date: valForm.date,
          notes: valForm.notes || null,
        } as never);

      if (error) throw error;
      toast({ title: 'Schätzwert gespeichert', variant: 'success' });
      setValuationModal(null);
      await fetchArtworks();
    } catch {
      toast({ title: 'Fehler', description: 'Schätzwert konnte nicht gespeichert werden.', variant: 'error' });
    } finally {
      setValSaving(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editState) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('artworks')
        .update({
          purchase_price: editState.purchase_price ? Number(editState.purchase_price) : null,
          purchase_currency: editState.purchase_currency || 'CHF',
          purchase_date: editState.purchase_date || null,
        } as never)
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Gespeichert', variant: 'success' });
      setEditingId(null);
      setEditState(null);
      await fetchArtworks();
    } catch {
      toast({ title: 'Fehler', description: 'Speichern fehlgeschlagen.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  // ---- Artist filter ---------------------------------------------------------

  const displayedArtworks = artistFilter.trim()
    ? artworks.filter((a) => (a.artist_name ?? '').toLowerCase().includes(artistFilter.toLowerCase()))
    : artworks;

  // ---- Summary ---------------------------------------------------------------

  const totalPurchase = artworks.reduce((s, a) => s + (a.purchase_price ?? 0), 0);
  const totalEstimated = artworks.reduce((s, a) => s + (a.estimated_value ?? 0), 0);
  const totalGain = totalEstimated - totalPurchase;
  const totalGainPct = totalPurchase > 0 ? (totalGain / totalPurchase) * 100 : null;

  // ---- Excel export ----------------------------------------------------------

  async function exportExcel() {
    setExporting(true);
    try {
      const { default: ExcelJS } = await import('exceljs');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Anlageliste');

      ws.columns = [
        { header: 'Referenz', key: 'ref', width: 18 },
        { header: 'Titel', key: 'title', width: 35 },
        { header: 'Künstler:in', key: 'artist', width: 24 },
        { header: 'Jahr', key: 'year', width: 8 },
        { header: 'Kategorie', key: 'category', width: 14 },
        { header: 'Ankaufswert', key: 'purchase', width: 16 },
        { header: 'Währung', key: 'currency', width: 10 },
        { header: 'Ankaufsdatum', key: 'purchase_date', width: 14 },
        { header: 'Schätzwert', key: 'estimated', width: 16 },
        { header: 'Schätzwertdatum', key: 'est_date', width: 16 },
        { header: 'Differenz', key: 'gain_abs', width: 14 },
        { header: 'Differenz %', key: 'gain_pct', width: 12 },
      ];

      // Style header row
      ws.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F0EB' } };
      });

      displayedArtworks.forEach((a) => {
        const gAbs = gainAbs(a.purchase_price, a.estimated_value);
        const gPct = gainPercent(a.purchase_price, a.estimated_value);
        ws.addRow({
          ref: a.reference_code ?? '',
          title: a.title,
          artist: a.artist_name ?? '',
          year: a.year ?? '',
          category: a.category ?? '',
          purchase: a.purchase_price ?? '',
          currency: a.purchase_currency,
          purchase_date: a.purchase_date ? fmtDate(a.purchase_date) : '',
          estimated: a.estimated_value ?? '',
          est_date: a.estimated_value_date ? fmtDate(a.estimated_value_date) : '',
          gain_abs: gAbs != null ? Number(gAbs.toFixed(2)) : '',
          gain_pct: gPct != null ? Number(gPct.toFixed(1)) : '',
        });
      });

      // Summary row
      const summaryRow = ws.addRow({
        ref: 'TOTAL',
        title: '',
        year: '',
        category: '',
        purchase: totalPurchase,
        currency: 'CHF',
        purchase_date: '',
        estimated: totalEstimated,
        est_date: new Date().toLocaleDateString('de-CH'),
        gain_abs: totalGain,
        gain_pct: totalGainPct != null ? Number(totalGainPct.toFixed(1)) : '',
      });
      summaryRow.eachCell((cell) => { cell.font = { bold: true }; });

      const buf = await wb.xlsx.writeBuffer();
      const date = new Date().toISOString().split('T')[0];
      downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Anlageliste_NOA_${date}.xlsx`);
    } catch {
      toast({ title: 'Fehler', description: 'Excel-Export fehlgeschlagen.', variant: 'error' });
    } finally {
      setExporting(false);
    }
  }

  // ---- PDF export ------------------------------------------------------------

  async function exportPDF(withThumbnails: boolean) {
    setExporting(true);
    try {
      const { pdf, Document, Page, Text, View, StyleSheet, Image, Font } = await import('@react-pdf/renderer');

      Font.register({
        family: 'Helvetica',
        fonts: [{ src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf' }],
      });

      const styles = StyleSheet.create({
        page: { padding: 36, fontSize: 8, fontFamily: 'Helvetica', color: '#1a1a1a' },
        header: { marginBottom: 20 },
        title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
        subtitle: { fontSize: 9, color: '#888', marginBottom: 16 },
        tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 4, marginBottom: 4, fontWeight: 'bold' },
        row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#eee', paddingVertical: 5, alignItems: 'center' },
        rowAlt: { backgroundColor: '#f9f7f4' },
        thumb: { width: 32, height: 32, marginRight: 6, objectFit: 'cover' },
        thumbPlaceholder: { width: 32, height: 32, marginRight: 6, backgroundColor: '#f0ece6' },
        col: { flex: 1 },
        colRef: { width: 80 },
        colTitle: { flex: 2 },
        colYear: { width: 30 },
        colPrice: { width: 70, textAlign: 'right' },
        colDate: { width: 58 },
        colGain: { width: 50, textAlign: 'right' },
        summary: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#ccc', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
        summaryLabel: { fontSize: 8, color: '#888' },
        summaryValue: { fontSize: 9, fontWeight: 'bold' },
        footer: { position: 'absolute', bottom: 24, left: 36, right: 36, fontSize: 7, color: '#aaa', textAlign: 'center' },
      });

      const date = new Date().toLocaleDateString('de-CH');

      const doc = (
        <Document>
          <Page size="A4" orientation="landscape" style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.title}>Anlageliste — NOA Collection</Text>
              <Text style={styles.subtitle}>Tagesaktuell per {date} · {artworks.length} Werke</Text>
            </View>

            {/* Table header */}
            <View style={styles.tableHeader}>
              {withThumbnails && <View style={{ width: 38 }} />}
              <Text style={styles.colRef}>Referenz</Text>
              <Text style={styles.colTitle}>Titel</Text>
              <Text style={styles.colYear}>Jahr</Text>
              <Text style={styles.colPrice}>Ankaufswert</Text>
              <Text style={styles.colDate}>Ankaufsdatum</Text>
              <Text style={styles.colPrice}>Schätzwert</Text>
              <Text style={styles.colDate}>Schätzwertdatum</Text>
              <Text style={styles.colGain}>Differenz</Text>
            </View>

            {/* Rows */}
            {displayedArtworks.map((a, i) => {
              const gPct = gainPercent(a.purchase_price, a.estimated_value);
              const gainColor = gPct == null ? '#666' : gPct >= 0 ? '#1a6640' : '#b91c1c';
              return (
                <View key={a.id} style={[styles.row, i % 2 === 1 ? styles.rowAlt : {}]}>
                  {withThumbnails && (
                    a.signed_url
                      ? <Image src={a.signed_url} style={styles.thumb} />
                      : <View style={styles.thumbPlaceholder} />
                  )}
                  <Text style={styles.colRef}>{a.reference_code ?? '—'}</Text>
                  <Text style={styles.colTitle}>{a.title}</Text>
                  <Text style={styles.colYear}>{a.year ?? '—'}</Text>
                  <Text style={styles.colPrice}>{a.purchase_price != null ? formatCurrency(a.purchase_price, a.purchase_currency) : '—'}</Text>
                  <Text style={styles.colDate}>{fmtDate(a.purchase_date)}</Text>
                  <Text style={styles.colPrice}>{a.estimated_value != null ? formatCurrency(a.estimated_value, a.purchase_currency) : '—'}</Text>
                  <Text style={styles.colDate}>{fmtDate(a.estimated_value_date)}</Text>
                  <Text style={[styles.colGain, { color: gainColor }]}>{fmtPercent(gPct)}</Text>
                </View>
              );
            })}

            {/* Summary */}
            <View style={styles.summary}>
              <View>
                <Text style={styles.summaryLabel}>Total Ankaufswert</Text>
                <Text style={styles.summaryValue}>{fmt(totalPurchase, 'CHF')}</Text>
              </View>
              <View>
                <Text style={styles.summaryLabel}>Total Schätzwert</Text>
                <Text style={styles.summaryValue}>{fmt(totalEstimated, 'CHF')}</Text>
              </View>
              <View>
                <Text style={styles.summaryLabel}>Differenz</Text>
                <Text style={[styles.summaryValue, { color: totalGain >= 0 ? '#1a6640' : '#b91c1c' }]}>
                  {fmt(totalGain, 'CHF')} ({totalGainPct != null ? fmtPercent(totalGainPct) : '—'})
                </Text>
              </View>
            </View>

            <Text style={styles.footer}>
              NOA contemporary — Anlageliste — {date}
            </Text>
          </Page>
        </Document>
      );

      const blob = await pdf(doc).toBlob();
      const suffix = withThumbnails ? 'mit_Thumbnails' : 'ohne_Thumbnails';
      const filename = `Anlageliste_NOA_${new Date().toISOString().split('T')[0]}_${suffix}.pdf`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error(err);
      toast({ title: 'Fehler', description: 'PDF-Export fehlgeschlagen.', variant: 'error' });
    } finally {
      setExporting(false);
    }
  }

  // ---- Render ----------------------------------------------------------------

  if (portfolio !== 'noa_collection') {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-primary-400">Diese Seite ist nur für das NOA Collection Portfolio verfügbar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">Anlageverwaltung</h1>
          <p className="mt-1 text-sm text-primary-400">
            NOA Collection · {artworks.length} Werke · Stand: {new Date().toLocaleDateString('de-CH')}
          </p>
        </div>
        <div className="flex flex-1 max-w-xs items-center mt-1">
          <input
            type="text"
            placeholder="Nach Künstler:in filtern..."
            value={artistFilter}
            onChange={(e) => setArtistFilter(e.target.value)}
            className="w-full border-0 border-b border-primary-200 bg-transparent px-0 py-2 text-sm text-primary-900 placeholder:text-primary-300 focus:border-accent focus:outline-none"
          />
          {artistFilter && (
            <button
              type="button"
              onClick={() => setArtistFilter('')}
              className="ml-2 text-xs text-primary-400 hover:text-primary-700"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            disabled={exporting || loading}
            className="flex items-center gap-2 rounded-none border border-primary-200 px-3 py-2 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Excel
          </button>
          <button
            onClick={() => exportPDF(false)}
            disabled={exporting || loading}
            className="flex items-center gap-2 rounded-none border border-primary-200 px-3 py-2 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            PDF ohne Thumbnails
          </button>
          <button
            onClick={() => exportPDF(true)}
            disabled={exporting || loading}
            className="flex items-center gap-2 rounded-none border border-primary-200 bg-primary-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-800 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            PDF mit Thumbnails
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Werke', value: artworks.length.toString() },
          { label: 'Total Ankaufswert', value: fmt(totalPurchase) },
          { label: 'Total Schätzwert', value: fmt(totalEstimated) },
          {
            label: 'Gesamtperformance',
            value: `${fmt(totalGain)} (${totalGainPct != null ? fmtPercent(totalGainPct) : '—'})`,
            positive: totalGain >= 0,
          },
        ].map((card) => (
          <div key={card.label} className="border border-primary-100 bg-white p-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-primary-400">{card.label}</p>
            <p className={`mt-1 text-lg font-semibold ${card.positive === false ? 'text-red-600' : card.positive === true ? 'text-emerald-700' : 'text-primary-900'}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-primary-100 bg-white">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-900" />
          </div>
        ) : artworks.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-primary-400">Noch keine Werke im NOA Collection Portfolio.</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-primary-100 bg-primary-50">
                <th className="w-12 px-3 py-3" />
                <th className="px-3 py-3 text-left font-medium uppercase tracking-wider text-primary-400">Werk</th>
                <th className="hidden px-3 py-3 text-left font-medium uppercase tracking-wider text-primary-400 md:table-cell">Künstler:in</th>
                <th className="px-3 py-3 text-right font-medium uppercase tracking-wider text-primary-400">Ankaufswert</th>
                <th className="px-3 py-3 text-center font-medium uppercase tracking-wider text-primary-400">Ankaufsdatum</th>
                <th className="px-3 py-3 text-right font-medium uppercase tracking-wider text-primary-400">Schätzwert</th>
                <th className="px-3 py-3 text-center font-medium uppercase tracking-wider text-primary-400">Schätzwertdatum</th>
                <th className="px-3 py-3 text-right font-medium uppercase tracking-wider text-primary-400">Performance</th>
                <th className="w-16 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {displayedArtworks.map((a, i) => {
                const isEditing = editingId === a.id;
                const gPct = gainPercent(a.purchase_price, a.estimated_value);
                const gAbs = gainAbs(a.purchase_price, a.estimated_value);
                const gainColor = gPct == null ? 'text-primary-400' : gPct >= 0 ? 'text-emerald-700' : 'text-red-600';

                return (
                  <tr key={a.id} className={`border-b border-primary-100 ${i % 2 === 1 ? 'bg-primary-50/30' : ''}`}>
                    {/* Thumbnail */}
                    <td className="px-3 py-2">
                      {a.signed_url ? (
                        <img src={a.signed_url} alt="" className="h-10 w-10 object-cover" />
                      ) : (
                        <div className="h-10 w-10 bg-primary-100" />
                      )}
                    </td>

                    {/* Title + ref */}
                    <td className="px-3 py-2">
                      <p className="font-medium text-primary-900">{a.title}</p>
                      <p className="text-[10px] text-primary-400">{a.reference_code ?? '—'} {a.year ? `· ${a.year}` : ''}</p>
                    </td>

                    {/* Künstler:in */}
                    <td className="hidden px-3 py-2 text-sm text-primary-600 md:table-cell">
                      {a.artist_name ?? '—'}
                    </td>

                    {/* Ankaufswert */}
                    <td className="px-3 py-2 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={editState?.purchase_price ?? ''}
                            onChange={(e) => setEditState((s) => s ? { ...s, purchase_price: e.target.value } : s)}
                            placeholder="0"
                            className="w-24 border border-primary-200 px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                          <select
                            value={editState?.purchase_currency ?? 'CHF'}
                            onChange={(e) => setEditState((s) => s ? { ...s, purchase_currency: e.target.value } : s)}
                            className="border border-primary-200 px-1 py-1 text-xs focus:outline-none"
                          >
                            {['CHF', 'EUR', 'USD', 'GBP'].map((c) => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                      ) : (
                        <span className="text-primary-900">
                          {a.purchase_price != null ? formatCurrency(a.purchase_price, a.purchase_currency) : '—'}
                        </span>
                      )}
                    </td>

                    {/* Ankaufsdatum */}
                    <td className="px-3 py-2 text-center text-primary-600">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editState?.purchase_date ?? ''}
                          onChange={(e) => setEditState((s) => s ? { ...s, purchase_date: e.target.value } : s)}
                          className="border border-primary-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      ) : fmtDate(a.purchase_date)}
                    </td>

                    {/* Schätzwert — read-only, driven by valuations history */}
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-primary-900">
                          {a.estimated_value != null ? formatCurrency(a.estimated_value, a.purchase_currency) : '—'}
                        </span>
                        <button
                          type="button"
                          onClick={() => openValuationModal(a)}
                          title="Neuen Schätzwert erfassen"
                          className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-primary-200 text-[10px] text-primary-400 hover:border-primary-500 hover:text-primary-700"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Schätzwertdatum — read-only */}
                    <td className="px-3 py-2 text-center text-primary-600">
                      {fmtDate(a.estimated_value_date)}
                    </td>

                    {/* Performance */}
                    <td className={`px-3 py-2 text-right font-medium ${gainColor}`}>
                      {gPct != null ? (
                        <div>
                          <p>{fmtPercent(gPct)}</p>
                          <p className="text-[10px] font-normal">{gAbs != null ? fmt(gAbs, a.purchase_currency) : ''}</p>
                        </div>
                      ) : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => saveEdit(a.id)}
                            disabled={saving}
                            className="px-2 py-1 text-[10px] font-medium text-emerald-700 hover:underline disabled:opacity-50"
                          >
                            Speichern
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-2 py-1 text-[10px] text-primary-400 hover:underline"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(a)}
                          className="px-2 py-1 text-[10px] text-primary-400 hover:text-primary-900"
                        >
                          Bearbeiten
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Valuation Modal */}
      {valuationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm bg-white p-6 shadow-xl">
            <h3 className="mb-1 font-display text-base font-semibold text-primary-900">
              Neuer Schätzwert
            </h3>
            <p className="mb-5 text-xs text-primary-400 truncate">
              {valuationModal.artwork.title}
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-primary-600">Wert (CHF)</label>
                <input
                  type="number"
                  value={valForm.value}
                  onChange={(e) => setValForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder="0"
                  autoFocus
                  className="w-full border border-primary-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-primary-600">Datum</label>
                <input
                  type="date"
                  value={valForm.date}
                  onChange={(e) => setValForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full border border-primary-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-primary-600">Notiz (optional)</label>
                <input
                  type="text"
                  value={valForm.notes}
                  onChange={(e) => setValForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="z. B. Gutachten Kunsthalle Basel"
                  className="w-full border border-primary-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setValuationModal(null)}
                className="px-4 py-2 text-sm text-primary-500 hover:text-primary-900"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submitValuation}
                disabled={valSaving || !valForm.value}
                className="bg-primary-900 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50"
              >
                {valSaving ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
