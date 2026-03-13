import { useState, useCallback } from 'react';
import { useNews, type NewsPost } from '../hooks/useNews';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate } from '../lib/utils';

type FilterTab = 'all' | 'drafts' | 'published';

export function NewsPage() {
  const { posts, loading, createPost, updatePost, deletePost, publishPost } = useNews();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    image_url: '',
    external_link: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredPosts = posts.filter((post) => {
    if (activeTab === 'drafts') return !post.published;
    if (activeTab === 'published') return post.published;
    return true;
  });

  const resetForm = useCallback(() => {
    setFormData({ title: '', body: '', image_url: '', external_link: '' });
    setEditingPost(null);
  }, []);

  const openCreateModal = useCallback(() => {
    resetForm();
    setShowCreateModal(true);
  }, [resetForm]);

  const openEditModal = useCallback((post: NewsPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      body: post.body,
      image_url: post.image_url || '',
      external_link: post.external_link || '',
    });
    setShowCreateModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowCreateModal(false);
    resetForm();
  }, [resetForm]);

  const handleSave = useCallback(async () => {
    if (!formData.title.trim() || !formData.body.trim()) return;

    setSubmitting(true);
    try {
      if (editingPost) {
        await updatePost(editingPost.id, {
          title: formData.title.trim(),
          body: formData.body.trim(),
          image_url: formData.image_url.trim() || null,
          external_link: formData.external_link.trim() || null,
        });
      } else {
        await createPost({
          title: formData.title.trim(),
          body: formData.body.trim(),
          image_url: formData.image_url.trim() || undefined,
          external_link: formData.external_link.trim() || undefined,
        });
      }
      closeModal();
    } finally {
      setSubmitting(false);
    }
  }, [formData, editingPost, createPost, updatePost, closeModal]);

  const handlePublish = useCallback(async (id: string) => {
    setPublishingId(id);
    try {
      await publishPost(id);
    } finally {
      setPublishingId(null);
    }
  }, [publishPost]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    setDeletingId(id);
    try {
      await deletePost(id);
    } finally {
      setDeletingId(null);
    }
  }, [deletePost]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'drafts', label: 'Drafts' },
    { key: 'published', label: 'Published' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">News</h1>
          <p className="mt-1 text-sm text-gray-500">
            Publish news and announcements for galleries.
          </p>
        </div>
        <Button onClick={openCreateModal}>Create Post</Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          title="No posts found"
          description={
            activeTab === 'drafts'
              ? 'No draft posts yet. Create a new post to get started.'
              : activeTab === 'published'
                ? 'No published posts yet.'
                : 'No news posts yet. Create your first post.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {post.title}
                    </h3>
                    <Badge variant={post.published ? 'success' : 'warning'}>
                      {post.published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {post.body}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    Created {formatDate(post.created_at)}
                    {post.published && post.published_at && (
                      <> &middot; Published {formatDate(post.published_at)}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!post.published && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePublish(post.id)}
                      disabled={publishingId === post.id}
                    >
                      {publishingId === post.id ? 'Publishing...' : 'Publish'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(post)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    className="text-red-600 hover:text-red-700"
                  >
                    {deletingId === post.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showCreateModal}
        onClose={closeModal}
        title={editingPost ? 'Edit Post' : 'Create Post'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Post title"
              maxLength={256}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
              placeholder="Write your news post..."
              rows={6}
              maxLength={10000}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <Input
              value={formData.image_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
              placeholder="https://example.com/image.jpg"
              maxLength={2048}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              External Link
            </label>
            <Input
              value={formData.external_link}
              onChange={(e) => setFormData((prev) => ({ ...prev, external_link: e.target.value }))}
              placeholder="https://example.com/article"
              maxLength={2048}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={closeModal} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={submitting || !formData.title.trim() || !formData.body.trim()}
            >
              {submitting
                ? 'Saving...'
                : editingPost
                  ? 'Save Changes'
                  : 'Save as Draft'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
