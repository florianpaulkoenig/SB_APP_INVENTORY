// ---------------------------------------------------------------------------
// NOA Inventory -- Viewing Rooms List Page
// Protected admin page for managing viewing rooms: list, delete, toggle
// publish, and navigate to create / edit.
// ---------------------------------------------------------------------------

import { Link, useNavigate } from 'react-router-dom';
import { useViewingRooms } from '../hooks/useViewingRooms';
import { ViewingRoomPreview } from '../components/viewing-rooms/ViewingRoomPreview';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ViewingRoomsPage() {
  const navigate = useNavigate();
  const { rooms, loading, deleteRoom, updateRoom } = useViewingRooms();

  // ---- Handlers -----------------------------------------------------------

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this viewing room? This action cannot be undone.',
    );
    if (!confirmed) return;

    await deleteRoom(id);
  }

  async function handleTogglePublish(id: string, currentlyPublished: boolean) {
    await updateRoom(id, { published: !currentlyPublished });
  }

  function handleEdit(id: string) {
    navigate(`/viewing-rooms/${id}`);
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Viewing Rooms
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Create and manage curated viewing rooms to share artworks with
            collectors and clients.
          </p>
        </div>

        <Link
          to="/viewing-rooms/new"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800 active:bg-primary-950 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          New Viewing Room
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && rooms.length === 0 && (
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
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
          title="No viewing rooms yet"
          description="Create your first viewing room to start sharing curated selections with clients."
          action={
            <Link
              to="/viewing-rooms/new"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800 active:bg-primary-950 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              Create First Viewing Room
            </Link>
          }
        />
      )}

      {/* Viewing room grid */}
      {!loading && rooms.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <ViewingRoomPreview
              key={room.id}
              room={room}
              onEdit={() => handleEdit(room.id)}
              onDelete={() => handleDelete(room.id)}
              onTogglePublish={() => handleTogglePublish(room.id, room.published)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
