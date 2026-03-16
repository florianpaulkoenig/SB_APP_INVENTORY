// ---------------------------------------------------------------------------
// NOA Inventory -- Catalogue Builder
// Step-based wizard for configuring and generating catalogue PDFs.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Tabs } from '../ui/Tabs';
import { CatalogueArtworkPicker } from './CatalogueArtworkPicker';
import { CataloguePDF } from '../pdf/CataloguePDF';
import type { FieldVisibility } from '../pdf/CataloguePDF';
import { pdf } from '@react-pdf/renderer';
import { downloadBlob, sanitizeStoragePath } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useCatalogues } from '../../hooks/useCatalogues';
import type { CatalogueConfig } from '../../hooks/useCatalogues';
import { useExhibitionImages } from '../../hooks/useExhibitionImages';
import type { ExhibitionImageRow } from '../../hooks/useExhibitionImages';
import { Modal } from '../ui/Modal';
import { SearchInput } from '../ui/SearchInput';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CatalogueBuilderProps {
  initialConfig?: CatalogueConfig;
  catalogueId?: string;
  onGenerated?: () => void;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LayoutType = 'full-page' | 'list';
type Language = 'en' | 'de' | 'fr';
type DividerMode = 'none' | 'series' | 'category';
type DimensionUnit = 'cm' | 'inches';

interface CatalogueSettings {
  // Cover
  title: string;
  subtitle: string;
  coverText: string;
  showDate: boolean;
  showContactDetails: boolean;
  coverImageArtworkId: string | null;

  // Text page
  textPageContent: string;

  // Layout
  layout: LayoutType;
  language: Language;
  dividerMode: DividerMode;
  dimensionUnit: DimensionUnit;
  weightUnit: 'kg' | 'lbs';

  // Field visibility
  showReferenceCode: boolean;
  showMedium: boolean;
  showYear: boolean;
  showDimensions: boolean;
  showWeight: boolean;
  showEdition: boolean;
  showPrice: boolean;
  showSoldDot: boolean;
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
  weight: number | null;
  status: string | null;
  category: string | null;
  series: string | null;
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

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Fran\u00e7ais' },
];

const DIVIDER_OPTIONS = [
  { value: 'none', label: 'No Dividers' },
  { value: 'series', label: 'Group by Series' },
  { value: 'category', label: 'Group by Category' },
];

const DIMENSION_UNIT_OPTIONS = [
  { value: 'cm', label: 'Centimeters (cm)' },
  { value: 'inches', label: 'Inches (in)' },
];

const WEIGHT_UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'lbs', label: 'Pounds (lbs)' },
];

// ---------------------------------------------------------------------------
// Helper: Cover image selector (picks from selected artworks)
// ---------------------------------------------------------------------------

