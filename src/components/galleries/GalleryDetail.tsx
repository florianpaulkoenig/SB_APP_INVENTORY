import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getSignedUrls } from '../../lib/signedUrlCache';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { StatusBadge } from '../ui/StatusBadge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useGalleryTeamMembers } from '../../hooks/useGalleryTeamMembers';
import { formatCurrency, formatDimensions, formatDate } from '../../lib/utils';
import type { GalleryRow, ArtworkRow, ProductionOrderRow, GalleryTeamMemberRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GalleryDetailProps {
  gallery: GalleryRow;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helper: info row
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-primary-800">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GalleryDetail({ gallery, onEdit, onDelete }: GalleryDetailProps) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ---- Consignment artworks -----------------------------------------------
  const [consignmentArtworks, setConsignmentArtworks] = useState<ArtworkRow[]>([]);
  const [consignmentLoading, setConsignmentLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const fetchConsignmentArtworks = useCallback(async () => {
    setConsignmentLoading(true);

    const { data } = await supabase
      .from('artworks')
      .select('*')
      .eq('gallery_id', gallery.id)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    const artworks = (data as ArtworkRow[]) ?? [];
    setConsignmentArtworks(artworks);

    // Fetch primary images for these artworks
    if (artworks.length > 0) {
      const ids = artworks.map((a) => a.id);
      const { data: imgData } = await supabase
        .from('artwork_images')
        .select('artwork_id, storage_path')
        .in('artwork_id', ids)
        .eq('is_primary', true);

      if (imgData && imgData.length > 0) {
        const signedMap = await getSignedUrls(
          'artwork-images',
          imgData.map((img) => img.storage_path),
        );
        const urlMap: Record<string, string> = {};
        imgData.forEach((img) => {
          const url = signedMap.get(img.storage_path);
          if (url) urlMap[img.artwork_id] = url;
        });
        setImageUrls(urlMap);
      }
    }

    setConsignmentLoading(false);
  }, [gallery.id]);

  useEffect(() => {
    fetchConsignmentArtworks();
  }, [fetchConsignmentArtworks]);

  // ---- Production orders linked to this gallery ----------------------------
  const [productionOrders, setProductionOrders] = useState<ProductionOrderRow[]>([]);
  const [productionLoading, setProductionLoading] = useState(true);

  const fetchProductionOrders = useCallback(async () => {
    setProductionLoading(true);

    const { data } = await supabase
      .from('production_orders')
      .select('*')
      .eq('gallery_id', gallery.id)
      .order('created_at', { ascending: false });

    setProductionOrders((data as ProductionOrderRow[]) ?? []);
    setProductionLoading(false);
  }, [gallery.id]);

  useEffect(() => {
    fetchProductionOrders();
  }, [fetchProductionOrders]);

  // ---- Team members --------------------------------------------------------
  const { members: teamMembers, loading: teamLoading, createMember, updateMember, deleteMember } = useGalleryTeamMembers(gallery.id);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingMember, setEditingMember] = useState<GalleryTeamMemberRow | null>(null);
  const [memberDeleteId, setMemberDeleteId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState({ name: '', role_title: '', email: '', phone: '', notes: '' });
  const [memberSaving, setMemberSaving] = useState(false);

  function openAddMember() {
    setEditingMember(null);
    setMemberForm({ name: '', role_title: '', email: '', phone: '', notes: '' });
    setShowTeamModal(true);
  }

  function openEditMember(member: GalleryTeamMemberRow) {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      role_title: member.role_title ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      notes: member.notes ?? '',
    });
    setShowTeamModal(true);
  }

  async function handleMemberSubmit(e: FormEvent) {
    e.preventDefault();
    setMemberSaving(true);
    const payload = {
      gallery_id: gallery.id,
      name: memberForm.name,
      role_title: memberForm.role_title || null,
      email: memberForm.email || null,
      phone: memberForm.phone || null,
      notes: memberForm.notes || null,
    };
    if (editingMember) {
      await updateMember(editingMember.id, payload);
    } else {
      await createMember(payload);
    }
    setMemberSaving(false);
    setShowTeamModal(false);
  }

  async function handleMemberDelete() {
    if (!memberDeleteId) return;
    await deleteMember(memberDeleteId);
    setMemberDeleteId(null);
  }

  // ---- Helpers ------------------------------------------------------------

  const location = [gallery.address, gallery.city, gallery.country]
    .filter(Boolean)
    .join(', ');

  async function handleDelete() {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            {gallery.status_color && (
              <span
                className={`inline-block h-3 w-3 flex-shrink-0 rounded-full ${
                  gallery.status_color === 'green'
                    ? 'bg-green-500'
                    : gallery.status_color === 'yellow'
                      ? 'bg-yellow-400'
                      : 'bg-red-500'
                }`}
              />
            )}
            <h1 className="font-display text-2xl font-bold text-primary-900">
              {gallery.name}
            </h1>
          </div>
          {location && (
            <p className="mt-1 text-sm text-primary-500">{location}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
            loading={deleting}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Contact Information */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Contact Information
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow label="Contact Person" value={gallery.contact_person} />
          <InfoRow label="Email" value={gallery.email} />
          <InfoRow label="Phone" value={gallery.phone} />
        </dl>
        {!gallery.contact_person && !gallery.email && !gallery.phone && (
          <p className="text-sm text-primary-400">No contact information provided.</p>
        )}
      </section>

      {/* Address */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Address
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoRow label="Street" value={gallery.address} />
          <InfoRow label="City" value={gallery.city} />
          <InfoRow label="Country" value={gallery.country} />
        </dl>
        {!gallery.address && !gallery.city && !gallery.country && (
          <p className="text-sm text-primary-400">No address provided.</p>
        )}
      </section>

      {/* Commission */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Commission
        </h2>
        {gallery.commission_rate != null ? (
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
              Commission Rate
            </p>
            <p className="mt-1 text-2xl font-semibold text-accent">
              {gallery.commission_rate}%
            </p>
          </div>
        ) : (
          <p className="mb-4 text-sm text-primary-400">No commission rate set.</p>
        )}

        {/* Commission Split */}
        {(gallery.commission_gallery != null ||
          gallery.commission_noa != null ||
          gallery.commission_artist != null) && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary-400">
              Commission Split
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-primary-50 p-3 text-center">
                <p className="text-xs text-primary-500">Gallery</p>
                <p className="mt-1 text-lg font-semibold text-primary-900">
                  {gallery.commission_gallery ?? 0}%
                </p>
              </div>
              <div className="rounded-lg bg-primary-50 p-3 text-center">
                <p className="text-xs text-primary-500">NOA</p>
                <p className="mt-1 text-lg font-semibold text-primary-900">
                  {gallery.commission_noa ?? 0}%
                </p>
              </div>
              <div className="rounded-lg bg-primary-50 p-3 text-center">
                <p className="text-xs text-primary-500">Artist</p>
                <p className="mt-1 text-lg font-semibold text-primary-900">
                  {gallery.commission_artist ?? 0}%
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Notes */}
      {gallery.notes && (
        <section className="rounded-lg border border-primary-100 bg-white p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
            Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-primary-700">
            {gallery.notes}
          </p>
        </section>
      )}

      {/* Team Members */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-primary-900">
            Team Members
            {!teamLoading && teamMembers.length > 0 && (
              <span className="ml-2 text-sm font-normal text-primary-400">
                ({teamMembers.length})
              </span>
            )}
          </h2>
          <Button size="sm" onClick={openAddMember}>
            Add Member
          </Button>
        </div>

        {teamLoading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        ) : teamMembers.length === 0 ? (
          <p className="text-sm text-primary-400">
            No team members added yet.
          </p>
        ) : (
          <div className="divide-y divide-primary-100">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary-900">
                    {member.name}
                  </p>
                  {member.role_title && (
                    <p className="mt-0.5 text-xs text-primary-500">
                      {member.role_title}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="text-xs text-accent hover:underline"
                      >
                        {member.email}
                      </a>
                    )}
                    {member.phone && (
                      <a
                        href={`tel:${member.phone}`}
                        className="text-xs text-primary-600 hover:underline"
                      >
                        {member.phone}
                      </a>
                    )}
                  </div>
                  {member.notes && (
                    <p className="mt-1 text-xs text-primary-400">
                      {member.notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditMember(member)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setMemberDeleteId(member.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Team Member Modal */}
      <Modal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        title={editingMember ? 'Edit Team Member' : 'Add Team Member'}
      >
        <form onSubmit={handleMemberSubmit} className="space-y-4">
          <Input
            label="Name"
            required
            value={memberForm.name}
            onChange={(e) => setMemberForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Full name"
          />
          <Input
            label="Role / Title"
            value={memberForm.role_title}
            onChange={(e) => setMemberForm((f) => ({ ...f, role_title: e.target.value }))}
            placeholder="e.g. Director, Sales Manager"
          />
          <Input
            label="Email"
            type="email"
            value={memberForm.email}
            onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="email@example.com"
          />
          <Input
            label="Phone"
            type="tel"
            value={memberForm.phone}
            onChange={(e) => setMemberForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+1 234 567 890"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-primary-700">
              Notes
            </label>
            <textarea
              value={memberForm.notes}
              onChange={(e) => setMemberForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 transition-colors focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
              placeholder="Optional notes..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTeamModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={memberSaving}>
              {editingMember ? 'Save Changes' : 'Add Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Team Member Delete Confirm */}
      <ConfirmDialog
        isOpen={!!memberDeleteId}
        onClose={() => setMemberDeleteId(null)}
        onConfirm={handleMemberDelete}
        title="Remove Team Member"
        message="Are you sure you want to remove this team member? This action cannot be undone."
        confirmLabel="Remove"
        variant="danger"
      />

      {/* Artworks on Consignment */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Artworks on Consignment
          {!consignmentLoading && consignmentArtworks.length > 0 && (
            <span className="ml-2 text-sm font-normal text-primary-400">
              ({consignmentArtworks.length})
            </span>
          )}
        </h2>

        {consignmentLoading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        ) : consignmentArtworks.length === 0 ? (
          <p className="text-sm text-primary-400">
            No artworks assigned to this gallery yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {consignmentArtworks.map((artwork) => {
              const dims = formatDimensions(
                artwork.height,
                artwork.width,
                artwork.depth,
                artwork.dimension_unit,
              );

              return (
                <button
                  key={artwork.id}
                  type="button"
                  onClick={() => navigate(`/artworks/${artwork.id}`)}
                  className="flex gap-3 rounded-lg border border-primary-100 bg-primary-50/50 p-3 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                >
                  {/* Thumbnail */}
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-primary-100">
                    {imageUrls[artwork.id] ? (
                      <img
                        src={imageUrls[artwork.id]}
                        alt={artwork.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg
                          className="h-6 w-6 text-primary-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary-900">
                      {artwork.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-primary-400">
                      {artwork.reference_code}
                    </p>
                    {dims && (
                      <p className="mt-0.5 text-xs text-primary-500">{dims}</p>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={artwork.status} />
                      {artwork.price != null && (
                        <span className="text-xs font-medium text-primary-700">
                          {formatCurrency(artwork.price, artwork.currency)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Production Orders */}
      <section className="rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Production Orders
          {!productionLoading && productionOrders.length > 0 && (
            <span className="ml-2 text-sm font-normal text-primary-400">
              ({productionOrders.length})
            </span>
          )}
        </h2>

        {productionLoading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        ) : productionOrders.length === 0 ? (
          <p className="text-sm text-primary-400">
            No production orders linked to this gallery.
          </p>
        ) : (
          <div className="space-y-3">
            {productionOrders.map((po) => (
              <button
                key={po.id}
                type="button"
                onClick={() => navigate(`/production/${po.id}`)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary-100 bg-primary-50/50 p-3 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-primary-900">
                    {po.title}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-primary-400">
                    {po.order_number}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge status={po.status} />
                    {po.ordered_date && (
                      <span className="text-xs text-primary-500">
                        {formatDate(po.ordered_date)}
                      </span>
                    )}
                    {po.price != null && (
                      <span className="text-xs font-medium text-primary-700">
                        {formatCurrency(po.price, po.currency)}
                      </span>
                    )}
                  </div>
                </div>

                <svg
                  className="h-4 w-4 flex-shrink-0 text-primary-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Confirm delete dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Gallery"
        message={`Are you sure you want to delete "${gallery.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
