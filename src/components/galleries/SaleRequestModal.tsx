import { useState, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { CURRENCIES } from '../../lib/constants';

interface SaleRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  artworkId: string;
  artworkTitle: string;
  onSubmit: (data: {
    artwork_id: string;
    realized_price: number;
    currency: string;
    buyer_name?: string;
    notes?: string;
  }) => Promise<void>;
}

export function SaleRequestModal({
  isOpen,
  onClose,
  artworkId,
  artworkTitle,
  onSubmit,
}: SaleRequestModalProps) {
  const [realizedPrice, setRealizedPrice] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [buyerName, setBuyerName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const price = parseFloat(realizedPrice);
      if (isNaN(price) || price <= 0) return;

      try {
        setSubmitting(true);
        await onSubmit({
          artwork_id: artworkId,
          realized_price: price,
          currency,
          buyer_name: buyerName.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        // Reset form
        setRealizedPrice('');
        setCurrency('EUR');
        setBuyerName('');
        setNotes('');
        onClose();
      } catch {
        // Error handled by parent
      } finally {
        setSubmitting(false);
      }
    },
    [artworkId, realizedPrice, currency, buyerName, notes, onSubmit, onClose]
  );

  const handleClose = useCallback(() => {
    if (!submitting) {
      setRealizedPrice('');
      setCurrency('EUR');
      setBuyerName('');
      setNotes('');
      onClose();
    }
  }, [submitting, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Request Sale Approval">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Submit a sale request for <span className="font-medium">{artworkTitle}</span> for admin
          approval.
        </p>

        <div>
          <label htmlFor="realized-price" className="block text-sm font-medium text-gray-700 mb-1">
            Realized Price <span className="text-red-500">*</span>
          </label>
          <Input
            id="realized-price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={realizedPrice}
            onChange={(e) => setRealizedPrice(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <Select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label} ({c.symbol})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="buyer-name" className="block text-sm font-medium text-gray-700 mb-1">
            Buyer Name
          </label>
          <Input
            id="buyer-name"
            type="text"
            placeholder="Optional"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            maxLength={256}
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            rows={3}
            placeholder="Any additional information..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={5000}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || !realizedPrice || parseFloat(realizedPrice) <= 0}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
