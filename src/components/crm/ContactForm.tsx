import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { CONTACT_TYPES } from '../../lib/constants';
import type { ContactRow, ContactInsert } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ContactFormProps {
  /** Pass an existing contact to pre-fill for editing */
  contact?: ContactRow;
  onSubmit: (data: ContactInsert) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContactForm({
  contact,
  onSubmit,
  onCancel,
  loading = false,
}: ContactFormProps) {
  const isEdit = Boolean(contact);

  // ---- Form state ---------------------------------------------------------

  const [firstName, setFirstName] = useState(contact?.first_name ?? '');
  const [lastName, setLastName] = useState(contact?.last_name ?? '');
  const [type, setType] = useState(contact?.type ?? 'collector');
  const [company, setCompany] = useState(contact?.company ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [address, setAddress] = useState(contact?.address ?? '');
  const [city, setCity] = useState(contact?.city ?? '');
  const [country, setCountry] = useState(contact?.country ?? '');
  const [source, setSource] = useState(contact?.source ?? '');
  const [tagsInput, setTagsInput] = useState(
    contact?.tags?.join(', ') ?? '',
  );
  const [notes, setNotes] = useState(contact?.notes ?? '');

  // ---- Validation ---------------------------------------------------------

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!firstName.trim()) {
      next.firstName = 'First name is required';
    }

    if (!lastName.trim()) {
      next.lastName = 'Last name is required';
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

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const data: ContactInsert = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      type: type as ContactInsert['type'],
      company: company.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      country: country.trim() || null,
      source: source.trim() || null,
      tags,
      notes: notes.trim() || null,
    };

    await onSubmit(data);
  }

  // ---- Render -------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name & Type */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          label="First Name *"
          placeholder="e.g. John"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          error={errors.firstName}
        />
        <Input
          label="Last Name *"
          placeholder="e.g. Doe"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          error={errors.lastName}
        />
        <Select
          label="Type"
          options={[...CONTACT_TYPES]}
          value={type}
          onChange={(e) => setType(e.target.value)}
        />
      </div>

      {/* Company */}
      <Input
        label="Company"
        placeholder="e.g. Art Foundation Basel"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />

      {/* Contact info row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Email"
          type="email"
          placeholder="contact@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          label="Phone"
          type="tel"
          placeholder="+41 44 123 45 67"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      {/* Address */}
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

      {/* Additional */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Source"
          placeholder="e.g. Art Basel 2025"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          helperText="Where you met or found this contact"
        />
        <Input
          label="Tags"
          placeholder="e.g. VIP, contemporary, sculpture"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          helperText="Comma-separated tags"
        />
      </div>

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
          {isEdit ? 'Save Changes' : 'Create Contact'}
        </Button>
      </div>
    </form>
  );
}
