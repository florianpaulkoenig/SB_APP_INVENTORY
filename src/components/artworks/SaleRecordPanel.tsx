// ---------------------------------------------------------------------------
// SaleRecordPanel -- Shows sale record on artwork detail page with edit/delete
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { formatCurrency, formatDate } from '../../lib/utils';
import { CURRENCIES, PAYMENT_STATUSES } from '../../lib/constants';

interface SaleRecord {
  id: string;
  sale_date: string | null;
  sale_price: number | null;
  currency: string;
  commission_percent: number | null;
  discount_percent: number | null;
  final_invoiced_amount: number | null;
  payment_status: string;
  buyer_name: string | null;
  notes: string | null;
  galleries?: { name: string } | null;
}

interface SaleRecordPanelProps {
  artworkId: string;
  artworkStatus: string;
  onSaleDeleted?: () => void;
}

export function SaleRecordPanel({ artworkId, artworkStatus, onSaleDeleted }: SaleRecordPanelProps) {
  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // Edit form state
  const [editDate, setEditDate] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCurrency, setEditCurrency] = useState('EUR');
  const [editCommission, setEditCommission] = useState('');
  const [editDiscount, setEditDiscount] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState('pending');
  const [editBuyerName, setEditBuyerName] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const fetchSale = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('id, sale_date, sale_price, currency, commission_percent, discount_percent, final_invoiced_amount, payment_status, buyer_name, notes, galleries(name)')
        .eq('artwork_id', artworkId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSale(data as SaleRecord | null);
    } catch {
      // No sale found — that's fine
      setSale(null);
    } finally {
      setLoading(false);
    }
  }, [artworkId]);

  useEffect(() => { fetchSale(); }, [fetchSale]);

  function startEdit() {
    if (!sale) return;
    setEditDate(sale.sale_date ?? '');
    setEditPrice(String(sale.sale_price ?? ''));
    setEditCurrency(sale.currency ?? 'EUR');
    setEditCommission(sale.commission_percent != null ? String(sale.commission_percent) : '');
    setEditDiscount(sale.discount_percent != null ? String(sale.discount_percent) : '');
    setEditPaymentStatus(sale.payment_status ?? 'pending');
    setEditBuyerName(sale.buyer_name ?? '');
    setEditNotes(sale.notes ?? '');
    setEditing(true);
  }

  async function handleSave() {
    if (!sale) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('sales')
        .update({
          sale_date: editDate || null,
          sale_price: editPrice ? parseFloat(editPrice) : null,
          currency: editCurrency,
          commission_percent: editCommission ? parseFloat(editCommission) : null,
          discount_percent: editDiscount ? parseFloat(editDiscount) : null,
          payment_status: editPaymentStatus,
          buyer_name: editBuyerName.trim() || null,
          notes: editNotes.trim() || null,
        } as never)
        .eq('id', sale.id);

      if (error) throw error;

      toast({ title: 'Sale updated', variant: 'success' });
      setEditing(false);
      await fetchSale();
    } catch {
      toast({ title: 'Error', description: 'Failed to update sale.', variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!sale) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', sale.id);

      if (error) throw error;

      // Reset artwork status back to available
      await supabase
        .from('artworks')
        .update({ status: 'available' } as never)
        .eq('id', artworkId);

      toast({ title: 'Sale deleted', description: 'Artwork status reset to available.', variant: 'success' });
      setSale(null);
      setShowDeleteConfirm(false);
      onSaleDeleted?.();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete sale.', variant: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  // Don't show if artwork isn't sold or no sale found
  if (loading) return null;
  if (!sale && artworkStatus !== 'sold') return null;
  if (!sale) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h2 className="font-display text-base font-semibold text-amber-800">
          Sale Record Missing
        </h2>
        <p className="mt-1 text-sm text-amber-700">
          This artwork is marked as sold but has no sale record in the database.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-primary-100 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-base font-semibold text-primary-900">
          Sale Record
        </h2>
        {!editing && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={startEdit}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              Delete Sale
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Sale Date"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />
            <Input
              label="Sale Price"
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
            />
            <Select
              label="Currency"
              options={[...CURRENCIES]}
              value={editCurrency}
              onChange={(e) => setEditCurrency(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Commission %"
              type="number"
              value={editCommission}
              onChange={(e) => setEditCommission(e.target.value)}
            />
            <Input
              label="Discount %"
              type="number"
              value={editDiscount}
              onChange={(e) => setEditDiscount(e.target.value)}
            />
            <Select
              label="Payment Status"
              options={[...PAYMENT_STATUSES]}
              value={editPaymentStatus}
              onChange={(e) => setEditPaymentStatus(e.target.value)}
            />
          </div>
          <Input
            label="Buyer Name"
            value={editBuyerName}
            onChange={(e) => setEditBuyerName(e.target.value)}
            maxLength={256}
          />
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
              maxLength={5000}
              className="w-full rounded-md border border-primary-300 px-3 py-2 text-sm focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">Sale Date</dt>
            <dd className="mt-1 text-sm text-primary-800">{sale.sale_date ? formatDate(sale.sale_date) : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">Sale Price</dt>
            <dd className="mt-1 text-sm font-semibold text-accent">
              {sale.sale_price != null ? formatCurrency(sale.sale_price, sale.currency) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">Gallery</dt>
            <dd className="mt-1 text-sm text-primary-800">{sale.galleries?.name ?? '—'}</dd>
          </div>
          {sale.commission_percent != null && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">Commission</dt>
              <dd className="mt-1 text-sm text-primary-800">{sale.commission_percent}%</dd>
            </div>
          )}
          {sale.discount_percent != null && sale.discount_percent > 0 && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">Discount</dt>
              <dd className="mt-1 text-sm text-primary-800">{sale.discount_percent}%</dd>
            </div>
          )}
          {sale.final_invoiced_amount != null && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">Invoiced Amount</dt>
              <dd className="mt-1 text-sm text-primary-800">{formatCurrency(sale.final_invoiced_amount, sale.currency)}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">Payment Status</dt>
            <dd className="mt-1">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                sale.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                sale.payment_status === 'overdue' ? 'bg-red-100 text-red-700' :
                sale.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {PAYMENT_STATUSES.find((s) => s.value === sale.payment_status)?.label ?? sale.payment_status}
              </span>
            </dd>
          </div>
          {sale.buyer_name && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">Buyer</dt>
              <dd className="mt-1 text-sm text-primary-800">{sale.buyer_name}</dd>
            </div>
          )}
          {sale.notes && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">Notes</dt>
              <dd className="mt-1 text-sm text-primary-700 whitespace-pre-wrap">{sale.notes}</dd>
            </div>
          )}
        </dl>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Sale Record"
        message="Are you sure you want to delete this sale record? The artwork status will be reset to available."
        confirmLabel="Delete Sale"
        variant="danger"
      />
    </section>
  );
}
