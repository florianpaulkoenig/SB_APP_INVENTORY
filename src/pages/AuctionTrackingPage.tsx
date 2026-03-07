import { useState, useCallback, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { useAuctionAlerts } from '../hooks/useAuctionAlerts';
import { AUCTION_RESULTS, AUCTION_HOUSES, CURRENCIES } from '../lib/constants';

interface AlertForm {
  auction_house: string;
  sale_title: string;
  sale_date: string;
  lot_number: string;
  artwork_title: string;
  artwork_description: string;
  estimate_low: string;
  estimate_high: string;
  currency: string;
  source_url: string;
  notes: string;
}

interface UpdateForm {
  result: string;
  hammer_price: string;
  notes: string;
}

const emptyAlertForm: AlertForm = {
  auction_house: '',
  sale_title: '',
  sale_date: '',
  lot_number: '',
  artwork_title: '',
  artwork_description: '',
  estimate_low: '',
  estimate_high: '',
  currency: 'USD',
  source_url: '',
  notes: '',
};

const emptyUpdateForm: UpdateForm = {
  result: '',
  hammer_price: '',
  notes: '',
};

export function AuctionTrackingPage() {
  const { showSuccess, showError } = useToast();
  const { alerts, loading, createAlert, updateAlert, deleteAlert, matchToDatabase } = useAuctionAlerts();

  const [filterHouse, setFilterHouse] = useState('');
  const [filterResult, setFilterResult] = useState('');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [alertForm, setAlertForm] = useState<AlertForm>(emptyAlertForm);
  const [submitting, setSubmitting] = useState(false);

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateForm, setUpdateForm] = useState<UpdateForm>(emptyUpdateForm);

  const filteredAlerts = alerts.filter((a) => {
    if (filterHouse && a.auction_house !== filterHouse) return false;
    if (filterResult && a.result !== filterResult) return false;
    return true;
  });

  const upcomingCount = useMemo(
    () => alerts.filter((a) => a.result === 'upcoming').length,
    [alerts]
  );

  const currentYear = new Date().getFullYear();
  const soldThisYear = useMemo(
    () => alerts.filter((a) => {
      if (a.result !== 'sold' && a.result !== 'bought_in') return false;
      if (!a.sale_date) return false;
      return new Date(a.sale_date).getFullYear() === currentYear;
    }).length,
    [alerts, currentYear]
  );

  const totalHammerValue = useMemo(
    () => alerts.reduce((sum, a) => sum + (a.hammer_price || 0), 0),
    [alerts]
  );

  const avgEstimateAccuracy = useMemo(() => {
    const withBoth = alerts.filter((a) => a.hammer_price && a.estimate_low && a.estimate_high);
    if (withBoth.length === 0) return '—';
    const totalAccuracy = withBoth.reduce((sum, a) => {
      const mid = ((a.estimate_low || 0) + (a.estimate_high || 0)) / 2;
      if (mid === 0) return sum;
      return sum + ((a.hammer_price || 0) / mid) * 100;
    }, 0);
    return `${Math.round(totalAccuracy / withBoth.length)}%`;
  }, [alerts]);

  const handleCreateAlert = useCallback(async () => {
    if (!alertForm.artwork_title.trim()) {
      showError('Artwork title is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        auction_house: alertForm.auction_house || null,
        sale_title: alertForm.sale_title.trim() || null,
        sale_date: alertForm.sale_date || null,
        lot_number: alertForm.lot_number.trim() || null,
        artwork_title: alertForm.artwork_title.trim(),
        artwork_description: alertForm.artwork_description.trim() || null,
        estimate_low: alertForm.estimate_low ? parseFloat(alertForm.estimate_low) : null,
        estimate_high: alertForm.estimate_high ? parseFloat(alertForm.estimate_high) : null,
        currency: alertForm.currency || null,
        source_url: alertForm.source_url.trim() || null,
        notes: alertForm.notes.trim() || null,
      };
      await createAlert(payload as never);
      showSuccess('Alert created');
      setAddModalOpen(false);
      setAlertForm(emptyAlertForm);
    } catch {
      showError('Failed to create alert');
    } finally {
      setSubmitting(false);
    }
  }, [alertForm, createAlert, showSuccess, showError]);

  const openUpdateModal = useCallback((alert: typeof alerts[0]) => {
    setUpdatingId(alert.id);
    setUpdateForm({
      result: alert.result || '',
      hammer_price: alert.hammer_price ? String(alert.hammer_price) : '',
      notes: alert.notes || '',
    });
    setUpdateModalOpen(true);
  }, []);

  const handleUpdateResult = useCallback(async () => {
    if (!updatingId) return;
    setSubmitting(true);
    try {
      const payload = {
        result: updateForm.result || null,
        hammer_price: updateForm.hammer_price ? parseFloat(updateForm.hammer_price) : null,
        notes: updateForm.notes.trim() || null,
      };
      await updateAlert(updatingId, payload as never);
      showSuccess('Alert updated');
      setUpdateModalOpen(false);
      setUpdatingId(null);
    } catch {
      showError('Failed to update alert');
    } finally {
      setSubmitting(false);
    }
  }, [updatingId, updateForm, updateAlert, showSuccess, showError]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this auction alert?')) return;
    try {
      await deleteAlert(id);
      showSuccess('Alert deleted');
    } catch {
      showError('Failed to delete alert');
    }
  }, [deleteAlert, showSuccess, showError]);

  const handleMatch = useCallback(async (id: string) => {
    try {
      await matchToDatabase(id);
      showSuccess('Matched to database');
    } catch {
      showError('Failed to match');
    }
  }, [matchToDatabase, showSuccess, showError]);

  const getResultBadge = (result: string | null) => {
    if (!result) return <span className="text-gray-400">—</span>;
    const found = AUCTION_RESULTS.find((r) => r.value === result);
    return <Badge variant="default">{found ? found.label : result}</Badge>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Auction Tracking</h1>
        <Button variant="primary" onClick={() => { setAlertForm(emptyAlertForm); setAddModalOpen(true); }}>
          Add Alert
        </Button>
      </div>

      {/* Filter Row */}
      <div className="flex gap-4 flex-wrap">
        <Select
          label="Auction House"
          value={filterHouse}
          onChange={(e) => setFilterHouse(e.target.value)}
        >
          <option value="">All Houses</option>
          {AUCTION_HOUSES.map((h) => (
            <option key={h.value} value={h.value}>{h.label}</option>
          ))}
        </Select>
        <Select
          label="Result"
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}
        >
          <option value="">All Results</option>
          {AUCTION_RESULTS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </Select>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-gray-500 uppercase">Upcoming Lots</p>
          <p className="text-2xl font-bold">{upcomingCount}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase">Sold This Year</p>
          <p className="text-2xl font-bold">{soldThisYear}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase">Total Hammer Value</p>
          <p className="text-2xl font-bold">{formatCurrency(totalHammerValue, 'USD')}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase">Avg Estimate Accuracy</p>
          <p className="text-2xl font-bold">{avgEstimateAccuracy}</p>
        </Card>
      </div>

      {/* Table */}
      <Card>
        {filteredAlerts.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No auction alerts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auction House</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estimate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hammer Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matched</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{alert.auction_house || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{alert.sale_title || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {alert.sale_date ? formatDate(alert.sale_date) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{alert.lot_number || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{alert.artwork_title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {alert.estimate_low && alert.estimate_high
                        ? `${formatCurrency(alert.estimate_low, alert.currency)} – ${formatCurrency(alert.estimate_high, alert.currency)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {alert.hammer_price ? formatCurrency(alert.hammer_price, alert.currency) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">{getResultBadge(alert.result)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {alert.matched_artwork_id ? (
                        <Badge variant="default">Matched</Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {alert.ai_detected ? <Badge variant="default">AI</Badge> : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        {!alert.matched_artwork_id && (
                          <Button variant="primary" onClick={() => handleMatch(alert.id)}>Match</Button>
                        )}
                        <Button variant="primary" onClick={() => openUpdateModal(alert)}>Update</Button>
                        <Button variant="primary" onClick={() => handleDelete(alert.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Alert Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Alert">
        <div className="space-y-4">
          <Select
            label="Auction House"
            value={alertForm.auction_house}
            onChange={(e) => setAlertForm({ ...alertForm, auction_house: e.target.value })}
          >
            <option value="">Select house</option>
            {AUCTION_HOUSES.map((h) => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </Select>
          <Input
            label="Sale Title"
            value={alertForm.sale_title}
            onChange={(e) => setAlertForm({ ...alertForm, sale_title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Sale Date"
              type="date"
              value={alertForm.sale_date}
              onChange={(e) => setAlertForm({ ...alertForm, sale_date: e.target.value })}
            />
            <Input
              label="Lot Number"
              value={alertForm.lot_number}
              onChange={(e) => setAlertForm({ ...alertForm, lot_number: e.target.value })}
            />
          </div>
          <Input
            label="Artwork Title"
            value={alertForm.artwork_title}
            onChange={(e) => setAlertForm({ ...alertForm, artwork_title: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Artwork Description</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              rows={3}
              value={alertForm.artwork_description}
              onChange={(e) => setAlertForm({ ...alertForm, artwork_description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Estimate Low"
              type="number"
              value={alertForm.estimate_low}
              onChange={(e) => setAlertForm({ ...alertForm, estimate_low: e.target.value })}
            />
            <Input
              label="Estimate High"
              type="number"
              value={alertForm.estimate_high}
              onChange={(e) => setAlertForm({ ...alertForm, estimate_high: e.target.value })}
            />
            <Select
              label="Currency"
              value={alertForm.currency}
              onChange={(e) => setAlertForm({ ...alertForm, currency: e.target.value })}
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
          <Input
            label="Source URL"
            value={alertForm.source_url}
            onChange={(e) => setAlertForm({ ...alertForm, source_url: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              rows={3}
              value={alertForm.notes}
              onChange={(e) => setAlertForm({ ...alertForm, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="primary" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateAlert} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Alert'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Update Result Modal */}
      <Modal isOpen={updateModalOpen} onClose={() => setUpdateModalOpen(false)} title="Update Result">
        <div className="space-y-4">
          <Select
            label="Result"
            value={updateForm.result}
            onChange={(e) => setUpdateForm({ ...updateForm, result: e.target.value })}
          >
            <option value="">Select result</option>
            {AUCTION_RESULTS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
          <Input
            label="Hammer Price"
            type="number"
            value={updateForm.hammer_price}
            onChange={(e) => setUpdateForm({ ...updateForm, hammer_price: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              rows={3}
              value={updateForm.notes}
              onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="primary" onClick={() => setUpdateModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateResult} disabled={submitting}>
              {submitting ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
