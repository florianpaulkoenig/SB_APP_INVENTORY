// ---------------------------------------------------------------------------
// Invoice payment velocity analytics — how fast each gallery pays invoices
// ---------------------------------------------------------------------------

export interface GalleryPaymentVelocity {
  galleryId: string;
  galleryName: string;
  avgDaysToPay: number;
  totalInvoices: number;
  paidOnTime: number;
  paidLate: number;
  stillOverdue: number;
  onTimeRate: number;
}

export interface InvoiceRecord {
  gallery_id: string;
  status: string;
  due_date: string | null;
  paid_date: string | null;
  issue_date: string | null;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.max(0, Math.round((b - a) / MS_PER_DAY));
}

/**
 * Compute payment velocity metrics grouped by gallery.
 */
export function computePaymentVelocity(
  invoices: InvoiceRecord[],
  galleryNames: Record<string, string>,
): GalleryPaymentVelocity[] {
  const grouped: Record<string, InvoiceRecord[]> = {};

  for (const inv of invoices) {
    if (!inv.gallery_id) continue;
    if (!grouped[inv.gallery_id]) grouped[inv.gallery_id] = [];
    grouped[inv.gallery_id].push(inv);
  }

  const now = new Date();
  const results: GalleryPaymentVelocity[] = [];

  for (const [galleryId, galleryInvoices] of Object.entries(grouped)) {
    let totalDaysToPay = 0;
    let paidCount = 0;
    let paidOnTime = 0;
    let paidLate = 0;
    let stillOverdue = 0;

    for (const inv of galleryInvoices) {
      const isPaid = inv.status === 'paid';
      const isCancelled = inv.status === 'cancelled';

      if (isPaid && inv.issue_date && inv.paid_date) {
        const days = daysBetween(inv.issue_date, inv.paid_date);
        totalDaysToPay += days;
        paidCount += 1;

        if (inv.due_date) {
          const paidTs = new Date(inv.paid_date).getTime();
          const dueTs = new Date(inv.due_date).getTime();
          if (paidTs <= dueTs) {
            paidOnTime += 1;
          } else {
            paidLate += 1;
          }
        } else {
          paidOnTime += 1;
        }
      } else if (!isPaid && !isCancelled && inv.due_date) {
        if (now.getTime() > new Date(inv.due_date).getTime()) {
          stillOverdue += 1;
        }
      }
    }

    const avgDaysToPay = paidCount > 0 ? Math.round(totalDaysToPay / paidCount) : 0;
    const totalDecided = paidOnTime + paidLate;
    const onTimeRate = totalDecided > 0
      ? Math.round((paidOnTime / totalDecided) * 100)
      : 0;

    results.push({
      galleryId,
      galleryName: galleryNames[galleryId] || 'Unknown gallery',
      avgDaysToPay,
      totalInvoices: galleryInvoices.length,
      paidOnTime,
      paidLate,
      stillOverdue,
      onTimeRate,
    });
  }

  return results.sort((a, b) => a.onTimeRate - b.onTimeRate);
}

/** Get galleries with the best payment track record. */
export function bestPayers(
  velocities: GalleryPaymentVelocity[],
  n = 5,
): GalleryPaymentVelocity[] {
  return [...velocities].sort((a, b) => b.onTimeRate - a.onTimeRate).slice(0, n);
}

/** Get galleries with the most overdue invoices. */
export function worstOverdue(
  velocities: GalleryPaymentVelocity[],
  n = 5,
): GalleryPaymentVelocity[] {
  return [...velocities].sort((a, b) => b.stillOverdue - a.stillOverdue).slice(0, n);
}
