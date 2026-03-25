import { useState, useCallback, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { GallerySelect } from '../galleries/GallerySelect';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '../ui/UnsavedChangesDialog';
import {
  ARTWORK_STATUSES,
  ARTWORK_CATEGORIES,
  ARTWORK_MOTIFS,
  ARTWORK_SERIES,
  ARTWORK_COLORS,
  EDITION_TYPES,
  CURRENCIES,
  DIMENSION_UNITS,
} from '../../lib/constants';
import type {
  ArtworkRow,
  ArtworkInsert,
  ArtworkStatus,
  ArtworkCategory,
  ArtworkMotif,
  ArtworkSeries,
  ArtworkColor,
  DimensionUnit,
  Currency,
  EditionType,
} from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkFormProps {
  /** Pass an existing artwork to pre-fill for editing */
  artwork?: ArtworkRow;
  /** Pre-fill from a template (does NOT enable edit mode) */
  defaultValues?: Partial<ArtworkInsert>;
  /** Pre-generated inventory number for new artworks */
  inventoryNumber?: string;
  /** Pre-generated reference code for new artworks */
  referenceCode?: string;
  onSubmit: (data: ArtworkInsert) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const STEPS = [
  { number: 1, label: 'Basics & Image' },
  { number: 2, label: 'Dimensions' },
  { number: 3, label: 'Edition & Pricing' },
  { number: 4, label: 'Gallery & Notes' },
] as const;

// ---------------------------------------------------------------------------
// Step indicator component
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const isLast = idx === STEPS.length - 1;

          return (
            <li key={step.number} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              {/* Circle + label */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                    isCompleted
                      ? 'border-primary-900 bg-primary-900 text-white'
                      : isActive
                        ? 'border-primary-900 bg-white text-primary-900'
                        : 'border-primary-200 bg-white text-primary-300'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                    isActive || isCompleted ? 'text-primary-900' : 'text-primary-300'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={`mx-2 mt-[-1.25rem] h-0.5 flex-1 transition-colors ${
                    isCompleted ? 'bg-primary-900' : 'bg-primary-200'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Section header helper
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-400 mb-3">
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtworkForm({
  artwork,
  defaultValues: dv,
  inventoryNumber,
  referenceCode,
  onSubmit,
  onCancel,
  loading = false,
}: ArtworkFormProps) {
  const isEdit = Boolean(artwork);

  // Helper: pick from artwork first, then defaultValues, then fallback
  const v = artwork ?? dv;

  // ---- Wizard step state ---------------------------------------------------

  const [currentStep, setCurrentStep] = useState(1);

  // ---- Dirty tracking -------------------------------------------------------

  const [isDirty, setIsDirty] = useState(false);
  const markDirty = useCallback(() => setIsDirty(true), []);

  const { blocker } = useUnsavedChanges(isDirty);

  // ---- Form state -----------------------------------------------------------

  // Basic info
  const [title, setTitle] = useState(v?.title ?? '');
  const [year, setYear] = useState(v?.year != null ? String(v.year) : '');
  const [medium, setMedium] = useState(v?.medium ?? '');

  // Classification
  const [category, setCategory] = useState(v?.category ?? '');
  const [motif, setMotif] = useState(v?.motif ?? '');
  const [series, setSeries] = useState(v?.series ?? '');
  const [color, setColor] = useState(v?.color ?? 'green');

  // Dimensions (unframed)
  const [height, setHeight] = useState(v?.height != null ? String(v.height) : '');
  const [width, setWidth] = useState(v?.width != null ? String(v.width) : '');
  const [depth, setDepth] = useState(v?.depth != null ? String(v.depth) : '');
  const [dimensionUnit, setDimensionUnit] = useState<string>(v?.dimension_unit ?? 'cm');

  // Dimensions (framed)
  const [framedHeight, setFramedHeight] = useState(
    v?.framed_height != null ? String(v.framed_height) : '',
  );
  const [framedWidth, setFramedWidth] = useState(
    v?.framed_width != null ? String(v.framed_width) : '',
  );
  const [framedDepth, setFramedDepth] = useState(
    v?.framed_depth != null ? String(v.framed_depth) : '',
  );
  const [weight, setWeight] = useState(v?.weight != null ? String(v.weight) : '');

  // Edition
  const [editionType, setEditionType] = useState<string>(v?.edition_type ?? 'unique');
  const [editionNumber, setEditionNumber] = useState(
    v?.edition_number != null ? String(v.edition_number) : '',
  );
  const [editionTotal, setEditionTotal] = useState(
    v?.edition_total != null ? String(v.edition_total) : '',
  );
  const [isUnique, setIsUnique] = useState(artwork?.is_unique ?? (v?.edition_type === 'unique' || v?.edition_type == null));

  // Price & status
  const [price, setPrice] = useState(v?.price != null ? String(v.price) : '');
  const [currency, setCurrency] = useState<string>(v?.currency ?? 'EUR');
  const [status, setStatus] = useState<string>(v?.status ?? 'available');

  // Location & gallery
  const [currentLocation, setCurrentLocation] = useState(artwork?.current_location ?? '');
  const [galleryId, setGalleryId] = useState<string | null>(v?.gallery_id ?? null);

  // Commission split
  const [commissionGallery, setCommissionGallery] = useState(
    artwork?.commission_gallery != null ? String(artwork.commission_gallery) : '',
  );
  const [commissionNoa, setCommissionNoa] = useState(
    artwork?.commission_noa != null ? String(artwork.commission_noa) : '',
  );
  const [commissionArtist, setCommissionArtist] = useState(
    artwork?.commission_artist != null ? String(artwork.commission_artist) : '',
  );

  // Partner availability
  const [availableForPartners, setAvailableForPartners] = useState(v?.available_for_partners ?? false);

  // Notes
  const [notes, setNotes] = useState(v?.notes ?? '');

  // Resolved inventory number & reference code
  const displayInventoryNumber = artwork?.inventory_number ?? inventoryNumber ?? '';
  const displayReferenceCode = artwork?.reference_code ?? referenceCode ?? '';

  // ---- Derived state --------------------------------------------------------

  // Auto-sync isUnique when editionType changes
  function handleEditionTypeChange(value: string) {
    setEditionType(value);
    if (value === 'unique') {
      setIsUnique(true);
      setEditionNumber('');
      setEditionTotal('');
    } else {
      setIsUnique(false);
    }
  }

  // ---- Validation -----------------------------------------------------------

  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Validate all fields (used on final submit) */
  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!title.trim()) {
      next.title = 'Title is required';
    }

    if (year !== '') {
      const y = parseInt(year, 10);
      if (isNaN(y) || y < 1000 || y > 9999) {
        next.year = 'Please enter a valid four-digit year';
      }
    }

    if (editionType === 'numbered') {
      if (!editionNumber.trim()) {
        next.editionNumber = 'Edition number is required for numbered editions';
      }
      if (!editionTotal.trim()) {
        next.editionTotal = 'Edition total is required for numbered editions';
      }
      if (editionNumber && editionTotal) {
        const num = parseInt(editionNumber, 10);
        const total = parseInt(editionTotal, 10);
        if (isNaN(num) || num < 1) {
          next.editionNumber = 'Must be a positive number';
        }
        if (isNaN(total) || total < 1) {
          next.editionTotal = 'Must be a positive number';
        }
        if (!isNaN(num) && !isNaN(total) && num > total) {
          next.editionNumber = 'Edition number cannot exceed edition total';
        }
      }
    }

    if (price !== '') {
      const p = parseFloat(price);
      if (isNaN(p) || p < 0) {
        next.price = 'Price must be a positive number';
      }
    }

    // Validate dimensions are non-negative
    for (const [key, val] of [['height', height], ['width', width], ['depth', depth], ['weight', weight]] as const) {
      if (val !== '' && parseFloat(val) < 0) {
        next[key] = 'Must be a positive number';
      }
    }

    // Validate commissions are 0-100%
    for (const [key, val] of [['commissionGallery', commissionGallery], ['commissionNoa', commissionNoa], ['commissionArtist', commissionArtist]] as const) {
      if (val !== '') {
        const v = parseFloat(val);
        if (isNaN(v) || v < 0 || v > 100) {
          next[key] = 'Must be between 0 and 100';
        }
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /** Validate only the fields relevant to a given step */
  function validateStep(step: number): boolean {
    const next: Record<string, string> = {};

    if (step === 1) {
      if (!title.trim()) {
        next.title = 'Title is required';
      }
      if (year !== '') {
        const y = parseInt(year, 10);
        if (isNaN(y) || y < 1000 || y > 9999) {
          next.year = 'Please enter a valid four-digit year';
        }
      }
    }

    if (step === 2) {
      for (const [key, val] of [['height', height], ['width', width], ['depth', depth], ['weight', weight]] as const) {
        if (val !== '' && parseFloat(val) < 0) {
          next[key] = 'Must be a positive number';
        }
      }
    }

    if (step === 3) {
      if (editionType === 'numbered') {
        if (!editionNumber.trim()) {
          next.editionNumber = 'Edition number is required for numbered editions';
        }
        if (!editionTotal.trim()) {
          next.editionTotal = 'Edition total is required for numbered editions';
        }
        if (editionNumber && editionTotal) {
          const num = parseInt(editionNumber, 10);
          const total = parseInt(editionTotal, 10);
          if (isNaN(num) || num < 1) {
            next.editionNumber = 'Must be a positive number';
          }
          if (isNaN(total) || total < 1) {
            next.editionTotal = 'Must be a positive number';
          }
          if (!isNaN(num) && !isNaN(total) && num > total) {
            next.editionNumber = 'Edition number cannot exceed edition total';
          }
        }
      }
      if (price !== '') {
        const p = parseFloat(price);
        if (isNaN(p) || p < 0) {
          next.price = 'Price must be a positive number';
        }
      }
    }

    if (step === 4) {
      for (const [key, val] of [['commissionGallery', commissionGallery], ['commissionNoa', commissionNoa], ['commissionArtist', commissionArtist]] as const) {
        if (val !== '') {
          const v = parseFloat(val);
          if (isNaN(v) || v < 0 || v > 100) {
            next[key] = 'Must be between 0 and 100';
          }
        }
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ---- Step navigation ------------------------------------------------------

  function handleNext() {
    if (!validateStep(currentStep)) return;
    setCurrentStep((s) => Math.min(s + 1, STEPS.length));
  }

  function handleBack() {
    if (currentStep === 1) {
      onCancel();
      return;
    }
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  // ---- Submit ---------------------------------------------------------------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data: ArtworkInsert = {
      inventory_number: displayInventoryNumber,
      reference_code: displayReferenceCode,
      title: title.trim(),
      medium: medium.trim() || null,
      year: year !== '' ? parseInt(year, 10) : null,
      height: height !== '' ? parseFloat(height) : null,
      width: width !== '' ? parseFloat(width) : null,
      depth: depth !== '' ? parseFloat(depth) : null,
      dimension_unit: dimensionUnit as DimensionUnit,
      framed_height: framedHeight !== '' ? parseFloat(framedHeight) : null,
      framed_width: framedWidth !== '' ? parseFloat(framedWidth) : null,
      framed_depth: framedDepth !== '' ? parseFloat(framedDepth) : null,
      weight: weight !== '' ? parseFloat(weight) : null,
      edition_type: editionType as EditionType,
      edition_number: editionNumber !== '' ? parseInt(editionNumber, 10) : null,
      edition_total: editionTotal !== '' ? parseInt(editionTotal, 10) : null,
      is_unique: isUnique,
      price: price !== '' ? parseFloat(price) : null,
      currency: currency as Currency,
      status: status as ArtworkStatus,
      current_location: currentLocation.trim() || null,
      gallery_id: galleryId,
      commission_gallery: commissionGallery !== '' ? parseFloat(commissionGallery) : null,
      commission_noa: commissionNoa !== '' ? parseFloat(commissionNoa) : null,
      commission_artist: commissionArtist !== '' ? parseFloat(commissionArtist) : null,
      category: (category || null) as ArtworkCategory | null,
      motif: (motif || null) as ArtworkMotif | null,
      series: (series || null) as ArtworkSeries | null,
      color: (color || null) as ArtworkColor | null,
      notes: notes.trim() || null,
      available_for_partners: availableForPartners,
    };

    await onSubmit(data);
    setIsDirty(false);
  }

  // ---- Render: Step content -------------------------------------------------

  function renderStep1() {
    return (
      <>
        {/* Image upload placeholder */}
        <div className="mb-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary-200 bg-primary-50/50 px-6 py-10">
          <svg
            className="h-10 w-10 text-primary-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
          <p className="mt-2 text-sm font-medium text-primary-400">
            Upload images after saving
          </p>
          <p className="mt-0.5 text-xs text-primary-300">
            You can add photos on the artwork detail page
          </p>
        </div>

        <section>
          <SectionHeader>Basic Information</SectionHeader>

          <div className="space-y-4">
            <Input
              label="Title *"
              placeholder="e.g. Untitled Portrait No. 7"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={errors.title}
              maxLength={256}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Inventory Number"
                value={displayInventoryNumber}
                readOnly
                disabled
                helperText={isEdit ? 'Cannot be changed' : 'Auto-generated'}
              />
              <Input
                label="Reference Code"
                value={displayReferenceCode}
                readOnly
                disabled
                helperText="Immutable unique identifier"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Year"
                type="number"
                placeholder="e.g. 2024"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                error={errors.year}
              />
              <Input
                label="Medium"
                placeholder="e.g. Oil on canvas"
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                maxLength={256}
              />
            </div>
          </div>
        </section>

        <section className="mt-6">
          <SectionHeader>Classification</SectionHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Category"
              options={[{ value: '', label: 'No category' }, ...ARTWORK_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))]}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <Select
              label="Motif"
              options={[{ value: '', label: 'No motif' }, ...ARTWORK_MOTIFS.map((m) => ({ value: m.value, label: m.label }))]}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
            />
            <Select
              label="Series"
              options={[{ value: '', label: 'No series' }, ...ARTWORK_SERIES.map((s) => ({ value: s.value, label: s.label }))]}
              value={series}
              onChange={(e) => setSeries(e.target.value)}
            />
            <Select
              label="Color"
              options={[...ARTWORK_COLORS.map((c) => ({ value: c.value, label: c.label }))]}
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
        </section>

        <section className="mt-6">
          <SectionHeader>Notes</SectionHeader>

          <Textarea
            placeholder="Any additional information about this artwork..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={10000}
          />
        </section>
      </>
    );
  }

  function renderStep2() {
    return (
      <>
        <section>
          <SectionHeader>Dimensions (Unframed)</SectionHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Height"
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                error={errors.height}
              />
              <Input
                label="Width"
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                error={errors.width}
              />
              <Input
                label="Depth"
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                error={errors.depth}
              />
            </div>

            <Select
              label="Unit"
              options={DIMENSION_UNITS.map((u) => ({ value: u.value, label: u.label }))}
              value={dimensionUnit}
              onChange={(e) => setDimensionUnit(e.target.value)}
            />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader>Dimensions (Framed)</SectionHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Framed Height"
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                value={framedHeight}
                onChange={(e) => setFramedHeight(e.target.value)}
              />
              <Input
                label="Framed Width"
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                value={framedWidth}
                onChange={(e) => setFramedWidth(e.target.value)}
              />
              <Input
                label="Framed Depth"
                type="number"
                step="0.1"
                min="0"
                placeholder="0"
                value={framedDepth}
                onChange={(e) => setFramedDepth(e.target.value)}
              />
            </div>

            <Input
              label="Weight (kg)"
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              error={errors.weight}
            />
          </div>
        </section>
      </>
    );
  }

  function renderStep3() {
    return (
      <>
        <section>
          <SectionHeader>Edition</SectionHeader>

          <div className="space-y-4">
            <Select
              label="Edition Type"
              options={EDITION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              value={editionType}
              onChange={(e) => handleEditionTypeChange(e.target.value)}
            />

            {editionType === 'numbered' && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Edition Number *"
                  type="number"
                  min="1"
                  placeholder="e.g. 3"
                  value={editionNumber}
                  onChange={(e) => setEditionNumber(e.target.value)}
                  error={errors.editionNumber}
                />
                <Input
                  label="Edition Total *"
                  type="number"
                  min="1"
                  placeholder="e.g. 25"
                  value={editionTotal}
                  onChange={(e) => setEditionTotal(e.target.value)}
                  error={errors.editionTotal}
                />
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-primary-700">
              <input
                type="checkbox"
                checked={isUnique}
                onChange={(e) => setIsUnique(e.target.checked)}
                disabled={editionType === 'unique'}
                className="h-4 w-4 rounded border-primary-300 text-accent focus:ring-accent"
              />
              Unique piece
            </label>
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader>Price &amp; Status</SectionHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              error={errors.price}
            />
            <Select
              label="Currency"
              options={CURRENCIES.map((c) => ({ value: c.value, label: `${c.label} (${c.symbol})` }))}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <Select
              label="Status"
              options={ARTWORK_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </div>

          <div className="mt-4">
            <Input
              label="Current Location"
              placeholder="e.g. Studio Zurich"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              maxLength={256}
            />
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={availableForPartners}
                onChange={(e) => setAvailableForPartners(e.target.checked)}
                className="h-4 w-4 rounded border-primary-300 text-accent focus:ring-accent"
              />
              <span className="text-sm font-medium text-primary-700">Available for Partner Galleries</span>
            </label>
          </div>
        </section>
      </>
    );
  }

  function renderStep4() {
    return (
      <>
        <section>
          <SectionHeader>Gallery</SectionHeader>

          <div className="space-y-4">
            <GallerySelect value={galleryId} onChange={(id) => { setGalleryId(id); markDirty(); }} />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader>Commission Split</SectionHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Gallery / Agent %"
              type="number"
              placeholder="--"
              value={commissionGallery}
              onChange={() => {}}
              disabled
              error={errors.commissionGallery}
            />
            <Input
              label="NOA %"
              type="number"
              placeholder="--"
              value={commissionNoa}
              onChange={() => {}}
              disabled
              error={errors.commissionNoa}
            />
            <Input
              label="Artist %"
              type="number"
              placeholder="--"
              value={commissionArtist}
              onChange={() => {}}
              disabled
              error={errors.commissionArtist}
            />
          </div>

          <p className="mt-2 text-xs text-primary-400">
            Commission split is defined on the gallery profile.
          </p>
        </section>

        <section className="mt-8">
          <SectionHeader>Additional Notes</SectionHeader>

          <Textarea
            placeholder="Any final notes before submitting..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={10000}
          />
        </section>
      </>
    );
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <>
    <UnsavedChangesDialog
      isOpen={blocker.state === 'blocked'}
      onStay={() => blocker.reset?.()}
      onLeave={() => blocker.proceed?.()}
    />
    <form onSubmit={handleSubmit} onChange={markDirty} className="space-y-0">
      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Step content */}
      <div className="min-h-[320px]">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-primary-100 pt-6 mt-8">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={loading}
        >
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-primary-400 mr-2">
            Step {currentStep} of {STEPS.length}
          </span>
          {currentStep < STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={loading}
            >
              Next
            </Button>
          ) : (
            <Button type="submit" loading={loading}>
              {isEdit ? 'Save Changes' : 'Create Artwork'}
            </Button>
          )}
        </div>
      </div>
    </form>
    </>
  );
}