function CoverImageSelector({
  selectedIds,
  coverImageArtworkId,
  onSelect,
}: {
  selectedIds: string[];
  coverImageArtworkId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [artworks, setArtworks] = useState<{ id: string; title: string; imageUrl: string | null }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchArtworks = useCallback(async () => {
    if (selectedIds.length === 0) { setArtworks([]); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('artworks')
        .select('id, title')
        .in('id', selectedIds);

      if (!data) { setArtworks([]); return; }

      // Fetch primary images
      const { data: images } = await supabase
        .from('artwork_images')
        .select('artwork_id, storage_path')
        .in('artwork_id', selectedIds)
        .eq('is_primary', true);

      const imageMap: Record<string, string> = {};
      if (images && images.length > 0) {
        const urlResults = await Promise.all(
          images.map(async (img) => {
            const { data: urlData } = await supabase.storage
              .from('artwork-images')
              .createSignedUrl(img.storage_path, 600);
            return { artworkId: img.artwork_id, url: urlData?.signedUrl ?? null };
          }),
        );
        for (const { artworkId, url } of urlResults) {
          if (url) imageMap[artworkId] = url;
        }
      }

      setArtworks(data.map((a) => ({
        id: a.id,
        title: a.title,
        imageUrl: imageMap[a.id] ?? null,
      })));
    } finally {
      setLoading(false);
    }
  }, [selectedIds]);

  useEffect(() => { fetchArtworks(); }, [fetchArtworks]);

  if (selectedIds.length === 0) {
    return (
      <p className="text-sm text-primary-400">
        Select artworks first (step 2) to choose a cover image.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-primary-400">Loading artwork images...</p>;
  }

  const artworksWithImages = artworks.filter((a) => a.imageUrl);
  if (artworksWithImages.length === 0) {
    return (
      <p className="text-sm text-primary-400">
        No artwork images available. The cover will use a clean white design.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {/* No cover image option */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`flex h-20 w-20 items-center justify-center rounded-lg border-2 text-xs transition-colors ${
            coverImageArtworkId === null
              ? 'border-accent bg-accent/5 text-accent'
              : 'border-primary-200 text-primary-400 hover:border-primary-300'
          }`}
        >
          None
        </button>

        {artworksWithImages.map((aw) => (
          <button
            key={aw.id}
            type="button"
            onClick={() => onSelect(aw.id)}
            className={`h-20 w-20 overflow-hidden rounded-lg border-2 transition-colors ${
              coverImageArtworkId === aw.id
                ? 'border-accent shadow-sm'
                : 'border-primary-200 hover:border-primary-300'
            }`}
            title={aw.title}
          >
            <img
              src={aw.imageUrl!}
              alt={aw.title}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field visibility checkbox
// ---------------------------------------------------------------------------

function FieldCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-primary-300 text-accent focus:ring-accent"
      />
      <span className="text-sm text-primary-700">{label}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Appendix image entry (transient previewUrl for UI only)
// ---------------------------------------------------------------------------

interface AppendixImageEntry {
  storagePath: string;
  caption: string;
  sortOrder: number;
  previewUrl?: string;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB

function AppendixImagesManager({
  images,
  onChange,
}: {
  images: AppendixImageEntry[];
  onChange: (imgs: AppendixImageEntry[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Exhibition image picker state
  const { fetchAllExhibitionImages } = useExhibitionImages(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [exhibitionImgs, setExhibitionImgs] = useState<(ExhibitionImageRow & { exhibition_title: string })[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  async function openExhibitionPicker() {
    setPickerOpen(true);
    setPickerLoading(true);
    const all = await fetchAllExhibitionImages();
    setExhibitionImgs(all);
    setPickerLoading(false);
  }

  function addFromExhibition(img: ExhibitionImageRow & { exhibition_title: string }) {
    // Avoid duplicates by checking storagePath
    if (images.some((existing) => existing.storagePath === img.storage_path)) return;
    const entry: AppendixImageEntry = {
      storagePath: img.storage_path,
      caption: img.caption || '',
      sortOrder: images.length,
      previewUrl: img.signedUrl,
    };
    onChange([...images, entry]);
  }

  const filteredExhibitionImgs = pickerSearch.trim()
    ? exhibitionImgs.filter((img) =>
        img.exhibition_title.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        (img.caption || '').toLowerCase().includes(pickerSearch.toLowerCase()),
      )
    : exhibitionImgs;

  async function handleFiles(files: FileList | File[]) {
    const fileArr = Array.from(files).filter(
      (f) => ACCEPTED_IMAGE_TYPES.includes(f.type) && f.size <= MAX_IMAGE_SIZE,
    );
    if (fileArr.length === 0) return;

    setUploading(true);
    try {
      const newEntries: AppendixImageEntry[] = [];
      for (const file of fileArr) {
        const safeName = sanitizeStoragePath(file.name);
        const path = `catalogue-appendix/${Date.now()}_${Math.random().toString(36).substring(2)}_${safeName}`;

        const { error } = await supabase.storage.from('media-files').upload(path, file);
        if (error) { console.error('Upload failed:', error.message); continue; }

        const { data: urlData } = await supabase.storage
          .from('media-files')
          .createSignedUrl(path, 600);

        newEntries.push({
          storagePath: path,
          caption: '',
          sortOrder: images.length + newEntries.length,
          previewUrl: urlData?.signedUrl ?? undefined,
        });
      }
      if (newEntries.length > 0) {
        onChange([...images, ...newEntries]);
      }
    } finally {
      setUploading(false);
    }
  }

  function handleRemove(index: number) {
    const img = images[index];
    // Only delete from storage if it's a catalogue-appendix upload (not exhibition image reference)
    if (img.storagePath.startsWith('catalogue-appendix/')) {
      supabase.storage.from('media-files').remove([img.storagePath]);
    }
    const updated = images.filter((_, i) => i !== index).map((img, i) => ({ ...img, sortOrder: i }));
    onChange(updated);
  }

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy.map((img, i) => ({ ...img, sortOrder: i })));
  }

  function handleCaptionChange(index: number, caption: string) {
    const copy = [...images];
    copy[index] = { ...copy[index], caption };
    onChange(copy);
  }

  return (
    <div className="space-y-3">
      {/* Image list */}
      {images.map((img, i) => (
        <div key={img.storagePath} className="flex items-start gap-3 rounded-lg border border-primary-200 bg-primary-50/50 p-3">
          {img.previewUrl ? (
            <img src={img.previewUrl} alt={img.caption || 'Appendix image'} className="h-20 w-20 rounded object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded bg-primary-200 text-xs text-primary-400">
              Loading...
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2">
            <input
              type="text"
              value={img.caption}
              onChange={(e) => handleCaptionChange(i, e.target.value)}
              placeholder="Image caption / legend..."
              className="w-full rounded-md border border-primary-300 px-3 py-1.5 text-sm text-primary-900 placeholder-primary-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <div className="flex gap-1">
              <button type="button" onClick={() => handleMove(i, -1)} disabled={i === 0}
                className="rounded px-2 py-0.5 text-xs text-primary-500 hover:bg-primary-100 disabled:opacity-30"
                title="Move up">
                &#9650;
              </button>
              <button type="button" onClick={() => handleMove(i, 1)} disabled={i === images.length - 1}
                className="rounded px-2 py-0.5 text-xs text-primary-500 hover:bg-primary-100 disabled:opacity-30"
                title="Move down">
                &#9660;
              </button>
              <button type="button" onClick={() => handleRemove(i)}
                className="ml-auto rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50"
                title="Remove image">
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Actions: Upload + Browse Exhibition Images */}
      <div className="flex gap-3">
        {/* Drop zone / upload */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
            isDragging ? 'border-accent bg-accent/5' : 'border-primary-300 hover:border-primary-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
          />
          {uploading ? (
            <p className="text-sm text-primary-500">Uploading...</p>
          ) : (
            <>
              <p className="text-sm font-medium text-primary-600">
                Drop images or click to upload
              </p>
              <p className="mt-1 text-xs text-primary-400">JPEG, PNG, WebP (max 20 MB)</p>
            </>
          )}
        </div>

        {/* Browse exhibition images button */}
        <button
          type="button"
          onClick={openExhibitionPicker}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-primary-300 px-6 py-6 text-center transition-colors hover:border-accent hover:bg-accent/5"
        >
          <span className="text-lg mb-1">&#128247;</span>
          <span className="text-sm font-medium text-primary-600">Browse Exhibition Photos</span>
        </button>
      </div>

      {/* Exhibition Image Picker Modal */}
      <Modal isOpen={pickerOpen} onClose={() => setPickerOpen(false)} title="Select from Exhibition Photos">
        <div className="space-y-4">
          <SearchInput
            value={pickerSearch}
            onChange={setPickerSearch}
            placeholder="Search by exhibition name or caption..."
          />

          {pickerLoading ? (
            <p className="text-sm text-primary-400 text-center py-8">Loading exhibition images...</p>
          ) : filteredExhibitionImgs.length === 0 ? (
            <p className="text-sm text-primary-400 text-center py-8">
              {exhibitionImgs.length === 0
                ? 'No exhibition images found. Upload photos on exhibition detail pages first.'
                : 'No images match your search.'}
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                {filteredExhibitionImgs.map((img) => {
                  const alreadyAdded = images.some((ex) => ex.storagePath === img.storage_path);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => addFromExhibition(img)}
                      disabled={alreadyAdded}
                      className={`group relative rounded-lg overflow-hidden border-2 text-left transition-colors ${
                        alreadyAdded
                          ? 'border-green-400 opacity-60 cursor-default'
                          : 'border-primary-200 hover:border-accent cursor-pointer'
                      }`}
                    >
                      {img.signedUrl ? (
                        <img src={img.signedUrl} alt={img.caption || img.file_name} className="w-full aspect-square object-cover" />
                      ) : (
                        <div className="w-full aspect-square bg-primary-100 flex items-center justify-center text-xs text-primary-400">No preview</div>
                      )}
                      <div className="p-2">
                        <p className="text-xs font-medium text-primary-700 truncate">{img.exhibition_title}</p>
                        {img.caption && <p className="text-xs text-primary-400 truncate">{img.caption}</p>}
                      </div>
                      {alreadyAdded && (
                        <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                          &#10003;
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-primary-100">
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="rounded-lg bg-primary-900 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CatalogueBuilder({ initialConfig, catalogueId, onGenerated }: CatalogueBuilderProps) {
  const { saveCatalogue, updateCatalogue } = useCatalogues();
  const [step, setStep] = useState('settings');
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<CatalogueSettings>({
    title: initialConfig?.title ?? '',
    subtitle: initialConfig?.subtitle ?? '',
    coverText: initialConfig?.coverText ?? '',
    showDate: initialConfig?.showDate ?? true,
    showContactDetails: initialConfig?.showContactDetails ?? true,
    coverImageArtworkId: initialConfig?.coverImageArtworkId ?? null,
    textPageContent: initialConfig?.textPageContent ?? '',
    layout: initialConfig?.layout ?? 'full-page',
    language: initialConfig?.language ?? 'en',
    dividerMode: initialConfig?.dividerMode ?? 'none',
    dimensionUnit: initialConfig?.dimensionUnit ?? 'cm',
    weightUnit: initialConfig?.weightUnit ?? 'kg',
    showReferenceCode: initialConfig?.showReferenceCode ?? true,
    showMedium: initialConfig?.showMedium ?? true,
    showYear: initialConfig?.showYear ?? true,
    showDimensions: initialConfig?.showDimensions ?? true,
    showWeight: initialConfig?.showWeight ?? false,
    showEdition: initialConfig?.showEdition ?? true,
    showPrice: initialConfig?.showPrice ?? false,
    showSoldDot: initialConfig?.showSoldDot ?? false,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialConfig?.artworkIds ?? [],
  );
  const [appendixImages, setAppendixImages] = useState<AppendixImageEntry[]>(
    (initialConfig?.appendixImages ?? []).map((img, i) => ({
      ...img,
      sortOrder: img.sortOrder ?? i,
    })),
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve preview URLs for appendix images loaded from saved config
  useEffect(() => {
    if (!initialConfig?.appendixImages?.length) return;
    let cancelled = false;
    (async () => {
      const resolved = await Promise.all(
        initialConfig.appendixImages!.map(async (img) => {
          const { data } = await supabase.storage
            .from('media-files')
            .createSignedUrl(img.storagePath, 600);
          return { ...img, previewUrl: data?.signedUrl ?? undefined };
        }),
      );
      if (!cancelled) setAppendixImages(resolved);
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          'id, title, reference_code, medium, year, height, width, depth, dimension_unit, weight, price, currency, edition_type, edition_number, edition_total, status, category, series',
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
            return { artworkId: img.artwork_id, url: urlData?.signedUrl ?? null };
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
        weight: a.weight ?? null,
        status: a.status ?? null,
        category: a.category,
        series: a.series ?? null,
        imageUrl: imageMap[a.id] ?? null,
      }));

      // Preserve user's selected order
      const idOrder = new Map(selectedIds.map((id, i) => [id, i]));
      catalogueArtworks.sort(
        (a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0),
      );

      // 5. Resolve cover image URL
      let coverImageUrl: string | null = null;
      if (settings.coverImageArtworkId && imageMap[settings.coverImageArtworkId]) {
        coverImageUrl = imageMap[settings.coverImageArtworkId];
      }

      // 6. Resolve appendix image URLs
      const appendixForPdf: { imageUrl: string; caption: string }[] = [];
      if (appendixImages.length > 0) {
        const sorted = [...appendixImages].sort((a, b) => a.sortOrder - b.sortOrder);
        const results = await Promise.all(
          sorted.map(async (img) => {
            const { data } = await supabase.storage
              .from('media-files')
              .createSignedUrl(img.storagePath, 600);
            return { imageUrl: data?.signedUrl ?? null, caption: img.caption };
          }),
        );
        for (const r of results) {
          if (r.imageUrl) appendixForPdf.push({ imageUrl: r.imageUrl, caption: r.caption });
        }
      }

      // 7. Build visibility object
      const visibility: FieldVisibility = {
        showReferenceCode: settings.showReferenceCode,
        showMedium: settings.showMedium,
        showYear: settings.showYear,
        showDimensions: settings.showDimensions,
        showWeight: settings.showWeight,
        showEdition: settings.showEdition,
        showPrice: settings.showPrice,
        showSoldDot: settings.showSoldDot,
      };

      // 8. Generate PDF blob
      const blob = await pdf(
        <CataloguePDF
          title={settings.title}
          subtitle={settings.subtitle || undefined}
          coverText={settings.coverText || undefined}
          showDate={settings.showDate}
          showContactDetails={settings.showContactDetails}
          coverImageUrl={coverImageUrl}
          textPageContent={settings.textPageContent || undefined}
          layout={settings.layout}
          language={settings.language}
          artworks={catalogueArtworks}
          visibility={visibility}
          dividerMode={settings.dividerMode}
          dimensionUnit={settings.dimensionUnit}
          weightUnit={settings.weightUnit}
          appendixImages={appendixForPdf.length > 0 ? appendixForPdf : undefined}
        />,
      ).toBlob();

      // 9. Trigger download
      downloadBlob(blob, `${settings.title.replace(/\s+/g, '_')}_Catalogue.pdf`);

      onGenerated?.();
    } catch (err: unknown) {
      console.error('Catalogue generation error:', err);
      setError('Failed to generate catalogue. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  // ---- Build config for saving -----------------------------------------------

  function buildConfig(): CatalogueConfig {
    return {
      ...settings,
      artworkIds: selectedIds,
      appendixImages: appendixImages.map(({ storagePath, caption, sortOrder }) => ({
        storagePath, caption, sortOrder,
      })),
    };
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Step tabs */}
      <Tabs
        tabs={[...STEPS]}
        activeTab={step}
        onChange={(key) => {
          if (key === 'artworks' && !canProceedToArtworks) return;
          if (key === 'generate' && (!canProceedToArtworks || !canProceedToGenerate)) return;
          setStep(key);
        }}
      />

      {/* ================================================================== */}
      {/* Step 1: Settings                                                   */}
      {/* ================================================================== */}
      {step === 'settings' && (
        <div className="mx-auto max-w-2xl space-y-8">
          {/* ---- Cover Page Section ---- */}
          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-400">
              Cover Page
            </h3>
            <div className="space-y-4 rounded-lg border border-primary-200 bg-white p-5">
              <Input
                label="Title"
                value={settings.title}
                onChange={(e) => updateSetting('title', e.target.value)}
                placeholder="e.g. Spring Exhibition 2026"
                required
              />

              <Input
                label="Subtitle (optional)"
                value={settings.subtitle}
                onChange={(e) => updateSetting('subtitle', e.target.value)}
                placeholder="e.g. A curated selection of recent works"
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-primary-700">
                  Cover Text (optional)
                </label>
                <textarea
                  value={settings.coverText}
                  onChange={(e) => updateSetting('coverText', e.target.value)}
                  placeholder="e.g. Brief exhibition or catalogue introduction..."
                  rows={3}
                  className="w-full rounded-md border border-primary-300 px-3 py-2 text-sm text-primary-900 placeholder-primary-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex gap-6">
                <FieldCheckbox
                  label="Show date"
                  checked={settings.showDate}
                  onChange={(v) => updateSetting('showDate', v)}
                />
                <FieldCheckbox
                  label="Show contact details"
                  checked={settings.showContactDetails}
                  onChange={(v) => updateSetting('showContactDetails', v)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-primary-700">
                  Cover Background Image
                </label>
                <CoverImageSelector
                  selectedIds={selectedIds}
                  coverImageArtworkId={settings.coverImageArtworkId}
                  onSelect={(id) => updateSetting('coverImageArtworkId', id)}
                />
              </div>
            </div>
          </section>

          {/* ---- Text Page Section ---- */}
          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-400">
              Text Page (optional)
            </h3>
            <div className="rounded-lg border border-primary-200 bg-white p-5">
              <textarea
                value={settings.textPageContent}
                onChange={(e) => updateSetting('textPageContent', e.target.value)}
                placeholder="Optional introduction text. Leave empty to skip this page. Use blank lines for paragraph breaks."
                rows={5}
                className="w-full rounded-md border border-primary-300 px-3 py-2 text-sm text-primary-900 placeholder-primary-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </section>

          {/* ---- Layout Section ---- */}
          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-400">
              Layout
            </h3>
            <div className="space-y-4 rounded-lg border border-primary-200 bg-white p-5">
              {/* Layout cards */}
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    {
                      value: 'full-page' as const,
                      label: 'Full Page',
                      description: '1 artwork per page with large image',
                    },
                    {
                      value: 'list' as const,
                      label: 'List',
                      description: 'Compact table with thumbnails',
                    },
                  ]
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
                    <div className="mb-2 flex aspect-[3/4] items-center justify-center rounded bg-primary-50">
                      {opt.value === 'full-page' && (
                        <div className="flex w-3/4 flex-col gap-1">
                          <div className="aspect-[4/3] rounded-sm bg-primary-200" />
                          <div className="h-1.5 w-1/2 rounded-sm bg-primary-200" />
                          <div className="h-1 w-1/3 rounded-sm bg-primary-100" />
                        </div>
                      )}
                      {opt.value === 'list' && (
                        <div className="flex w-3/4 flex-col gap-0.5">
                          <div className="h-2 w-full rounded-sm bg-primary-300" />
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex h-2 gap-0.5">
                              <div className="aspect-square h-full rounded-sm bg-primary-200" />
                              <div className="flex-1 rounded-sm bg-primary-100" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-primary-900">{opt.label}</p>
                    <p className="text-xs text-primary-400">{opt.description}</p>
                  </button>
                ))}
              </div>

              {/* Language */}
              <Select
                label="Language"
                options={LANGUAGE_OPTIONS}
                value={settings.language}
                onChange={(e) => updateSetting('language', e.target.value as Language)}
              />

              {/* Section dividers */}
              <Select
                label="Section Dividers"
                options={DIVIDER_OPTIONS}
                value={settings.dividerMode}
                onChange={(e) => updateSetting('dividerMode', e.target.value as DividerMode)}
              />

              {/* Dimension & weight units */}
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Dimensions Unit"
                  options={DIMENSION_UNIT_OPTIONS}
                  value={settings.dimensionUnit}
                  onChange={(e) => updateSetting('dimensionUnit', e.target.value as DimensionUnit)}
                />
                <Select
                  label="Weight Unit"
                  options={WEIGHT_UNIT_OPTIONS}
                  value={settings.weightUnit}
                  onChange={(e) => updateSetting('weightUnit', e.target.value as 'kg' | 'lbs')}
                />
              </div>
            </div>
          </section>

          {/* ---- Visible Information Section ---- */}
          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-400">
              Visible Information
            </h3>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-primary-200 bg-white p-5 sm:grid-cols-3">
              <FieldCheckbox
                label="Reference Code"
                checked={settings.showReferenceCode}
                onChange={(v) => updateSetting('showReferenceCode', v)}
              />
              <FieldCheckbox
                label="Medium / Technique"
                checked={settings.showMedium}
                onChange={(v) => updateSetting('showMedium', v)}
              />
              <FieldCheckbox
                label="Year"
                checked={settings.showYear}
                onChange={(v) => updateSetting('showYear', v)}
              />
              <FieldCheckbox
                label="Dimensions"
                checked={settings.showDimensions}
                onChange={(v) => updateSetting('showDimensions', v)}
              />
              <FieldCheckbox
                label="Weight"
                checked={settings.showWeight}
                onChange={(v) => updateSetting('showWeight', v)}
              />
              <FieldCheckbox
                label="Edition"
                checked={settings.showEdition}
                onChange={(v) => updateSetting('showEdition', v)}
              />
              <FieldCheckbox
                label="Price"
                checked={settings.showPrice}
                onChange={(v) => updateSetting('showPrice', v)}
              />
              <FieldCheckbox
                label="Sold Dot"
                checked={settings.showSoldDot}
                onChange={(v) => updateSetting('showSoldDot', v)}
              />
            </div>
          </section>

          {/* ---- Appendix Images Section ---- */}
          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary-400">
              Appendix Images (optional)
            </h3>
            <div className="rounded-lg border border-primary-200 bg-white p-5">
              <p className="mb-4 text-sm text-primary-500">
                Add images that appear at the end of the catalogue — installation views, exhibition photos, detail shots, etc.
                Each image gets its own full-width page with an optional caption.
              </p>
              <AppendixImagesManager images={appendixImages} onChange={setAppendixImages} />
            </div>
          </section>

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
                <dd className="text-sm font-medium text-primary-900">{settings.title}</dd>
              </div>

              {settings.subtitle && (
                <div className="flex justify-between py-2">
                  <dt className="text-sm text-primary-500">Subtitle</dt>
                  <dd className="text-sm font-medium text-primary-900">{settings.subtitle}</dd>
                </div>
              )}

              <div className="flex justify-between py-2">
                <dt className="text-sm text-primary-500">Layout</dt>
                <dd className="text-sm font-medium text-primary-900">
                  {settings.layout === 'full-page' ? 'Full Page' : 'List'}
                </dd>
              </div>

              <div className="flex justify-between py-2">
                <dt className="text-sm text-primary-500">Language</dt>
                <dd className="text-sm font-medium text-primary-900">
                  {LANGUAGE_OPTIONS.find((o) => o.value === settings.language)?.label ?? settings.language}
                </dd>
              </div>

              <div className="flex justify-between py-2">
                <dt className="text-sm text-primary-500">Cover Image</dt>
                <dd className="text-sm font-medium text-primary-900">
                  {settings.coverImageArtworkId ? 'Yes' : 'None (white)'}
                </dd>
              </div>

              <div className="flex justify-between py-2">
                <dt className="text-sm text-primary-500">Text Page</dt>
                <dd className="text-sm font-medium text-primary-900">
                  {settings.textPageContent.trim() ? 'Yes' : 'No'}
                </dd>
              </div>

              <div className="flex justify-between py-2">
                <dt className="text-sm text-primary-500">Section Dividers</dt>
                <dd className="text-sm font-medium text-primary-900">
                  {DIVIDER_OPTIONS.find((o) => o.value === settings.dividerMode)?.label ?? 'None'}
                </dd>
              </div>

              <div className="flex justify-between py-2">
                <dt className="text-sm text-primary-500">Dimensions</dt>
                <dd className="text-sm font-medium text-primary-900">
                  {settings.dimensionUnit === 'inches' ? 'Inches' : 'Centimeters'}
                </dd>
              </div>

              <div className="flex justify-between py-2">
                <dt className="text-sm text-primary-500">Visible Fields</dt>
                <dd className="text-right text-sm text-primary-900">
                  {[
                    settings.showReferenceCode && 'Ref',
                    settings.showMedium && 'Medium',
                    settings.showYear && 'Year',
                    settings.showDimensions && 'Dimensions',
                    settings.showWeight && 'Weight',
                    settings.showEdition && 'Edition',
                    settings.showPrice && 'Price',
                    settings.showSoldDot && 'Sold Dot',
                  ].filter(Boolean).join(', ') || 'None'}
                </dd>
              </div>

              <div className="flex justify-between py-2">
                <dt className="text-sm text-primary-500">Artworks</dt>
                <dd className="text-sm font-medium text-primary-900">
                  {selectedIds.length} selected
                </dd>
              </div>

              {appendixImages.length > 0 && (
                <div className="flex justify-between py-2">
                  <dt className="text-sm text-primary-500">Appendix Images</dt>
                  <dd className="text-sm font-medium text-primary-900">
                    {appendixImages.length} image{appendixImages.length !== 1 ? 's' : ''}
                  </dd>
                </div>
              )}
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

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={async () => {
                  setSaving(true);
                  const config = buildConfig();
                  if (catalogueId) {
                    await updateCatalogue(catalogueId, { name: settings.title, config });
                  } else {
                    await saveCatalogue({ name: settings.title, config });
                  }
                  setSaving(false);
                }}
                loading={saving}
                disabled={saving || generating}
              >
                {catalogueId ? 'Save Changes' : 'Save Catalogue'}
              </Button>

              <Button
                onClick={handleGenerate}
                loading={generating}
                disabled={generating}
              >
                {generating ? 'Generating PDF...' : 'Generate PDF'}
              </Button>
            </div>
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
