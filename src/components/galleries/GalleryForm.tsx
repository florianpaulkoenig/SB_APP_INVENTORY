import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import type { GalleryRow, GalleryInsert } from '../../types/database';

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
  const [contactPerson, setContactPerson] = useState(gallery?.contact_person ?? '');
  const [email, setEmail] = useState(gallery?.email ?? '');
  const [phone, setPhone] = useState(gallery?.phone ?? '');
  const [address, setAddress] = useState(gallery?.address ?? '');
  const [city, setCity] = useState(gallery?.city ?? '');
  const [country, setCountry] = useState(gallery?.country ?? '');
  const [commissionRate, setCommissionRate] = useState(
    gallery?.commission_rate != null ? String(gallery.commission_rate) : '',
  );
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

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ---- Submit -------------------------------------------------------------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data: GalleryInsert = {
      name: name.trim(),
      contact_person: contactPerson.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      commission_rate: commissionRate !== '' ? parseFloat(commissionRate) : null,
      notes: notes.trim() || null,
    };

    await onSubmit(data);
  }

  // ---- Render -------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Gallery name */}
      <Input
        label="Gallery Name *"
        placeholder="e.g. Galerie Perrotin"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />

      {/* Contact info row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Contact Person"
          placeholder="Full name"
          value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          placeholder="gallery@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
      </div>

      <Input
        label="Phone"
        type="tel"
        placeholder="+41 44 123 45 67"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      {/* Address row */}
      <Input
        label="Address"
        placeholder="Street and number"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="City"
          placeholder="e.g. Zurich"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <Input
          label="Country"
          placeholder="e.g. Switzerland"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
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

      {/* Notes */}
      <Textarea
        label="Notes"
        placeholder="Any additional information..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
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
