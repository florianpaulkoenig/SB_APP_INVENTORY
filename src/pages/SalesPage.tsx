import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSales } from '../hooks/useSales';
import { useArtworks } from '../hooks/useArtworks';
import { useContacts } from '../hooks/useContacts';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { SearchInput } from '../components/ui/SearchInput';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { GallerySelect } from '../components/galleries/GallerySelect';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/utils';
import { CURRENCIES, SALE_TYPES, SALE_LOCATION_TYPES, PAYMENT_STATUSES, REPORTING_STATUSES, COLLECTOR_ANONYMITY_MODES } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type { SaleInsert, Currency, ReportingStatus, SaleLocationT, PaymentStatus, CollectorAnonymityMode } from '../types/database';

const REPORTING_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  reserved: 'bg-blue-100 text-blue-700',
  sold_pending_details: 'bg-amber-100 text-amber-700',
  sold_reported: 'bg-emerald-100 text-emerald-700',
  verified: 'bg-green-100 text-green-700',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  partial: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SalesPage() {
  const navigate = useNavigate();

  // ---- Filters ------------------------------------------------------------

  const [search, setSearch] = useState('');
  const [galleryFilter, setGalleryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { sales, loading, refetch, createSale, updateSale, deleteSale } = useSales({
    filters: {
      search: search || undefined,
      galleryId: galleryFilter || undefined,
    },
  });

  // Client-side status filter (useSales doesn't support it natively)
  const filteredSales = statusFilter
    ? sales.filter((s) => s.reporting_status === statusFilter)
    : sales;

  // ---- Data for the form --------------------------------------------------

  const { artworks } = useArtworks();
  const { contacts } = useContacts();

  // ---- Modal state --------------------------------------------------------

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // ---- Form state ---------------------------------------------------------

  const [artworkId, setArtworkId] = useState('');
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [contactId, setContactId] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [commissionPercent, setCommissionPercent] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [saleCity, setSaleCity] = useState('');
  const [saleCountry, setSaleCountry] = useState('');
  const [saleType, setSaleType] = useState('');
  const [notes, setNotes] = useState('');
  // Reporting fields
  const [reportingStatus, setReportingStatus] = useState<ReportingStatus>('draft');
  const [saleLocationType, setSaleLocationType] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [discountPercent, setDiscountPercent] = useState('');
  const [salesChannel, setSalesChannel] = useState('');
  const [collectorAnonymityMode, setCollectorAnonymityMode] = useState<CollectorAnonymityMode>('named');
  const [negotiationNotes, setNegotiationNotes] = useState('');

  // ---- Edit / Delete state ------------------------------------------------

  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function startEdit(sale: { id: string; sale_date: string; sale_price: number }) {
    setEditingSaleId(sale.id);
    setEditDate(sale.sale_date ?? '');
    setEditPrice(String(sale.sale_price ?? ''));
  }

  function cancelEdit() {
    setEditingSaleId(null);
    setEditDate('');
    setEditPrice('');
  }

  async function saveEdit() {
    if (!editingSaleId) return;
    setEditSaving(true);
    await updateSale(editingSaleId, {
      sale_date: editDate || null,
      sale_price: editPrice ? parseFloat(editPrice) : null,
    } as never);
    setEditingSaleId(null);
    setEditSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteSale(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  // ---- Handlers -----------------------------------------------------------

  function resetForm() {
    setArtworkId('');
    setGalleryId(null);
    setContactId('');
    setSaleDate('');
    setSalePrice('');
    setCurrency('EUR');
    setCommissionPercent('');
    setBuyerName('');
    setBuyerEmail('');
    setSaleCity('');
    setSaleCountry('');
    setSaleType('');
    setNotes('');
    setReportingStatus('draft');
    setSaleLocationType('');
    setPaymentStatus('pending');
    setDiscountPercent('');
    setSalesChannel('');
    setCollectorAnonymityMode('named');
    setNegotiationNotes('');
  }

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  async function handleRecordSale(e: FormEvent) {
    e.preventDefault();

    if (!artworkId || !saleDate || !salePrice) return;

    setSaving(true);

    const data: SaleInsert = {
      artwork_id: artworkId,
      gallery_id: galleryId || null,
      contact_id: contactId || null,
      sale_date: saleDate,
      sale_price: parseFloat(salePrice),
      currency: currency as Currency,
      commission_percent: commissionPercent ? parseFloat(commissionPercent) : null,
      buyer_name: buyerName.trim() || null,
      buyer_email: buyerEmail.trim() || null,
      sale_city: saleCity.trim() || null,
      sale_country: saleCountry.trim() || null,
      sale_type: saleType || null,
      notes: notes.trim() || null,
      reporting_status: reportingStatus,
      sale_location_type: (saleLocationType || null) as SaleLocationT | null,
      payment_status: paymentStatus,
      discount_percent: discountPercent ? parseFloat(discountPercent) : null,
      sales_channel: salesChannel.trim() || null,
      collector_anonymity_mode: collectorAnonymityMode,
      negotiation_notes: negotiationNotes.trim() || null,
      reporting_due_date: saleDate ? new Date(new Date(saleDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
    };

    const created = await createSale(data);

    if (created) {
      // Auto-update artwork status to 'sold'
      await supabase
        .from('artworks')
        .update({ status: 'sold' })
        .eq('id', artworkId);

      resetForm();
      setShowModal(false);
    }

    setSaving(false);
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Sales
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            View and record artwork sales.
          </p>
        </div>

        <Button onClick={() => setShowModal(true)}>
          Record Sale
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by buyer name..."
          className="max-w-md"
        />

        <div className="w-full sm:w-48">
          <GallerySelect
            value={galleryFilter}
            onChange={setGalleryFilter}
            label="Gallery"
          />
        </div>

        <div className="w-full sm:w-40">
          <Select
            label="Status"
            options={[
              { value: '', label: 'All Statuses' },
              ...REPORTING_STATUSES,
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredSales.length === 0 && (
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
                d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
              />
            </svg>
          }
          title={search || galleryFilter || statusFilter ? 'No sales found' : 'No sales yet'}
          description={
            search || galleryFilter || statusFilter
              ? 'Try adjusting your search terms or filters.'
              : 'Record your first sale to start tracking revenue.'
          }
          action={
            !search && !galleryFilter && !statusFilter ? (
              <Button onClick={() => setShowModal(true)}>
                Record First Sale
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Sales table */}
      {!loading && filteredSales.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-primary-100">
          <table className="min-w-full divide-y divide-primary-100">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Artwork
                </th>
                <th className="hidden md:table-cell px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Gallery
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Buyer
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Date
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                  Price
                </th>
                <th className="hidden sm:table-cell px-2 py-2 sm:px-4 sm:py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                  Commission
                </th>
                <th className="hidden lg:table-cell px-2 py-2 sm:px-4 sm:py-3 text-center text-xs font-medium uppercase tracking-wider text-primary-500">
                  Status
                </th>
                <th className="hidden lg:table-cell px-2 py-2 sm:px-4 sm:py-3 text-center text-xs font-medium uppercase tracking-wider text-primary-500">
                  Payment
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50 bg-white">
              {filteredSales.map((sale) => {
                const isEditing = editingSaleId === sale.id;
                const isConfirmingDelete = confirmDeleteId === sale.id;
                return (
                <tr
                  key={sale.id}
                  className="hover:bg-primary-50 transition-colors"
                >
                  <td
                    className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 cursor-pointer"
                    onClick={() => navigate(`/artworks/${sale.artwork_id}`)}
                  >
                    <div className="text-sm font-medium text-primary-900">
                      {sale.artworks?.title ?? 'Unknown Artwork'}
                    </div>
                    <div className="text-xs text-primary-400">
                      {sale.artworks?.reference_code ?? ''}
                    </div>
                  </td>
                  <td className="hidden md:table-cell whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-sm text-primary-600">
                    {sale.galleries?.name ?? '-'}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-sm text-primary-600">
                    {sale.contacts
                      ? `${sale.contacts.first_name} ${sale.contacts.last_name}`
                      : sale.buyer_name ?? '-'}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-sm text-primary-600">
                    {isEditing ? (
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-36 rounded border border-primary-300 px-2 py-1 text-sm"
                      />
                    ) : (
                      formatDate(sale.sale_date)
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-right text-sm font-medium text-primary-900">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-28 rounded border border-primary-300 px-2 py-1 text-sm text-right"
                      />
                    ) : (
                      formatCurrency(sale.sale_price, sale.currency)
                    )}
                  </td>
                  <td className="hidden sm:table-cell whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-right text-sm text-primary-600">
                    {sale.commission_percent != null
                      ? `${sale.commission_percent}%`
                      : '-'}
                  </td>
                  <td className="hidden lg:table-cell whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-center">
                    <Badge className={REPORTING_STATUS_COLORS[sale.reporting_status] || 'bg-gray-100 text-gray-700'}>
                      {REPORTING_STATUSES.find((s) => s.value === sale.reporting_status)?.label || sale.reporting_status}
                    </Badge>
                  </td>
                  <td className="hidden lg:table-cell whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-center">
                    <Badge className={PAYMENT_STATUS_COLORS[sale.payment_status] || 'bg-gray-100 text-gray-700'}>
                      {PAYMENT_STATUSES.find((s) => s.value === sale.payment_status)?.label || sale.payment_status}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={saveEdit}
                            disabled={editSaving}
                            className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                            title="Save"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded p-1 text-primary-400 hover:bg-primary-100"
                            title="Cancel"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); startEdit(sale); }}
                            className="rounded p-1 text-primary-400 hover:bg-primary-100 hover:text-primary-700"
                            title="Edit date & price"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                          </button>
                          {isConfirmingDelete ? (
                            <>
                              <button
                                onClick={() => handleDelete(sale.id)}
                                disabled={deletingId === sale.id}
                                className="rounded px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                              >
                                {deletingId === sale.id ? '...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded px-2 py-1 text-xs font-medium text-primary-600 bg-primary-100 hover:bg-primary-200"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(sale.id); }}
                              className="rounded p-1 text-primary-400 hover:bg-red-50 hover:text-red-600"
                              title="Delete sale"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Sale Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          resetForm();
          setShowModal(false);
        }}
        title="Record Sale"
        size="2xl"
      >
        <form onSubmit={handleRecordSale} className="space-y-4">
          <Select
            label="Artwork *"
            options={artworks.map((a) => ({
              value: a.id,
              label: `${a.title} (${a.reference_code || a.inventory_number || 'No ref'})`,
            }))}
            value={artworkId}
            onChange={(e) => setArtworkId(e.target.value)}
            placeholder="Select artwork"
          />

          <GallerySelect
            value={galleryId}
            onChange={setGalleryId}
            label="Gallery"
          />

          <Select
            label="Contact"
            options={[
              { value: '', label: 'No contact' },
              ...contacts.map((c) => ({
                value: c.id,
                label: `${c.first_name} ${c.last_name}`,
              })),
            ]}
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          />

          <Input
            label="Sale Date *"
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Sale Price *"
              type="number"
              placeholder="0.00"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
            <Select
              label="Currency"
              options={[...CURRENCIES]}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>

          <Input
            label="Commission %"
            type="number"
            placeholder="e.g. 20"
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(e.target.value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Buyer Name"
              placeholder="Buyer's name"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
            <Input
              label="Buyer Email"
              type="email"
              placeholder="buyer@example.com"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="City"
              placeholder="e.g. Basel"
              value={saleCity}
              onChange={(e) => setSaleCity(e.target.value)}
            />
            <Input
              label="Country"
              placeholder="e.g. Switzerland"
              value={saleCountry}
              onChange={(e) => setSaleCountry(e.target.value)}
            />
          </div>

          <Select
            label="Sale Type"
            options={[
              { value: '', label: 'Select type' },
              ...SALE_TYPES,
            ]}
            value={saleType}
            onChange={(e) => setSaleType(e.target.value)}
          />

          {/* --- Reporting Section --- */}
          <div className="border-t border-primary-100 pt-4 mt-2">
            <p className="text-xs font-medium uppercase tracking-wider text-primary-400 mb-3">Reporting Details</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Reporting Status"
                options={[...REPORTING_STATUSES]}
                value={reportingStatus}
                onChange={(e) => setReportingStatus(e.target.value as ReportingStatus)}
              />
              <Select
                label="Payment Status"
                options={[...PAYMENT_STATUSES]}
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
              <Select
                label="Sale Location"
                options={[
                  { value: '', label: 'Select location type' },
                  ...SALE_LOCATION_TYPES,
                ]}
                value={saleLocationType}
                onChange={(e) => setSaleLocationType(e.target.value)}
              />
              <Select
                label="Collector Privacy"
                options={[...COLLECTOR_ANONYMITY_MODES]}
                value={collectorAnonymityMode}
                onChange={(e) => setCollectorAnonymityMode(e.target.value as CollectorAnonymityMode)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
              <Input
                label="Discount %"
                type="number"
                placeholder="e.g. 10"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
              <Input
                label="Sales Channel"
                placeholder="e.g. Direct, Referral, Online"
                value={salesChannel}
                onChange={(e) => setSalesChannel(e.target.value)}
              />
            </div>
          </div>

          <Textarea
            label="Notes"
            placeholder="Any additional information..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Textarea
            label="Negotiation Notes"
            placeholder="Internal negotiation details..."
            value={negotiationNotes}
            onChange={(e) => setNegotiationNotes(e.target.value)}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-primary-100 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setShowModal(false);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Record Sale
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
