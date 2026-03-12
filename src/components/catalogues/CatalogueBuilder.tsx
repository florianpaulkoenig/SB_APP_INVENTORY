// ---------------------------------------------------------------------------
// NOA Inventory -- Catalogue Builder
// Step-based wizard for configuring and generating catalogue PDFs.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Tabs } from '../ui/Tabs';
import { CatalogueArtworkPicker } from './CatalogueArtworkPicker';
import { CataloguePDF } from '../pdf/CataloguePDF';
import { pdf } from '@react-pdf/renderer';
import { downloadBlob } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CatalogueBuilderProps {
  onGenerated?: () => void;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CatalogueType = 'exhibition' | 'collector' | 'gallery';
type LayoutType = 'grid-2' | 'grid-4' | 'full-page';
type Language = 'en' | 'de' | 'fr';

interface CatalogueSettings {
  title: string;
  subtitle: string;
  catalogueType: CatalogueType;
  layout: LayoutType;
  language: Language;
  showPrices: boolean;
}

// Full artwork data fetched for PDF generation
interface CatalogueArtwork {
  id: string;
  title: string;
  reference_code: string;
  medium: string | null;
  year: number | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  dimension_unit: string;
  price: number | null;
  currency: string;
  edition_type: string;
  edition_number: number | null;
  edition_total: number | null;
  category: string | null;
  imageUrl: string | null;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const STEPS = [
  { key: 'settings', label: '1. Settings' },
  { key: 'artworks', label: '2. Artworks' },
  { key: 'generate', label: '3. Generate' },
] as const;

// ---------------------------------------------------------------------------
// Select options
// ---------------------------------------------------------------------------

const CATALOGUE_TYPE_OPTIONS = [
  { value: 'exhibition', label: 'Exhibition Catalogue' },
  { value: 'collector', label: 'Collector Portfolio' },
  { value: 'gallery', label: 'Gallery Presentation' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Fran\u00e7ais' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CatalogueBuilder({ onGenerated }: CatalogueBuilderProps) {
  // ---- State ----------------------------------------------------------------

  const [step, setStep] = useState('settings');

  const [settings, setSettings] = useState<CatalogueSettings>({
    title: '',
    subtitle: '',
    catalogueType: 'exhibition',
    layout: 'grid-2',
    language: 'en',
    showPrices: false,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Settings helpers -----------------------------------------------------

  function updateSetting<K extends keyof CatalogueSettings>(
    key: K,
    value: CatalogueSettings[K],
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  // ---- Validation -----------------------------------------------------------

  const canProceedToArtworks = settings.title.trim().length > 0;
  const canProceedToGenerate = selectedIds.length > 0;

  // ---- PDF generation -------------------------------------------------------

  async function handleGenerate() {
    setGenerating(true);
    setError(null);

    try {
      // 1. Fetch full artwork data for selected IDs
      const { data: artworksData, error: fetchError } = await supabase
        .from('artworks')
        .select(
          'id, title, reference_code, medium, year, height, width, depth, dimension_unit, price, currency, edition_type, edition_number, edition_total, category',
        )
        .in('id', selectedIds);

      if (fetchError) throw new Error(fetchError.message);
      if (!artworksData || artworksData.length === 0)
        throw new Error('No artwork data found.');

      // 2. Fetch primary images
      const { data: images } = await supabase
        .from('artwork_images')
        .select('artwork_id, storage_path')
        .in('artwork_id', selectedIds)
        .eq('is_primary', true);

      // 3. Generate signed URLs
      const imageMap: Record<string, string> = {};

      if (images && images.length > 0) {
        const urlResults = await Promise.all(
          images.map(async (img) => {
            const { data: urlData } = await supabase.storage
              .from('artwork-images')
              .createSignedUrl(img.storage_path, 600);
            return {
              artworkId: img.artwork_id,
              url: urlData?.signedUrl ?? null,
            };
          }),
        );

        for (const { artworkId, url } of urlResults) {
          if (url) imageMap[artworkId] = url;
        }
      }

      // 4. Map to CatalogueArtwork shape
      const catalogueArtworks: CatalogueArtwork[] = artworksData.map((a) => ({
        id: a.id,
        title: a.title,
        reference_code: a.reference_code,
        medium: a.medium,
        year: a.year,
        height: a.height,
        width: a.width,
        depth: a.depth,
        dimension_unit: a.dimension_unit ?? 'cm',
        price: a.price,
        currency: a.currency ?? 'EUR',
        edition_type: a.edition_type ?? 'unique',
        edition_number: a.edition_number,
        edition_total: a.edition_total,
        category: a.category,
        imageUrl: imageMap[a.id] ?? null,
      }));

      // Preserve user's selected order
      const idOrder = new Map(selectedIds.map((id, i) => [id, i]));
      catalogueArtworks.sort(
        (a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0),
      );

      // 5. Generate PDF blob
      const blob = await pdf(
        <CataloguePDF
          title={settings.title}
          subtitle={settings.subtitle || undefined}
          catalogueType={settings.catalogueType}
          layout={settings.layout}
          language={settings.language}
          showPrices={settings.showPrices}
          artworks={catalogueArtworks}
        />,
      ).toBlob();

      // 6. Trigger download
      downloadBlob(blob, `${settings.title.replace(/\s+/g, '_')}_Catalogue.pdf`);

      onGenerated?.();
    } catch (err: unknown) {
      setError('Failed to generate catalogue. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Step tabs */}
      <Tabs
        tabs={[...STEPS]}
        activeTab={step}
        onChange={(key) => {
          // Only allow navigating to steps that are reachable
          if (key === 'artworks' && !canProceedToArtworks) return;
          if (key === 'generate' && (!canProceedToArtworks || !canProceedToGenerate)) return;
          setStep(key);
        }}
      />

      {/* ================================================================== */}
      {/* Step 1: Settings                                                   */}
      {/* ================================================================== */}
      {step === 'settings' && (
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Title */}
          <Input
            label="Title"
            value={settings.title}
            onChange={(e) => updateSetting('title', e.target.value)}
            placeholder="e.g. Spring Exhibition 2026"
            required
          />

          {/* Subtitle */}
          <Input
            label="Subtitle (optional)"
            value={settings.subtitle}
            onChange={(e) => updateSetting('subtitle', e.target.value)}
            placeholder="e.g. A curated selection of recent works"
          />

          {/* Catalogue type */}
          <Select
            label="Catalogue Type"
            options={CATALOGUE_TYPE_OPTIONS}
            value={settings.catalogueType}
            onChange={(e) =>
              updateSetting('catalogueType', e.target.value as CatalogueType)
            }
          />

          {/* Layout */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary-700">
              Layout
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  {
                    value: 'grid-2',
                    label: '2-Column Grid',
                    description: '2 artworks per row',
                  },
                  {
                    value: 'grid-4',
                    label: '4-Column Grid',
                    description: '4 artworks per row',
                  },
                  {
                    value: 'full-page',
                    label: 'Full Page',
                    description: '1 artwork per page',
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateSetting('layout', opt.value)}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    settings.layout === opt.value
                      ? 'border-accent bg-accent/5'
                      : 'border-primary-200 hover:border-primary-300'
                  }`}
                >
                  {/* Visual preview */}
                  <div className="mb-2 flex aspect-[3/4] items-center justify-center rounded bg-primary-50">
                    {opt.value === 'grid-2' && (
                      <div className="grid w-3/4 grid-cols-2 gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="aspect-square rounded-sm bg-primary-200"
                          />
                        ))}
                      </div>
                    )}
                    {opt.value === 'grid-4' && (
                      <div className="grid w-3/4 grid-cols-4 gap-0.5">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <div
                            key={i}
                            className="aspect-square rounded-sm bg-primary-200"
                          />
                        ))}
                      </div>
                    )}
                    {opt.value === 'full-page' && (
                      <div className="flex w-3/4 flex-col gap-1">
                        <div className="aspect-[4/3] rounded-sm bg-primary-200" />
                        <div className="h-2 w-1/2 rounded-sm bg-primary-200" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-primary-900">
                    {opt.label}
                  </p>
                  <p className="text-xs text-primary-400">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <Select
            label="Language"
            options={LANGUAGE_OPTIONS}
            value={settings.language}
            onChange={(e) =>
              updateSetting('language', e.target.value as Language)
            }
          />

          {/* Show prices */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.showPrices}
              onChange={(e) => updateSetting('showPrices', e.target.checked)}
              className="h-4 w-4 rounded border-primary-300 text-accent focus:ring-accent"
            />
            <span className="text-sm font-medium text-primary-700">
              Show prices in catalogue
            </span>
          </label>

          {/* Next */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setStep('artworks')}
              disabled={!canProceedToArtworks}
            >
              Next: Select Artworks
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Step 2: Select Artworks                                            */}
      {/* ================================================================== */}
      {step === 'artworks' && (
        <div className="space-y-4">
          <CatalogueArtworkPicker
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep('settings')}>
              Back
            </Button>
            <Button
              onClick={() => setStep('generate')}
              disabled={!canProceedToGenerate}
            >
              Next: Preview & Generate
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Step 3: Preview & Generate                                         */}
      {/* ================================================================== */}
      {step === 'generate' && (
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Summary card */}
          <div className="rounded-lg border border-primary-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-primary-900">
              Catalogue Summary
            </h3>

            <dl className="divide-y divide-primary-100">
              <div className="flex justify-between py-2">
                <dt className="text-sm text-primary-500">Title</dt>
                <dd className="text-sm font-medium text-primary-900">
                  {settings.title}
                </dd>
              </div>

              {settings.subtitle && (
                <div className="flex justify-between py-2">
                  <dt className="text-sm text-primary-500">Subtitle</dt>
                  <dd className="text-sm font-medium text-primary-900">
                    {settings.subtitle}
                  </dd>
                </div>
              )}

              <div className="flex justify-between py-2">
                <dt className="text-sm text-primary-500">Type</dt>
                <dd className="text-sm font-medium text-primary-900">
                  {CATALOGUE_TYPE_OPTIONS.find(
                    (o) => o.value === settings.catalogueType,
                  )?.label ?? settings.catalogueType}
                </dd>
              </div>

              <div className="flex justify-between py-2">
                <dt className="text-sm text-primary-500">Layout</dt>
                <dd className="text-sm font-medium text-primary-900">
                  {settings.layout === 'grid-2'
                    ? '2-Column Grid'
                    : settings.layout === 'grid-4'
                      ? '4-Column Grid'
                      : 'Full Page'}
                </dd>
              </div>

              <div className="flex justify-between py-2">
                <dt className="text-sm text-primary-500">Language</dt>
                <dd className="text-sm font-medium text-primary-900">
                  {LANGUAGE_OPTIONS.find((o) => o.value === settings.language)
                    ?.label ?? settings.language}
                </dd>
              </div>

              <div className="flex justify-between py-2">
                <dt className="text-sm text-primary-500">Show Prices</dt>
                <dd className="text-sm font-medium text-primary-900">
                  {settings.showPrices ? 'Yes' : 'No'}
                </dd>
              </div>

              <div className="flex justify-between py-2">
                <dt className="text-sm text-primary-500">Artworks</dt>
                <dd className="text-sm font-medium text-primary-900">
                  {selectedIds.length} selected
                </dd>
              </div>
            </dl>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep('artworks')}>
              Back
            </Button>

            <Button
              onClick={handleGenerate}
              loading={generating}
              disabled={generating}
            >
              {generating ? 'Generating PDF...' : 'Generate PDF'}
            </Button>
          </div>

          {/* Progress hint */}
          {generating && (
            <div className="text-center">
              <p className="text-sm text-primary-500">
                Fetching artwork data and generating your catalogue. This may
                take a moment for large selections...
              </p>
              <div className="mx-auto mt-3 h-1 w-48 overflow-hidden rounded-full bg-primary-100">
                <div className="h-full animate-pulse rounded-full bg-accent" style={{ width: '60%' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
