// ---------------------------------------------------------------------------
// NOA Inventory -- Image Sharing Page
// Admin page for generating and managing time-limited share links for artwork
// high-res images.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useShareLinks } from '../hooks/useShareLinks';
import { ShareLinkGenerator } from '../components/sharing/ShareLinkGenerator';
import type { ShareLinkRow } from '../types/database';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatDate } from '../lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the public share URL from a token. */
function buildShareUrl(token: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}share/${token}`;
}

/** Determine the display state for an expiry date. */
function getExpiryInfo(expiry: string | null): {
  label: string;
  expired: boolean;
} {
  if (!expiry) return { label: 'No expiry', expired: false };
  const expiryDate = new Date(expiry);
  if (expiryDate < new Date()) return { label: 'Expired', expired: true };
  return { label: `Expires ${formatDate(expiry)}`, expired: false };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SharingPage() {
  // ---- State ----------------------------------------------------------------

  const { links, loading, deleteLink, refresh } = useShareLinks();
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ---- Handlers -------------------------------------------------------------

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this share link? Anyone with the link will no longer be able to download.',
    );
    if (!confirmed) return;

    setDeletingId(id);
    await deleteLink(id);
    setDeletingId(null);
  }

  async function handleCopyUrl(id: string, token: string) {
    try {
      await navigator.clipboard.writeText(buildShareUrl(token));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback: silently fail
    }
  }

  function handleCreated(_link: ShareLinkRow) {
    // Link was created; refresh list (don't close modal yet — ShareLinkGenerator shows success state)
    refresh();
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Image Sharing
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Generate time-limited download links for high-res artwork images.
          </p>
        </div>

        <Button onClick={() => setGeneratorOpen(true)}>
          New Share Link
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && links.length === 0 && (
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
                d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
              />
            </svg>
          }
          title="No share links yet"
          description="Create your first one."
          action={
            <Button onClick={() => setGeneratorOpen(true)}>
              Create First Share Link
            </Button>
          }
        />
      )}

      {/* Share links table */}
      {!loading && links.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-primary-100">
          <table className="min-w-full divide-y divide-primary-100">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Artworks
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Image Types
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Expiry
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Downloads
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50 bg-white">
              {links.map((link) => {
                const { label: expiryLabel, expired } = getExpiryInfo(link.expiry);

                return (
                  <tr key={link.id} className="hover:bg-primary-50 transition-colors">
                    {/* Artworks count */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-primary-900">
                      {link.artwork_ids.length} artwork{link.artwork_ids.length !== 1 ? 's' : ''}
                    </td>

                    {/* Image types */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {link.image_types.length > 0 ? (
                          link.image_types.map((type) => (
                            <Badge key={type} variant="default">
                              {type}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-primary-400">All types</span>
                        )}
                      </div>
                    </td>

                    {/* Created */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                      {formatDate(link.created_at)}
                    </td>

                    {/* Expiry */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span className={expired ? 'font-medium text-red-600' : 'text-primary-600'}>
                        {expiryLabel}
                      </span>
                    </td>

                    {/* Download count */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                      {link.download_count}
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Copy URL button */}
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(link.id, link.token)}
                          className="rounded-md p-1.5 text-primary-400 transition-colors hover:bg-primary-100 hover:text-primary-700"
                          title={copiedId === link.id ? 'Copied!' : 'Copy share URL'}
                        >
                          {copiedId === link.id ? (
                            <svg
                              className="h-4 w-4 text-emerald-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="2"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
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
                                d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                              />
                            </svg>
                          )}
                        </button>

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(link.id)}
                          loading={deletingId === link.id}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create share link modal */}
      <ShareLinkGenerator
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
