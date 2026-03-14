// ---------------------------------------------------------------------------
// NOA Inventory -- User Management Page
// Admin-only page for managing user accounts: list, invite, edit role, delete.
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { UserRole, GalleryRow, ContactRow } from '../types/database';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'collector', label: 'Collector' },
];

const ROLE_BADGE_VARIANT: Record<UserRole, 'default' | 'info' | 'success'> = {
  admin: 'default',
  gallery: 'info',
  collector: 'success',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function UserManagementPage() {
  // ---- Hook data ----------------------------------------------------------

  const {
    profiles,
    loading,
    updateProfile,
    deleteProfile,
    inviteUser,
  } = useUserProfiles();

  // ---- Invite modal state -------------------------------------------------

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('gallery');
  const [inviteGalleryId, setInviteGalleryId] = useState('');
  const [inviteContactId, setInviteContactId] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // ---- Galleries & contacts for selects -----------------------------------

  const [galleries, setGalleries] = useState<GalleryRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);

  useEffect(() => {
    supabase
      .from('galleries')
      .select('id, name')
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data) setGalleries(data as GalleryRow[]);
      });

    supabase
      .from('contacts')
      .select('id, first_name, last_name')
      .order('last_name', { ascending: true })
      .then(({ data }) => {
        if (data) setContacts(data as ContactRow[]);
      });
  }, []);

  // ---- Inline edit state --------------------------------------------------

  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState<UserRole>('admin');

  // ---- Deleting state -----------------------------------------------------

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ---- Derived data -------------------------------------------------------

  const galleryMap = new Map(galleries.map((g) => [g.id, g.name]));
  const contactMap = new Map(
    contacts.map((c) => [c.id, `${c.first_name} ${c.last_name}`]),
  );

  // ---- Handlers -----------------------------------------------------------

  function resetInviteForm() {
    setInviteEmail('');
    setInviteDisplayName('');
    setInviteRole('gallery');
    setInviteGalleryId('');
    setInviteContactId('');
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInviteSubmitting(true);

    const success = await inviteUser(
      inviteEmail,
      inviteRole,
      inviteDisplayName,
      inviteRole === 'gallery' ? inviteGalleryId || undefined : undefined,
      inviteRole === 'collector' ? inviteContactId || undefined : undefined,
    );

    setInviteSubmitting(false);

    if (success) {
      setInviteOpen(false);
      resetInviteForm();
    }
  }

  function handleEditRoleStart(profileId: string, currentRole: UserRole) {
    setEditingRoleId(profileId);
    setEditingRoleValue(currentRole);
  }

  async function handleEditRoleSave(profileId: string) {
    await updateProfile(profileId, { role: editingRoleValue });
    setEditingRoleId(null);
  }

  async function handleDelete(profileId: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this user profile? This cannot be undone.',
    );
    if (!confirmed) return;

    setDeletingId(profileId);
    await deleteProfile(profileId);
    setDeletingId(null);
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            User Management
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Manage user accounts, roles, and access to the inventory system.
          </p>
        </div>

        <Button onClick={() => setInviteOpen(true)}>
          Invite User
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && profiles.length === 0 && (
        <EmptyState
          icon={
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          }
          title="No users yet"
          description="Invite your first user to get started."
          action={
            <Button onClick={() => setInviteOpen(true)}>
              Invite First User
            </Button>
          }
        />
      )}

      {/* Users table */}
      {!loading && profiles.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-primary-100">
          <table className="min-w-full divide-y divide-primary-100">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Display Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Association
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50 bg-white">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-primary-50 transition-colors">
                  {/* Display Name */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-primary-900">
                    {profile.display_name}
                  </td>

                  {/* Role */}
                  <td className="whitespace-nowrap px-4 py-3">
                    {editingRoleId === profile.id ? (
                      <div className="flex items-center gap-2">
                        <Select
                          options={ROLE_OPTIONS}
                          value={editingRoleValue}
                          onChange={(e) =>
                            setEditingRoleValue(e.target.value as UserRole)
                          }
                          className="!w-32"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleEditRoleSave(profile.id)}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRoleId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Badge variant={ROLE_BADGE_VARIANT[profile.role]}>
                        {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                      </Badge>
                    )}
                  </td>

                  {/* Association (Gallery / Contact) */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {profile.role === 'gallery' && profile.gallery_id
                      ? galleryMap.get(profile.gallery_id) ?? 'Unknown gallery'
                      : profile.role === 'collector' && profile.contact_id
                        ? contactMap.get(profile.contact_id) ?? 'Unknown contact'
                        : '\u2014'}
                  </td>

                  {/* Created */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {formatDate(profile.created_at)}
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit role button */}
                      {editingRoleId !== profile.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleEditRoleStart(profile.id, profile.role)
                          }
                          title="Edit role"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                            />
                          </svg>
                        </Button>
                      )}

                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(profile.id)}
                        loading={deletingId === profile.id}
                        className="text-red-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite User modal */}
      <Modal
        isOpen={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          resetInviteForm();
        }}
        title="Invite User"
        size="lg"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="user@example.com"
            maxLength={320}
          />

          <Input
            label="Display Name"
            required
            value={inviteDisplayName}
            onChange={(e) => setInviteDisplayName(e.target.value)}
            placeholder="Jane Doe"
            maxLength={256}
          />

          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
          />

          {/* Gallery select -- only shown for gallery role */}
          {inviteRole === 'gallery' && (
            <Select
              label="Gallery"
              options={galleries.map((g) => ({
                value: g.id,
                label: g.name,
              }))}
              placeholder="Select a gallery..."
              value={inviteGalleryId}
              onChange={(e) => setInviteGalleryId(e.target.value)}
            />
          )}

          {/* Contact select -- only shown for collector role */}
          {inviteRole === 'collector' && (
            <Select
              label="Contact"
              options={contacts.map((c) => ({
                value: c.id,
                label: `${c.first_name} ${c.last_name}`,
              }))}
              placeholder="Select a contact..."
              value={inviteContactId}
              onChange={(e) => setInviteContactId(e.target.value)}
            />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setInviteOpen(false);
                resetInviteForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={inviteSubmitting}>
              Send Invite
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
