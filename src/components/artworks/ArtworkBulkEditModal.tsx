import { useState, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { GallerySelect } from '../galleries/GallerySelect';
import {
  ARTWORK_STATUSES,
  ARTWORK_CATEGORIES,
  ARTWORK_MOTIFS,
  ARTWORK_SERIES,
  ARTWORK_COLORS,
  EDITION_TYPES,
  CURRENCIES,
  DIMENSION_UNITS,
  SIZE_CATEGORIES,
} from '../../lib/constants';
import type {
  ArtworkUpdate,
  ArtworkStatus,
  ArtworkCategory,
  ArtworkMotif,
  ArtworkSeries,
  ArtworkColor,
  DimensionUnit,
  Currency,
  EditionType,
  SizeCategory,
} from '../../types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BulkField =
  | 'category' | 'motif' | 'series' | 'color'
  | 'price' | 'currency' | 'status' | 'available_for_partners'
  | 'current_location' | 'gallery_id'
  | 'commission_gallery' | 'commission_noa' | 'commission_artist'
  | 'medium' | 'year' | 'dimension_unit' | 'size_category' | 'edition_type'
  | 'notes';

interface FieldDef {
  key: BulkField;
  label: string;
  section: string;
}

const FIELD_DEFS: FieldDef[] = [
  // Classification
  { key: 'category', label: 'Category', section: 'Classification' },
  { key: 'motif', label: 'Motif', section: 'Classification' },
  { key: 'series', label: 'Series', section: 'Classification' },
  { key: 'color', label: 'Color', section: 'Classification' },
  // Commerce
  { key: 'price', label: 'Price', section: 'Commerce' },
  { key: 'currency', label: 'Currency', section: 'Commerce' },
  { key: 'status', label: 'Status', section: 'Commerce' },
  { key: 'available_for_partners', label: 'Available for Partners', section: 'Commerce' },
  // Location & Gallery
  { key: 'current_location', label: 'Current Location', section: 'Location & Gallery' },
  { key: 'gallery_id', label: 'Gallery', section: 'Location & Gallery' },
  { key: 'commission_gallery', label: 'Commission Gallery (%)', section: 'Location & Gallery' },
  { key: 'commission_noa', label: 'Commission NOA (%)', section: 'Location & Gallery' },
  { key: 'commission_artist', label: 'Commission Artist (%)', section: 'Location & Gallery' },
  // Physical
  { key: 'medium', label: 'Medium', section: 'Physical' },
  { key: 'year', label: 'Year', section: 'Physical' },
  { key: 'dimension_unit', label: 'Dimension Unit', section: 'Physical' },
  { key: 'size_category', label: 'Size Category', section: 'Physical' },
  { key: 'edition_type', label: 'Edition Type', section: 'Physical' },
  // Other
  { key: 'notes', label: 'Notes', section: 'Other' },
];

const SECTIONS = ['Classification', 'Commerce', 'Location & Gallery', 'Physical', 'Other'];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkBulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onSubmit: (data: ArtworkUpdate) => Promise<void>;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtworkBulkEditModal({
  isOpen,
  onClose,
  selectedCount,
  onSubmit,
  loading = false,
}: ArtworkBulkEditModalProps) {
  // Track which fields are enabled
  const [enabled, setEnabled] = useState<Set<BulkField>>(new Set());

  // Field values
  const [values, setValues] = useState<Record<string, unknown>>({
    category: '',
    motif: '',
    series: '',
    color: '',
    price: '',
    currency: 'CHF',
    status: 'available',
    available_for_partners: false,
    current_location: '',
    gallery_id: null as string | null,
    commission_gallery: '',
    commission_noa: '',
    commission_artist: '',
    medium: '',
    year: '',
    dimension_unit: 'cm',
    size_category: '',
    edition_type: 'unique',
    notes: '',
  });

  const toggleField = useCallback((field: BulkField) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }, []);

  const setValue = useCallback((field: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (enabled.size === 0) return;

    const data: ArtworkUpdate = {};
    for (const field of enabled) {
      const val = values[field];
      switch (field) {
        case 'price':
          (data as Record<string, unknown>)[field] = val === '' ? null : Number(val);
          break;
        case 'year':
          (data as Record<string, unknown>)[field] = val === '' ? null : Number(val);
          break;
        case 'commission_gallery':
        case 'commission_noa':
        case 'commission_artist':
          (data as Record<string, unknown>)[field] = val === '' ? null : Number(val);
          break;
        case 'category':
        case 'motif':
        case 'series':
        case 'color':
        case 'size_category':
          (data as Record<string, unknown>)[field] = val === '' ? null : val;
          break;
        case 'gallery_id':
          (data as Record<string, unknown>)[field] = val === '' ? null : val;
          break;
        default:
          (data as Record<string, unknown>)[field] = val;
      }
    }

    await onSubmit(data);
  }, [enabled, values, onSubmit]);

  const handleClose = useCallback(() => {
    setEnabled(new Set());
    setValues({
      category: '',
      motif: '',
      series: '',
      color: '',
      price: '',
      currency: 'CHF',
      status: 'available',
      available_for_partners: false,
      current_location: '',
      gallery_id: null,
      commission_gallery: '',
      commission_noa: '',
      commission_artist: '',
      medium: '',
      year: '',
      dimension_unit: 'cm',
      size_category: '',
      edition_type: 'unique',
      notes: '',
    });
    onClose();
  }, [onClose]);

  // ---------------------------------------------------------------------------
  // Render a field input based on its key
  // ---------------------------------------------------------------------------

  function renderField(field: BulkField) {
    const isEnabled = enabled.has(field);

    switch (field) {
      case 'category':
        return (
          <Select
            options={[{ value: '', label: '— Clear —' }, ...ARTWORK_CATEGORIES]}
            value={(values.category as string) ?? ''}
            onChange={(e) => setValue('category', e.target.value)}
            disabled={!isEnabled}
          />
        );
      case 'motif':
        return (
          <Select
            options={[{ value: '', label: '— Clear —' }, ...ARTWORK_MOTIFS]}
            value={(values.motif as string) ?? ''}
            onChange={(e) => setValue('motif', e.target.value)}
            disabled={!isEnabled}
          />
        );
      case 'series':
        return (
          <Select
            options={[{ value: '', label: '— Clear —' }, ...ARTWORK_SERIES]}
            value={(values.series as string) ?? ''}
            onChange={(e) => setValue('series', e.target.value)}
            disabled={!isEnabled}
          />
        );
      case 'color':
        return (
          <Select
            options={[{ value: '', label: '— Clear —' }, ...ARTWORK_COLORS]}
            value={(values.color as string) ?? ''}
            onChange={(e) => setValue('color', e.target.value)}
            disabled={!isEnabled}
          />
        );
      case 'price':
        return (
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={(values.price as string) ?? ''}
            onChange={(e) => setValue('price', e.target.value)}
            disabled={!isEnabled}
          />
        );
      case 'currency':
        return (
          <Select
            options={CURRENCIES}
            value={(values.currency as string) ?? 'CHF'}
            onChange={(e) => setValue('currency', e.target.value)}
            disabled={!isEnabled}
          />
        );
      case 'status':
        return (
          <Select
            options={ARTWORK_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            value={(values.status as string) ?? 'available'}
            onChange={(e) => setValue('status', e.target.value as ArtworkStatus)}
            disabled={!isEnabled}
          />
        );
      case 'available_for_partners':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(values.available_for_partners)}
              onChange={(e) => setValue('available_for_partners', e.target.checked)}
              disabled={!isEnabled}
              className="h-4 w-4 rounded border-primary-300 text-accent-600 focus:ring-accent-500"
            />
            <span className={`text-sm ${isEnabled ? 'text-primary-700' : 'text-primary-400'}`}>
              Yes
            </span>
          </label>
        );
      case 'current_location':
        return (
          <Input
            type="text"
            placeholder="Location..."
            value={(values.current_location as string) ?? ''}
            onChange={(e) => setValue('current_location', e.target.value)}
            disabled={!isEnabled}
          />
        );
      case 'gallery_id':
        return (
          <div className={!isEnabled ? 'opacity-50 pointer-events-none' : ''}>
            <GallerySelect
              value={values.gallery_id as string | null}
              onChange={(gid) => setValue('gallery_id', gid)}
              label=""
            />
          </div>
        );
      case 'commission_gallery':
      case 'commission_noa':
      case 'commission_artist':
        return (
          <Input
            type="number"
            min={0}
            max={100}
            step="0.1"
            placeholder="0"
            value={(values[field] as string) ?? ''}
            onChange={(e) => setValue(field, e.target.value)}
            disabled={!isEnabled}
          />
        );
      case 'medium':
        return (
          <Input
            type="text"
            placeholder="e.g. Oil on canvas"
            value={(values.medium as string) ?? ''}
            onChange={(e) => setValue('medium', e.target.value)}
            disabled={!isEnabled}
          />
        );
      case 'year':
        return (
          <Input
            type="number"
            min={1900}
            max={2100}
            placeholder="2026"
            value={(values.year as string) ?? ''}
            onChange={(e) => setValue('year', e.target.value)}
            disabled={!isEnabled}
          />
        );
      case 'dimension_unit':
        return (
          <Select
            options={DIMENSION_UNITS}
            value={(values.dimension_unit as string) ?? 'cm'}
            onChange={(e) => setValue('dimension_unit', e.target.value as DimensionUnit)}
            disabled={!isEnabled}
          />
        );
      case 'size_category':
        return (
          <Select
            options={[{ value: '', label: '— Clear —' }, ...SIZE_CATEGORIES]}
            value={(values.size_category as string) ?? ''}
            onChange={(e) => setValue('size_category', e.target.value)}
            disabled={!isEnabled}
          />
        );
      case 'edition_type':
        return (
          <Select
            options={EDITION_TYPES}
            value={(values.edition_type as string) ?? 'unique'}
            onChange={(e) => setValue('edition_type', e.target.value as EditionType)}
            disabled={!isEnabled}
          />
        );
      case 'notes':
        return (
          <Textarea
            placeholder="Notes..."
            rows={2}
            value={(values.notes as string) ?? ''}
            onChange={(e) => setValue('notes', e.target.value)}
            disabled={!isEnabled}
          />
        );
      default:
        return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Edit ${selectedCount} artwork${selectedCount > 1 ? 's' : ''}`} size="3xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        <p className="text-sm text-primary-500">
          Toggle the checkbox next to each field you want to change. Only enabled fields will be updated.
        </p>

        {SECTIONS.map((section) => {
          const fields = FIELD_DEFS.filter((f) => f.section === section);
          if (fields.length === 0) return null;

          return (
            <div key={section}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary-400 mb-3 border-b border-primary-100 pb-1">
                {section}
              </h3>
              <div className="space-y-3">
                {fields.map((field) => {
                  const isEnabled = enabled.has(field.key);
                  return (
                    <div
                      key={field.key}
                      className={`flex items-start gap-3 rounded-lg px-3 py-2 transition-colors ${
                        isEnabled ? 'bg-accent-50/50' : 'bg-primary-50/30'
                      }`}
                    >
                      {/* Toggle checkbox */}
                      <label className="flex items-center mt-1 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => toggleField(field.key)}
                          className="h-4 w-4 rounded border-primary-300 text-accent-600 focus:ring-accent-500"
                        />
                      </label>

                      {/* Label */}
                      <span
                        className={`text-sm font-medium w-44 shrink-0 mt-1 cursor-pointer ${
                          isEnabled ? 'text-primary-800' : 'text-primary-400'
                        }`}
                        onClick={() => toggleField(field.key)}
                      >
                        {field.label}
                      </span>

                      {/* Input */}
                      <div className="flex-1 min-w-0">
                        {renderField(field.key)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-primary-100 pt-4">
        <span className="text-xs text-primary-400">
          {enabled.size === 0
            ? 'No fields selected'
            : `${enabled.size} field${enabled.size > 1 ? 's' : ''} will be updated`}
        </span>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || enabled.size === 0}
          >
            {loading
              ? 'Applying...'
              : `Apply to ${selectedCount} artwork${selectedCount > 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
