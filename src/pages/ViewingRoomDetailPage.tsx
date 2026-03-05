// ---------------------------------------------------------------------------
// NOA Inventory -- Viewing Room Detail / Edit Page
// Protected page for editing an existing viewing room.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useViewingRoom } from '../hooks/useViewingRooms';
import { ViewingRoomForm } from '../components/viewing-rooms/ViewingRoomForm';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { ViewingRoomUpdate } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ViewingRoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { room, loading, updateRoom, togglePublished } = useViewingRoom(id ?? '');
  const [saving, setSaving] = useState(false);

  // ---- Handlers -----------------------------------------------------------

  async function handleSubmit(data: ViewingRoomUpdate) {
    setSaving(true);
    await updateRoom(data);
    setSaving(false);
  }

  function handleCancel() {
    navigate('/viewing-rooms');
  }

  function handleViewPublicPage() {
    if (!room?.slug) return;
    const publicUrl = `${window.location.origin}${import.meta.env.BASE_URL}view/${room.slug}`;
    window.open(publicUrl, '_blank', 'noopener,noreferrer');
  }

  // ---- Loading state ------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ---- Not found state ----------------------------------------------------

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="font-display text-xl font-semibold text-primary-900">
          Viewing room not found
        </h2>
        <p className="mt-2 text-sm text-primary-500">
          The viewing room you are looking for does not exist or has been
          deleted.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/viewing-rooms')}
          className="mt-6"
        >
          Back to Viewing Rooms
        </Button>
      </div>
    );
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/viewing-rooms')}
        className="mb-6"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        Back to Viewing Rooms
      </Button>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-primary-900">
            {room.title}
          </h1>
          <Badge variant={room.published ? 'success' : 'default'}>
            {room.published ? 'Published' : 'Draft'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle publish */}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePublished}
          >
            {room.published ? 'Unpublish' : 'Publish'}
          </Button>

          {/* View public page */}
          {room.published && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleViewPublicPage}
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
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
              View Public Page
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl rounded-lg border border-primary-100 bg-white p-6">
        <ViewingRoomForm
          initialData={room}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={saving}
        />
      </div>
    </div>
  );
}
