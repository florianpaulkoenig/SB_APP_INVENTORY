import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { GALLERY_TYPES } from '../../lib/constants';
import type { GalleryRow, GalleryInsert, GalleryType, GalleryStatusColor } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GalleryFormProps {
  /** Pass an existing gallery to pre-fill for editing */
  gallery?: GalleryRow;
  onSubmit: (data: GalleryInsert) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GalleryForm({
  gallery,
  onSubmit,
  onCancel,
  loading = false,
}: GalleryFormProps) {
  const isEdit = Boolean(gallery);

  // ---- Form state ---------------------------------------------------------

  const [name, setName] = useState(gallery?.name ?? '');
  const [type, setType] = useState<GalleryType>(gallery?.type ?? 'representative');
  const [contactPerson, setContactPerson] = useState(gallery?.contact_person ?? '');
  const [email, setEmail] = useState(gallery?.email ?? '');
  const [phone, setPhone] = useState(gallery?.phone ?? '');
  const [address, setAddress] = useState(gallery?.address ?? '');
  const [city, setCity] = useState(gallery?.city ?? '');
  const [country, setCountry] = useState(gallery?.country ?? '');
  const [commissionRate, setCommissionRate] = useState(
    gallery?.commission_rate != null ? String(gallery.commission_rate) : '',
  );
  const [commissionGallery, setCommissionGallery] = useState(
    gallery?.commission_gallery != null ? String(gallery.commission_gallery) : '',
  );
  const [commissionNoa, setCommissionNoa] = useState(
    gallery?.commission_noa != null ? String(gallery.commission_noa) : '',
  );
  const [commissionArtist, setCommissionArtist] = useState(
    gallery?.commission_artist != null ? String(gallery.commission_artist) : '',
  );
  const [statusColor, setStatusColor] = useState<GalleryStatusColor | ''>(gallery?.status_color ?? '');
  const [notes, setNotes] = useState(gallery?.notes ?? '');

  // ---- Validation ---------------------------------------------------------

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!name.trim()) {
      next.name = 'Gallery name is required';
    }

    if (commissionRate !== '') {
      const rate = parseFloat(commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        next.commissionRate = 'Must be a number between 0 and 100';
      }
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = 'Please enter a valid email address';
    }

    // Commission split validation (must total 100% if any field is set)
    const cg = commissionGallery !== '' ? parseFloat(commissionGallery) : null;
    const cn = commissionNoa !== '' ? parseFloat(commissionNoa) : null;
    const ca = commissionArtist !== '' ? parseFloat(commissionArtist) : null;
    const anySet = cg != null || cn != null || ca != null;
    if (anySet) {
      const total = (cg ?? 0) + (cn ?? 0) + (ca ?? 0);
      if (Math.abs(total - 100) > 0.01) {
        next.commission = `Commission split must total 100% (currently ${total.toFixed(1)}%)`;
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ---- Submit -------------------------------------------------------------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data: GalleryInsert = {
      name: name.trim(),
      type,
      contact_person: contactPerson.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      commission_rate: commissionRate !== '' ? parseFloat(commissionRate) : null,
      commission_gallery: commissionGallery !== '' ? parseFloat(commissionGallery) : null,
      commission_noa: commissionNoa !== '' ? parseFloat(commissionNoa) : null,
      commission_artist: commissionArtist !== '' ? parseFloat(commissionArtist) : null,
      status_color: statusColor || null,
      notes: notes.trim() || null,
    };

    await onSubmit(data);
  }

  // ---- Render -------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Gallery name + type */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Gallery Name *"
          placeholder="e.g. Galerie Perrotin"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          maxLength={256}
        />
        <Select
          label="Gallery Type"
          options={[...GALLERY_TYPES]}
          value={type}
          onChange={(e) => setType(e.target.value as GalleryType)}
        />
      </div>

      {/* Contact info row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Contact Person"
          placeholder="Full name"
          value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
          maxLength={256}
        />
        <Input
          label="Email"
          type="email"
          placeholder="gallery@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          maxLength={320}
        />
      </div>

      <Input
        label="Phone"
        type="tel"
        placeholder="+41 44 123 45 67"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        maxLength={50}
      />

      {/* Address row */}
      <Input
        label="Address"
        placeholder="Street and number"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        maxLength={512}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="City"
          placeholder="e.g. Zurich"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          maxLength={256}
        />
        <Input
          label="Country"
          placeholder="e.g. Switzerland"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          maxLength={256}
        />
      </div>

      {/* Commission rate */}
      <Input
        label="Commission Rate (%)"
        type="number"
        min="0"
        max="100"
        step="0.01"
        placeholder="e.g. 40"
        value={commissionRate}
        onChange={(e) => setCommissionRate(e.target.value)}
        error={errors.commissionRate}
        helperText="Percentage the gallery takes on sales"
      />

      {/* Commission split */}
      <div>
        <label className="mb-2 block text-sm font-medium text-primary-700">
          Commission Split
        </label>

        {errors.commission && (
          <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {errors.commission}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Gallery %"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
            value={commissionGallery}
            onChange={(e) => setCommissionGallery(e.target.value)}
          />
          <Input
            label="NOA %"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
            value={commissionNoa}
            onChange={(e) => setCommissionNoa(e.target.value)}
          />
          <Input
            label="Artist %"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
            value={commissionArtist}
            onChange={(e) => setCommissionArtist(e.target.value)}
          />
        </div>
        <p className="mt-2 text-xs text-primary-400">
          Must total 100%. Leave all empty if not applicable.
        </p>
      </div>

      {/* Status Color */}
      <div>
        <label className="mb-2 block text-sm font-medium text-primary-700">
          Status
        </label>
        <div className="flex items-center gap-3">
          {([
            { value: 'green', bg: 'bg-green-500', ring: 'ring-green-300' },
            { value: 'yellow', bg: 'bg-yellow-400', ring: 'ring-yellow-200' },
            { value: 'red', bg: 'bg-red-500', ring: 'ring-red-300' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusColor(statusColor === opt.value ? '' : opt.value)}
              className={`h-6 w-6 rounded-full ${opt.bg} transition-all ${
                statusColor === opt.value
                  ? `ring-2 ${opt.ring} ring-offset-2`
                  : 'opacity-40 hover:opacity-70'
              }`}
              aria-label={opt.value}
            />
          ))}
          {statusColor && (
            <button
              type="button"
              onClick={() => setStatusColor('')}
              className="text-xs text-primary-400 hover:text-primary-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Notes */}
      <Textarea
        label="Notes"
        placeholder="Any additional information..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={10000}
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-primary-100 pt-6">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create Gallery'}
        </Button>
      </div>
    </form>
  );
}
