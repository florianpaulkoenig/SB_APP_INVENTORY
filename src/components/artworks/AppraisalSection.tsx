// ---------------------------------------------------------------------------
// NOA Inventory -- Artwork Appraisal Section
// Displays existing appraisals + form for creating a new one.
// Embedded in ArtworkDetailPage below the COA section.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '../../lib/supabase';
import { getSignedUrl } from '../../lib/signedUrlCache';
import { AppraisalPDF } from '../pdf/AppraisalPDF';
import { useDocumentNumber } from '../../hooks/useDocumentNumber';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { DOC_PREFIXES, CURRENCIES } from '../../lib/constants';
import { formatDate, formatCurrency, downloadBlob } from '../../lib/utils';
import type { ArtworkAppraisalRow, AppraisalPurpose } from '../../types/database';

// ---------------------------------------------------------------------------
// Types / constants
// ---------------------------------------------------------------------------

type Language = 'en' | 'de' | 'fr';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
] as const;

const PURPOSE_OPTIONS: { value: AppraisalPurpose; label: string }[] = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'resale', label: 'Resale' },
  { value: 'estate', label: 'Estate' },
  { value: 'donation', label: 'Donation' },
  { value: 'other', label: 'Other' },
];

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c.value, label: c.label }));

const PURPOSE_LABELS: Record<AppraisalPurpose, string> = {
  insurance: 'Insurance',
  resale: 'Resale',
  estate: 'Estate',
  donation: 'Donation',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AppraisalSectionProps {
  artworkId: string;
  artwork: {
    title: string;
    reference_code: string;
    medium: string | null;
    year: number | null;
    height: number | null;
    width: number | null;
    depth: number | null;
    dimension_unit: string;
    edition_type: string;
    edition_number: number | null;
    edition_total: number | null;
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AppraisalSection({ artworkId, artwork }: AppraisalSectionProps) {
  const { generateNumber } = useDocumentNumber();
  const { toast } = useToast();

  // List of existing appraisals
  const [appraisals, setAppraisals] = useState<ArtworkAppraisalRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Create-form visibility
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [appraisedValue, setAppraisedValue] = useState('');
  const [currency, setCurrency] = useState('CHF');
  const [appraisalDate, setAppraisalDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState<AppraisalPurpose>('insurance');
  const [appraiserName, setAppraiserName] = useState('NOA Contemporary');
  const [appraiserCredentials, setAppraiserCredentials] = useState('');
  const [condition, setCondition] = useState('');
  const [notes, setNotes] = useState('');

  // Generation / download state
  const [creating, setCreating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');

  // ---- Fetch appraisals -------------------------------------------------------

  const fetchAppraisals = useCallback(async () => {
    setLoadingList(true);
    const { data } = await supabase
      .from('artwork_appraisals' as never)
      .select('*')
      .eq('artwork_id', artworkId)
      .order('appraisal_date', { ascending: false });
    setAppraisals((data ?? []) as ArtworkAppraisalRow[]);
    setLoadingList(false);
  }, [artworkId]);

  useEffect(() => {
    fetchAppraisals();
  }, [fetchAppraisals]);

  // ---- Helpers for artwork image / signature ----------------------------------

  async function getArtworkImageUrl(): Promise<string | null> {
    const { data: img } = await supabase
      .from('artwork_images')
      .select('storage_path')
      .eq('artwork_id', artworkId)
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle();
    if (!img?.storage_path) return null;
    return await getSignedUrl('artwork-images', img.storage_path);
  }

  // Uses appraiser_signature.png (gallery owner / NOA Contemporary signatory),
  // NOT the artist's signature.png used on COAs.
  async function getSignatureUrl(): Promise<string | null> {
    try {
      const { data: sigBlob, error } = await supabase.storage
        .from('assets')
        .download('appraiser_signature.png');
      if (!sigBlob || error) return null;
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(sigBlob);
      });
    } catch {
      return null;
    }
  }

  // ---- Create new appraisal ---------------------------------------------------

  async function handleCreate() {
    const valueNum = parseFloat(appraisedValue);
    if (!appraisedValue || isNaN(valueNum) || valueNum <= 0) {
      toast({ title: 'Invalid value', description: 'Please enter a valid appraised value.', variant: 'error' });
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const appraisalNumber = await generateNumber(DOC_PREFIXES.appraisal);
      if (!appraisalNumber) return;

      const { data, error } = await supabase
        .from('artwork_appraisals' as never)
        .insert({
          user_id: session.user.id,
          artwork_id: artworkId,
          appraisal_number: appraisalNumber,
          appraised_value: valueNum,
          currency,
          appraisal_date: appraisalDate,
          purpose,
          appraiser_name: appraiserName.trim() || 'NOA Contemporary',
          appraiser_credentials: appraiserCredentials.trim() || null,
          condition: condition.trim() || null,
          notes: notes.trim() || null,
        } as never)
        .select('*')
        .single();

      if (error) {
        toast({ title: 'Error', description: 'Could not save appraisal.', variant: 'error' });
        return;
      }

      const newAppraisal = data as ArtworkAppraisalRow;
      setAppraisals((prev) => [newAppraisal, ...prev]);

      toast({ title: 'Appraisal created', variant: 'success' });

      // Reset form
      setShowForm(false);
      setAppraisedValue('');
      setCurrency('CHF');
      setAppraisalDate(new Date().toISOString().split('T')[0]);
      setPurpose('insurance');
      setAppraiserName('NOA Contemporary');
      setAppraiserCredentials('');
      setCondition('');
      setNotes('');

      // Auto-download PDF
      await downloadAppraisalPdf(newAppraisal);
    } finally {
      setCreating(false);
    }
  }

  // ---- Download PDF for an appraisal ------------------------------------------

  async function downloadAppraisalPdf(appraisal: ArtworkAppraisalRow) {
    setDownloadingId(appraisal.id);
    try {
      const [artworkImageUrl, signatureUrl] = await Promise.all([
        getArtworkImageUrl(),
        getSignatureUrl(),
      ]);

      const blob = await pdf(
        <AppraisalPDF
          artwork={artwork}
          appraisal={appraisal}
          artworkImageUrl={artworkImageUrl}
          signatureUrl={signatureUrl}
          language={language}
        />,
      ).toBlob();

      const purposeSuffix = PURPOSE_LABELS[appraisal.purpose] ?? appraisal.purpose;
      downloadBlob(
        blob,
        `Appraisal_${artwork.reference_code}_${purposeSuffix}_${appraisal.appraisal_number}.pdf`,
      );
    } finally {
      setDownloadingId(null);
    }
  }

  // ---- Delete an appraisal ----------------------------------------------------

  async function handleDelete(appraisalId: string) {
    const { error } = await supabase
      .from('artwork_appraisals' as never)
      .delete()
      .eq('id', appraisalId);

    if (error) {
      toast({ title: 'Error', description: 'Could not delete appraisal.', variant: 'error' });
      return;
    }

    setAppraisals((prev) => prev.filter((a) => a.id !== appraisalId));
    toast({ title: 'Appraisal deleted', variant: 'success' });
  }

  // ---- Render -----------------------------------------------------------------

  return (
    <section className="mt-8 rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-primary-900">
          Artwork Appraisal
        </h2>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Appraisal
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 rounded-lg border border-primary-100 bg-primary-50 p-4">
          <h3 className="mb-4 text-sm font-semibold text-primary-700">New Appraisal</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 grid grid-cols-2 gap-3">
              <Input
                label="Appraised Value *"
                type="number"
                min="0"
                step="100"
                value={appraisedValue}
                onChange={(e) => setAppraisedValue(e.target.value)}
                placeholder="e.g. 25000"
              />
              <Select
                label="Currency"
                options={CURRENCY_OPTIONS}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>
            <Select
              label="Purpose"
              options={PURPOSE_OPTIONS}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as AppraisalPurpose)}
            />
            <Input
              label="Appraisal Date"
              type="date"
              value={appraisalDate}
              onChange={(e) => setAppraisalDate(e.target.value)}
            />
            <Input
              label="Appraiser"
              value={appraiserName}
              onChange={(e) => setAppraiserName(e.target.value)}
              placeholder="NOA Contemporary"
            />
            <Input
              label="Credentials (optional)"
              value={appraiserCredentials}
              onChange={(e) => setAppraiserCredentials(e.target.value)}
              placeholder="e.g. Certified Art Appraiser"
            />
            <div className="sm:col-span-2">
              <Input
                label="Condition (optional)"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="e.g. Excellent — no visible damage"
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Internal Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for this appraisal…"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleCreate} loading={creating}>
              Generate & Download PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setAppraisedValue('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Language selector (affects PDF download for existing appraisals) */}
      {appraisals.length > 0 && (
        <div className="mb-4 w-48">
          <Select
            label="PDF Language"
            options={[...LANGUAGE_OPTIONS]}
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          />
        </div>
      )}

      {/* Appraisals list */}
      {loadingList ? (
        <p className="text-sm text-primary-400">Loading…</p>
      ) : appraisals.length === 0 && !showForm ? (
        <p className="text-sm text-primary-400">No appraisals yet. Click "New Appraisal" to create one.</p>
      ) : (
        <div className="space-y-3">
          {appraisals.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-primary-100 bg-white p-3"
            >
              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-primary-900">{a.appraisal_number}</span>
                  <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-600">
                    {PURPOSE_LABELS[a.purpose] ?? a.purpose}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-primary-500">
                  {formatDate(a.appraisal_date)} · {formatCurrency(a.appraised_value, a.currency)}
                </p>
                {a.appraiser_name && (
                  <p className="text-xs text-primary-400">{a.appraiser_name}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadAppraisalPdf(a)}
                  loading={downloadingId === a.id}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  PDF
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(a.id)}
                >
                  <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
