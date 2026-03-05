// ---------------------------------------------------------------------------
// NOA Inventory -- Viewing Room Preview Card
// Admin list card showing viewing room summary with action buttons.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatDate } from '../../lib/utils';
import type { ViewingRoomRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ViewingRoomPreviewProps {
  room: ViewingRoomRow;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  deleting?: boolean;
}

// ---------------------------------------------------------------------------
// Visibility badge config
// ---------------------------------------------------------------------------

const VISIBILITY_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'info' | 'warning' }
> = {
  public: { label: 'Public', variant: 'success' },
  link_only: { label: 'Link Only', variant: 'info' },
  password: { label: 'Password', variant: 'warning' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ViewingRoomPreview({
  room,
  onEdit,
  onDelete,
  onTogglePublish,
  deleting = false,
}: ViewingRoomPreviewProps) {
  const [copied, setCopied] = useState(false);

  const visibilityInfo = VISIBILITY_CONFIG[room.visibility] ?? {
    label: room.visibility,
    variant: 'default' as const,
  };

  const viewUrl = `${window.location.origin}/SB_APP_INVENTORY/view/${room.slug}`;

  // ---- Copy link handler ----------------------------------------------------

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(viewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available; silent fail
    }
  };

  // ---- Render ---------------------------------------------------------------

  return (
    <Card className="p-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-primary-900 truncate">
            {room.title}
          </h3>
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-block text-xs text-accent hover:underline truncate max-w-full"
          >
            /view/{room.slug}
          </a>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={visibilityInfo.variant}>{visibilityInfo.label}</Badge>
          <Badge variant={room.published ? 'success' : 'default'}>
            {room.published ? 'Published' : 'Draft'}
          </Badge>
        </div>
      </div>

      {/* Meta info */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-primary-500">
        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
          {room.artwork_ids.length} artwork{room.artwork_ids.length !== 1 ? 's' : ''}
        </span>

        <span className="text-primary-300">&middot;</span>

        <span>Created {formatDate(room.created_at)}</span>

        {room.updated_at !== room.created_at && (
          <>
            <span className="text-primary-300">&middot;</span>
            <span>Updated {formatDate(room.updated_at)}</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary-100 pt-3">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          Edit
        </Button>

        <Button
          variant={room.published ? 'secondary' : 'primary'}
          size="sm"
          onClick={onTogglePublish}
        >
          {room.published ? (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
              Unpublish
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Publish
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyLink}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.036-3.054a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757" />
          </svg>
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        <Button
          variant="danger"
          size="sm"
          onClick={onDelete}
          loading={deleting}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          Delete
        </Button>
      </div>
    </Card>
  );
}
