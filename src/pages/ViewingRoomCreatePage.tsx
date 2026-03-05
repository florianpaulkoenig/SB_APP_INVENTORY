// ---------------------------------------------------------------------------
// NOA Inventory -- Viewing Room Create Page
// Protected page for creating a new viewing room.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewingRooms } from '../hooks/useViewingRooms';
import { ViewingRoomForm } from '../components/viewing-rooms/ViewingRoomForm';
import { Button } from '../components/ui/Button';
import type { ViewingRoomInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ViewingRoomCreatePage() {
  const navigate = useNavigate();
  const { createRoom } = useViewingRooms();
  const [loading, setLoading] = useState(false);

  // ---- Handlers -----------------------------------------------------------

  async function handleSubmit(data: ViewingRoomInsert) {
    setLoading(true);
    const newRoom = await createRoom(data);
    setLoading(false);

    if (newRoom) {
      navigate(`/viewing-rooms/${newRoom.id}`);
    }
  }

  function handleCancel() {
    navigate('/viewing-rooms');
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/viewing-rooms')}
          className="mb-4"
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

        <h1 className="font-display text-2xl font-bold text-primary-900">
          New Viewing Room
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Create a curated selection of artworks to share with a collector or
          client.
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl rounded-lg border border-primary-100 bg-white p-6">
        <ViewingRoomForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </div>
  );
}
