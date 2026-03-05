import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInvoice, useInvoiceItems, useInvoices } from '../hooks/useInvoices';
import { useArtworks } from '../hooks/useArtworks';
import { InvoiceDetail } from '../components/invoices/InvoiceDetail';
import { InvoiceItemForm } from '../components/invoices/InvoiceItemForm';
import { InvoiceForm } from '../components/invoices/InvoiceForm';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import type { InvoiceItemInsert, InvoiceUpdate } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { invoice, loading, refetch: refetchInvoice } = useInvoice(id!);
  const { items, loading: itemsLoading, addItem, removeItem } = useInvoiceItems(id!);
  const { deleteInvoice, updateInvoice } = useInvoices();
  const { artworks } = useArtworks();

  // ---- Modal state --------------------------------------------------------

  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // ---- Handlers -----------------------------------------------------------

  async function handleAddItem(data: InvoiceItemInsert) {
    const created = await addItem(data);
    if (created) {
      setShowAddItem(false);
      await refetchInvoice();
    }
  }

  async function handleRemoveItem(itemId: string) {
    const success = await removeItem(itemId);
    if (success) {
      await refetchInvoice();
    }
  }

  async function handleDelete() {
    if (!id) return;

    const success = await deleteInvoice(id);
    if (success) {
      navigate('/invoices');
    }
  }

  async function handleEdit(data: InvoiceUpdate) {
    if (!id) return;

    setEditLoading(true);
    const updated = await updateInvoice(id, data);
    setEditLoading(false);

    if (updated) {
      setShowEditModal(false);
      await refetchInvoice();
    }
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

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="font-display text-xl font-semibold text-primary-900">
          Invoice not found
        </h2>
        <p className="mt-2 text-sm text-primary-500">
          The invoice you are looking for does not exist or has been deleted.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/invoices')}
          className="mt-6"
        >
          Back to Invoices
        </Button>
      </div>
    );
  }

  // ---- Derive display names from joined data ------------------------------

  const contactName = invoice.contacts
    ? `${invoice.contacts.first_name} ${invoice.contacts.last_name}`
    : null;

  const galleryName = invoice.galleries?.name ?? null;

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/invoices')}
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
        Back to Invoices
      </Button>

      {/* Invoice detail */}
      <InvoiceDetail
        invoice={invoice}
        contactName={contactName}
        galleryName={galleryName}
        items={items}
        itemsLoading={itemsLoading}
        onEdit={() => setShowEditModal(true)}
        onDelete={handleDelete}
        onAddItem={() => setShowAddItem(true)}
        onRemoveItem={handleRemoveItem}
      />

      {/* Add Item Modal */}
      <Modal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        title="Add Invoice Item"
        size="lg"
      >
        <InvoiceItemForm
          invoiceId={id!}
          artworks={artworks}
          onSubmit={handleAddItem}
          onCancel={() => setShowAddItem(false)}
        />
      </Modal>

      {/* Edit Invoice Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Invoice"
        size="lg"
      >
        <InvoiceForm
          invoiceNumber={invoice.invoice_number}
          initialData={invoice}
          onSubmit={handleEdit}
          onCancel={() => setShowEditModal(false)}
          loading={editLoading}
        />
      </Modal>
    </div>
  );
}
