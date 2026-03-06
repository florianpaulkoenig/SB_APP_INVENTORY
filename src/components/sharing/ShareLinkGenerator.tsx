// ---------------------------------------------------------------------------
// NOA Inventory -- Share Link Generator
// Modal wizard: select artworks (reuses CatalogueArtworkPicker) → choose
// image types & expiry → create share link → copy URL.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { supabase } from '../../lib/supabase';
import { IMAGE_TYPES } from '../../lib/constants';
import { generateShareToken } from '../../hooks/useShareLinks';
import { CatalogueArtworkPicker } from '../catalogues/CatalogueArtworkPicker';
import type { ShareLinkRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ShareLinkGeneratorProps {
  open: boolean;
  onClose: () => void;
  onCreated: (link: ShareLinkRow) => void;
  preselectedArtworkIds?: string[];
}

// ---------------------------------------------------------------------------
// Expiry options
// ---------------------------------------------------------------------------

const EXPIRY_OPTIONS = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'none', label: 'No expiry' },
];

function computeExpiry(value: string): string | null {
  const now = new Date();
  switch (value) {
    case '24h':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    case '90d':
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

type Step = 'artworks' | 'settings' | 'success';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareLinkGenerator({
  open,
  onClose,
  onCreated,
  preselectedArtworkIds = [],
}: ShareLinkGeneratorProps) {
  // ---- State ---------------------------------------------------------------

  const [step, setStep] = useState<Step>('artworks');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedImageTypes, setSelectedImageTypes] = useState<Set<string>>(
    new Set(IMAGE_TYPES.map((t) => t.value)),
  );
  const [expiry, setExpiry] = useState('7d');
  const [submitting, setSubmitting] = useState(false);

  // Success state
  const [createdLink, setCreatedLink] = useState<ShareLinkRow | null>(null);
  const [copied, setCopied] = useState(false);

  // ---- Reset on open -------------------------------------------------------

  useEffect(() => {
    if (open) {
      setStep('artworks');
      setSelectedIds(preselectedArtworkIds);
      setCreatedLink(null);
      setCopied(false);
      setExpiry('7d');
      setSelectedImageTypes(new Set(IMAGE_TYPES.map((t) => t.value)));
    }
  }, [open, preselectedArtworkIds]);

  // ---- Image type toggle ---------------------------------------------------

  const toggleImageType = useCallback((type: string) => {
    setSelectedImageTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // ---- Submit --------------------------------------------------------------

  const shareUrl = createdLink
    ? `${window.location.origin}${import.meta.env.BASE_URL}share/${createdLink.token}`
    : '';

  const handleSubmit = async () => {
    if (selectedIds.length === 0 || selectedImageTypes.size === 0) return;

    setSubmitting(true);

    try {
      const token = generateShareToken();
      const expiryDate = computeExpiry(expiry);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data: created, error: insertError } = await supabase
        .from('share_links')
        .insert({
          token,
          artwork_ids: selectedIds,
          image_types: Array.from(selectedImageTypes),
          expiry: expiryDate,
          user_id: session.user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const link = created as ShareLinkRow;
      setCreatedLink(link);
      setStep('success');
      onCreated(link);
    } catch {
      // Error is handled silently; the modal stays open so user can retry
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Copy to clipboard ---------------------------------------------------

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: user can select the input manually
    }
  };

  // ---- Render: Success step ------------------------------------------------

  if (step === 'success' && createdLink) {
    return (
      <Modal isOpen={open} onClose={onClose} title="Link Created" size="md">
        <div className="space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 p-3">
            <svg
              className="h-6 w-6 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>

          <p className="text-center text-sm text-primary-600">
            Your share link has been created. Copy it below and send it to the
            recipient.
          </p>

          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900 focus:outline-none"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              variant={copied ? 'secondary' : 'primary'}
              size="md"
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>

          <div className="text-center text-xs text-primary-400">
            {selectedIds.length} artwork{selectedIds.length !== 1 ? 's' : ''}{' '}
            &middot; {Array.from(selectedImageTypes).join(', ')} &middot;{' '}
            {expiry === 'none'
              ? 'No expiry'
              : `Expires in ${EXPIRY_OPTIONS.find((o) => o.value === expiry)?.label}`}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ---- Render: Settings step (image types + expiry) ------------------------

  if (step === 'settings') {
    return (
      <Modal
        isOpen={open}
        onClose={onClose}
        title="Share Link Settings"
        size="md"
      >
        <div className="space-y-5">
          {/* Summary */}
          <div className="rounded-lg bg-primary-50 px-4 py-3">
            <p className="text-sm text-primary-700">
              <span className="font-medium">{selectedIds.length}</span> artwork
              {selectedIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Image type selector */}
          <div>
            <label className="mb-2 block text-sm font-medium text-primary-700">
              Image Types to Share
            </label>
            <div className="flex gap-4">
              {IMAGE_TYPES.map((type) => (
                <label
                  key={type.value}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedImageTypes.has(type.value)}
                    onChange={() => toggleImageType(type.value)}
                    className="h-4 w-4 rounded border-primary-300 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-primary-700">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Expiry selector */}
          <Select
            label="Link Expiry"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            options={EXPIRY_OPTIONS}
          />

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-primary-100 pt-4">
            <Button variant="outline" onClick={() => setStep('artworks')}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={submitting}
              disabled={selectedImageTypes.size === 0}
            >
              Create Link
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // ---- Render: Artworks step (uses CatalogueArtworkPicker) -----------------

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Select Artworks to Share"
      size="4xl"
    >
      <div className="space-y-4">
        <CatalogueArtworkPicker
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-primary-100 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => setStep('settings')}
            disabled={selectedIds.length === 0}
          >
            Next: Image Types & Expiry
          </Button>
        </div>
      </div>
    </Modal>
  );
}
