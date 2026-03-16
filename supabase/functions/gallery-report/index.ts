// ---------------------------------------------------------------------------
// NOA Inventory -- Supabase Edge Function: gallery-report
// Cron-triggered quarterly function that generates gallery performance reports
// and emails them to gallery contacts and admin users.
// SECURITY: Requires CRON_SECRET header or valid admin JWT.
// ---------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GalleryInfo {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  country: string | null;
  commission_rate: number | null;
  commission_gallery: number | null;
}

interface AllocatedArtwork {
  id: string;
  title: string;
  status: string;
  consigned_since: string | null;
  series: string | null;
  price: number | null;
  currency: string;
}

interface GallerySale {
  id: string;
  sale_price: number;
  currency: string;
  sale_date: string;
  commission_percent: number | null;
  artwork_title: string;
}

interface GalleryInvoice {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  currency: string;
  due_date: string | null;
}

interface AgingBracket {
  label: string;
  artworks: AllocatedArtwork[];
}

interface GalleryMetrics {
  gallery: GalleryInfo;
  artworks: AllocatedArtwork[];
  sales: GallerySale[];
  invoices: GalleryInvoice[];
  totalAllocated: number;
  totalSoldCount: number;
  totalRevenue: number;
  revenueCurrency: string;
  sellThroughRate: number;
  avgDaysToSale: number | null;
  commissionEarned: number;
  outstandingInvoicesCount: number;
  outstandingInvoicesTotal: number;
  agingBrackets: AgingBracket[];
}

interface ReportResult {
  galleries_processed: number;
  emails_sent: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Timing-safe string comparison
// ---------------------------------------------------------------------------

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  if (aBuf.length !== bBuf.length) return false;
  let result = 0;
  for (let i = 0; i < aBuf.length; i++) { result |= aBuf[i] ^ bBuf[i]; }
  return result === 0;
}

// ---------------------------------------------------------------------------
// Resend email
// ---------------------------------------------------------------------------

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'NOA Contemporary <noreply@noacontemporary.com>';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = (errorData as Record<string, string>)?.message ?? `HTTP ${response.status}`;
    throw new Error(`Resend API failed: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Get admin email from auth.users
// ---------------------------------------------------------------------------

async function getAdminEmail(
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  const { data: adminProfiles } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('role', 'admin')
    .limit(1);

  if (!adminProfiles || adminProfiles.length === 0) return null;

  const { data, error } = await supabase.auth.admin.getUserById(adminProfiles[0].user_id);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

// ---------------------------------------------------------------------------
// Quarter helpers
// ---------------------------------------------------------------------------

function getQuarterInfo(date: Date): { quarter: number; year: number; startDate: string; endDate: string } {
  const month = date.getMonth(); // 0-indexed
  const quarter = Math.floor(month / 3) + 1;
  const year = date.getFullYear();

  // Report covers the PREVIOUS quarter
  let reportQuarter = quarter - 1;
  let reportYear = year;
  if (reportQuarter === 0) {
    reportQuarter = 4;
    reportYear = year - 1;
  }

  const startMonth = (reportQuarter - 1) * 3; // 0-indexed
  const startDate = new Date(reportYear, startMonth, 1).toISOString().split('T')[0];
  const endDate = new Date(reportYear, startMonth + 3, 0).toISOString().split('T')[0]; // last day of quarter

  return { quarter: reportQuarter, year: reportYear, startDate, endDate };
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Fetch gallery data
// ---------------------------------------------------------------------------

async function fetchGalleryMetrics(
  supabase: ReturnType<typeof createClient>,
  gallery: GalleryInfo,
  quarterStart: string,
  quarterEnd: string,
): Promise<GalleryMetrics> {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const now = new Date();

  // Fetch artworks allocated to this gallery (current + sold through it)
  const { data: artworksRaw } = await supabase
    .from('artworks')
    .select('id, title, status, consigned_since, series, price, currency')
    .eq('gallery_id', gallery.id);

  const artworks: AllocatedArtwork[] = (artworksRaw || []).map((a: Record<string, unknown>) => ({
    id: a.id as string,
    title: a.title as string,
    status: a.status as string,
    consigned_since: a.consigned_since as string | null,
    series: a.series as string | null,
    price: a.price as number | null,
    currency: (a.currency as string) || 'CHF',
  }));

  // Fetch sales through this gallery (all time for full metrics, but we also note quarter)
  const { data: salesRaw } = await supabase
    .from('sales')
    .select('id, sale_price, currency, sale_date, commission_percent, artwork_id')
    .eq('gallery_id', gallery.id);

  // Resolve artwork titles for sales
  const sales: GallerySale[] = [];
  for (const s of (salesRaw || [])) {
    let artworkTitle = 'Unknown';
    if (s.artwork_id) {
      const { data: aw } = await supabase
        .from('artworks')
        .select('title')
        .eq('id', s.artwork_id)
        .single();
      if (aw?.title) artworkTitle = aw.title;
    }
    sales.push({
      id: s.id,
      sale_price: s.sale_price,
      currency: s.currency || 'CHF',
      sale_date: s.sale_date,
      commission_percent: s.commission_percent,
      artwork_title: artworkTitle,
    });
  }

  // Filter sales within the reporting quarter
  const quarterSales = sales.filter((s) => s.sale_date >= quarterStart && s.sale_date <= quarterEnd);

  // Fetch invoices for this gallery
  const { data: invoicesRaw } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total, currency, due_date')
    .eq('gallery_id', gallery.id);

  const invoices: GalleryInvoice[] = (invoicesRaw || []).map((inv: Record<string, unknown>) => ({
    id: inv.id as string,
    invoice_number: inv.invoice_number as string,
    status: inv.status as string,
    total: inv.total as number,
    currency: (inv.currency as string) || 'CHF',
    due_date: inv.due_date as string | null,
  }));

  // ---------- Compute metrics ----------

  const totalAllocated = artworks.length;
  const totalSoldCount = quarterSales.length;

  // Revenue in original currency -- sum all quarter sales
  const totalRevenue = quarterSales.reduce((sum, s) => sum + s.sale_price, 0);
  const revenueCurrency = quarterSales.length > 0 ? quarterSales[0].currency : 'CHF';

  // Sell-through rate: sold in quarter / total allocated (avoid div by 0)
  const sellThroughRate = totalAllocated > 0 ? totalSoldCount / totalAllocated : 0;

  // Avg days to sale: for sold artworks that have consigned_since, compute days from consigned to sale
  const daysToSaleValues: number[] = [];
  for (const sale of quarterSales) {
    // find matching artwork
    const matchedArtwork = artworks.find((a) => {
      // artwork may have been sold -- check if any artwork's id matches via sale.artwork_title
      return a.title === sale.artwork_title;
    });
    // Also try by looking up the artwork_id from salesRaw
    const saleRaw = (salesRaw || []).find((s: Record<string, unknown>) => s.id === sale.id);
    let consignedSince: string | null = matchedArtwork?.consigned_since || null;
    if (!consignedSince && saleRaw?.artwork_id) {
      const matched = artworks.find((a) => a.id === saleRaw.artwork_id);
      consignedSince = matched?.consigned_since || null;
    }
    if (consignedSince) {
      const days = Math.floor((new Date(sale.sale_date).getTime() - new Date(consignedSince).getTime()) / MS_PER_DAY);
      if (days >= 0) daysToSaleValues.push(days);
    }
  }
  const avgDaysToSale = daysToSaleValues.length > 0
    ? Math.round(daysToSaleValues.reduce((a, b) => a + b, 0) / daysToSaleValues.length)
    : null;

  // Commission earned (gallery's share)
  let commissionEarned = 0;
  for (const sale of quarterSales) {
    const commPct = sale.commission_percent ?? gallery.commission_gallery ?? gallery.commission_rate ?? 0;
    commissionEarned += sale.sale_price * (commPct / 100);
  }

  // Outstanding invoices
  const outstandingInvoices = invoices.filter(
    (inv) => inv.status !== 'paid' && inv.status !== 'cancelled',
  );
  const outstandingInvoicesCount = outstandingInvoices.length;
  const outstandingInvoicesTotal = outstandingInvoices.reduce((sum, inv) => sum + inv.total, 0);

  // Consignment aging breakdown (for currently allocated artworks with consigned_since)
  const consignedArtworks = artworks.filter(
    (a) => a.consigned_since && (a.status === 'on_consignment' || a.status === 'available'),
  );

  const brackets: AgingBracket[] = [
    { label: '< 90 days', artworks: [] },
    { label: '90 - 180 days', artworks: [] },
    { label: '180 - 365 days', artworks: [] },
    { label: '> 365 days', artworks: [] },
  ];

  for (const artwork of consignedArtworks) {
    if (!artwork.consigned_since) continue;
    const days = Math.floor((now.getTime() - new Date(artwork.consigned_since).getTime()) / MS_PER_DAY);
    if (days < 90) brackets[0].artworks.push(artwork);
    else if (days < 180) brackets[1].artworks.push(artwork);
    else if (days < 365) brackets[2].artworks.push(artwork);
    else brackets[3].artworks.push(artwork);
  }

  return {
    gallery,
    artworks,
    sales: quarterSales,
    invoices,
    totalAllocated,
    totalSoldCount,
    totalRevenue,
    revenueCurrency,
    sellThroughRate,
    avgDaysToSale,
    commissionEarned,
    outstandingInvoicesCount,
    outstandingInvoicesTotal,
    agingBrackets: brackets,
  };
}

// ---------------------------------------------------------------------------
// Build HTML email report
// ---------------------------------------------------------------------------

function buildReportHtml(metrics: GalleryMetrics, quarter: number, year: number): string {
  const { gallery, sales, agingBrackets } = metrics;

  // -- KPI cards --
  const kpiCards = `
    <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px;">
      ${kpiCard('Artworks Allocated', String(metrics.totalAllocated), '#2563EB')}
      ${kpiCard('Sold (Q' + quarter + ')', String(metrics.totalSoldCount), '#059669')}
      ${kpiCard('Revenue (Q' + quarter + ')', formatCurrency(metrics.totalRevenue, metrics.revenueCurrency), '#7C3AED')}
      ${kpiCard('Sell-Through Rate', formatPercent(metrics.sellThroughRate), '#D97706')}
      ${kpiCard('Commission Earned', formatCurrency(metrics.commissionEarned, metrics.revenueCurrency), '#DB2777')}
    </div>`;

  // -- Sales detail table --
  let salesTableHtml = '';
  if (sales.length > 0) {
    const salesRows = sales.map((s) => {
      const commPct = s.commission_percent ?? gallery.commission_gallery ?? gallery.commission_rate ?? 0;
      const commAmt = s.sale_price * (commPct / 100);
      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #374151;">${escapeHtml(formatDate(s.sale_date))}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #374151;">${escapeHtml(s.artwork_title)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #374151; text-align: right;">${escapeHtml(formatCurrency(s.sale_price, s.currency))}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #374151; text-align: right;">${escapeHtml(formatCurrency(commAmt, s.currency))} (${commPct}%)</td>
        </tr>`;
    }).join('');

    salesTableHtml = `
      <div style="margin-bottom: 28px;">
        <h2 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #2563EB;">Sales Detail</h2>
        <table style="width: 100%; border-collapse: collapse; background: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #E5E7EB;">
          <thead>
            <tr style="background: #F9FAFB;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Date</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Artwork</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Sale Price</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Commission</th>
            </tr>
          </thead>
          <tbody>${salesRows}</tbody>
        </table>
      </div>`;
  } else {
    salesTableHtml = `
      <div style="margin-bottom: 28px;">
        <h2 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #2563EB;">Sales Detail</h2>
        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          No sales recorded in Q${quarter} ${year}.
        </div>
      </div>`;
  }

  // -- Consignment aging table --
  const hasConsigned = agingBrackets.some((b) => b.artworks.length > 0);
  let agingTableHtml = '';
  if (hasConsigned) {
    const agingRows = agingBrackets.map((bracket) => {
      const titles = bracket.artworks.length > 0
        ? bracket.artworks.map((a) => escapeHtml(a.title)).join(', ')
        : '&mdash;';
      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; font-weight: 600; color: #374151; width: 140px;">${escapeHtml(bracket.label)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #374151; text-align: center; width: 60px;">${bracket.artworks.length}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #6B7280;">${titles}</td>
        </tr>`;
    }).join('');

    agingTableHtml = `
      <div style="margin-bottom: 28px;">
        <h2 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #D97706;">Consignment Aging</h2>
        <table style="width: 100%; border-collapse: collapse; background: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #E5E7EB;">
          <thead>
            <tr style="background: #F9FAFB;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Bracket</th>
              <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Count</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Artworks</th>
            </tr>
          </thead>
          <tbody>${agingRows}</tbody>
        </table>
      </div>`;
  }

  // -- Outstanding invoices summary --
  let invoicesHtml = '';
  const outstandingInvoices = metrics.invoices.filter(
    (inv) => inv.status !== 'paid' && inv.status !== 'cancelled',
  );
  if (outstandingInvoices.length > 0) {
    const invoiceRows = outstandingInvoices.map((inv) => {
      const dueDateStr = inv.due_date ? formatDate(inv.due_date) : '&mdash;';
      const isOverdue = inv.due_date && new Date(inv.due_date) < new Date();
      const statusColor = isOverdue ? '#DC2626' : (inv.status === 'sent' ? '#D97706' : '#6B7280');
      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #374151;">${escapeHtml(inv.invoice_number)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: ${statusColor}; font-weight: 600; text-transform: uppercase;">${escapeHtml(isOverdue ? 'overdue' : inv.status)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #374151; text-align: right;">${escapeHtml(formatCurrency(inv.total, inv.currency))}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #374151;">${dueDateStr}</td>
        </tr>`;
    }).join('');

    invoicesHtml = `
      <div style="margin-bottom: 28px;">
        <h2 style="font-size: 16px; font-weight: 700; color: #111827; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #DC2626;">Outstanding Invoices</h2>
        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; font-size: 14px; color: #991B1B;">
          <strong>${metrics.outstandingInvoicesCount}</strong> outstanding invoice${metrics.outstandingInvoicesCount !== 1 ? 's' : ''} totalling <strong>${formatCurrency(metrics.outstandingInvoicesTotal, outstandingInvoices[0]?.currency || 'CHF')}</strong>
        </div>
        <table style="width: 100%; border-collapse: collapse; background: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #E5E7EB;">
          <thead>
            <tr style="background: #F9FAFB;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Invoice #</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</th>
            </tr>
          </thead>
          <tbody>${invoiceRows}</tbody>
        </table>
      </div>`;
  }

  // -- Avg days to sale --
  const avgDaysStr = metrics.avgDaysToSale !== null ? `${metrics.avgDaysToSale} days` : 'N/A';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NOA Gallery Performance Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 680px; margin: 0 auto; padding: 24px 16px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1E293B 0%, #334155 100%); border-radius: 12px 12px 0 0; padding: 32px 24px; text-align: center;">
      <div style="font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: 2px; margin-bottom: 4px;">NOA</div>
      <div style="font-size: 12px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.5px;">Contemporary</div>
      <div style="width: 40px; height: 2px; background: #60A5FA; margin: 16px auto;"></div>
      <div style="font-size: 20px; font-weight: 600; color: #E2E8F0;">Gallery Performance Report</div>
      <div style="font-size: 14px; color: #94A3B8; margin-top: 6px;">Q${quarter} ${year}</div>
    </div>

    <!-- Gallery info bar -->
    <div style="background: #FFFFFF; border-left: 1px solid #E5E7EB; border-right: 1px solid #E5E7EB; padding: 20px 24px; border-bottom: 1px solid #E5E7EB;">
      <div style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 4px;">${escapeHtml(gallery.name)}</div>
      <div style="font-size: 13px; color: #6B7280;">
        ${gallery.contact_person ? escapeHtml(gallery.contact_person) + ' &bull; ' : ''}
        ${gallery.country ? escapeHtml(gallery.country) + ' &bull; ' : ''}
        Commission: ${gallery.commission_gallery ?? gallery.commission_rate ?? 0}%
      </div>
    </div>

    <!-- Period summary -->
    <div style="background: #EFF6FF; border-left: 1px solid #E5E7EB; border-right: 1px solid #E5E7EB; padding: 16px 24px; border-bottom: 1px solid #BFDBFE;">
      <div style="font-size: 13px; color: #1E40AF;">
        Reporting period: <strong>Q${quarter} ${year}</strong>
        ${metrics.avgDaysToSale !== null ? ` &bull; Avg. days to sale: <strong>${avgDaysStr}</strong>` : ''}
      </div>
    </div>

    <!-- Content area -->
    <div style="background: #F9FAFB; border-left: 1px solid #E5E7EB; border-right: 1px solid #E5E7EB; padding: 24px;">

      <!-- KPI Cards -->
      ${kpiCards}

      <!-- Sales Detail -->
      ${salesTableHtml}

      <!-- Consignment Aging -->
      ${agingTableHtml}

      <!-- Outstanding Invoices -->
      ${invoicesHtml}

    </div>

    <!-- Footer -->
    <div style="background: #1E293B; border-radius: 0 0 12px 12px; padding: 24px; text-align: center;">
      <div style="font-size: 12px; color: #94A3B8; margin-bottom: 8px;">
        This report was automatically generated by NOA Contemporary Art Inventory.
      </div>
      <div style="font-size: 11px; color: #64748B;">
        For questions or corrections, please contact your NOA representative.
      </div>
    </div>

  </div>
</body>
</html>`;
}

function kpiCard(label: string, value: string, color: string): string {
  return `
    <div style="flex: 1 1 140px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; text-align: center; min-width: 120px;">
      <div style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">${escapeHtml(label)}</div>
      <div style="font-size: 20px; font-weight: 800; color: ${color};">${escapeHtml(value)}</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  try {
    // ---- Verify caller authorization ----------------------------------------
    const cronSecret = Deno.env.get('CRON_SECRET');
    const reqSecret = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('Authorization');

    let authorized = false;

    // Method 1: shared CRON_SECRET
    if (cronSecret && reqSecret && timingSafeEqual(reqSecret, cronSecret)) {
      authorized = true;
    }

    // Method 2: valid admin JWT
    if (!authorized && authHeader) {
      const supabaseUrl_ = Deno.env.get('SUPABASE_URL');
      const anonKey_ = Deno.env.get('SUPABASE_ANON_KEY');
      if (supabaseUrl_ && anonKey_) {
        const callerClient = createClient(supabaseUrl_, anonKey_, {
          global: { headers: { Authorization: authHeader } },
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: { user } } = await callerClient.auth.getUser();
        if (user) {
          const serviceUrl = Deno.env.get('SUPABASE_URL');
          const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          if (serviceUrl && serviceKey) {
            const serviceClient = createClient(serviceUrl, serviceKey);
            const { data: profile } = await serviceClient
              .from('user_profiles')
              .select('role')
              .eq('user_id', user.id)
              .single();
            if (profile?.role === 'admin') authorized = true;
          }
        }
      }
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: provide x-cron-secret header or admin JWT' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ---- Create Supabase admin client ---------------------------------------
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ---- Determine quarter --------------------------------------------------
    const { quarter, year, startDate, endDate } = getQuarterInfo(new Date());

    // ---- Fetch galleries with email set -------------------------------------
    // Only process galleries that have at least 1 artwork or sale
    const { data: galleriesRaw, error: galleriesError } = await supabase
      .from('galleries')
      .select('id, name, contact_person, email, country, commission_rate, commission_gallery')
      .not('email', 'is', null);

    if (galleriesError) {
      console.error('Failed to query galleries:', galleriesError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to query galleries' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!galleriesRaw || galleriesRaw.length === 0) {
      return new Response(
        JSON.stringify({ galleries_processed: 0, emails_sent: 0, errors: ['No galleries with email found'] }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ---- Get admin email for CC ---------------------------------------------
    const adminEmail = await getAdminEmail(supabase);

    // ---- Process each gallery -----------------------------------------------
    const result: ReportResult = {
      galleries_processed: 0,
      emails_sent: 0,
      errors: [],
    };

    for (const gRaw of galleriesRaw) {
      const gallery: GalleryInfo = {
        id: gRaw.id,
        name: gRaw.name,
        contact_person: gRaw.contact_person,
        email: gRaw.email,
        country: gRaw.country,
        commission_rate: gRaw.commission_rate,
        commission_gallery: gRaw.commission_gallery,
      };

      try {
        // Check if gallery has at least 1 artwork or 1 sale
        const { count: artworkCount } = await supabase
          .from('artworks')
          .select('id', { count: 'exact', head: true })
          .eq('gallery_id', gallery.id);

        const { count: saleCount } = await supabase
          .from('sales')
          .select('id', { count: 'exact', head: true })
          .eq('gallery_id', gallery.id);

        if ((artworkCount ?? 0) === 0 && (saleCount ?? 0) === 0) {
          continue; // Skip galleries with no artworks or sales
        }

        // Fetch metrics
        const metrics = await fetchGalleryMetrics(supabase, gallery, startDate, endDate);
        result.galleries_processed++;

        // Build HTML report
        const html = buildReportHtml(metrics, quarter, year);
        const subject = `NOA Contemporary \u2014 Gallery Performance Report Q${quarter} ${year} \u2014 ${gallery.name}`;

        // Send to gallery contact
        if (gallery.email) {
          try {
            await sendEmail(gallery.email, subject, html);
            result.emails_sent++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error(`Failed to send report to gallery ${gallery.name} (${gallery.email}): ${msg}`);
            result.errors.push(`Gallery "${gallery.name}" email failed: ${msg}`);
          }
        }

        // Send copy to admin
        if (adminEmail && adminEmail !== gallery.email) {
          try {
            await sendEmail(adminEmail, `[Admin Copy] ${subject}`, html);
            result.emails_sent++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            console.error(`Failed to send admin copy for gallery ${gallery.name}: ${msg}`);
            result.errors.push(`Admin copy for "${gallery.name}" failed: ${msg}`);
          }
        }

        // Log the report in activity_log
        try {
          // Find admin user_id for the log entry
          const { data: adminProfiles } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('role', 'admin')
            .limit(1);

          const logUserId = adminProfiles?.[0]?.user_id;
          if (logUserId) {
            await supabase.from('activity_log').insert({
              user_id: logUserId,
              action: 'gallery_report_sent',
              entity_type: 'gallery',
              entity_id: gallery.id,
              changes: {
                quarter,
                year,
                gallery_name: gallery.name,
                gallery_email: gallery.email,
                artworks_allocated: metrics.totalAllocated,
                sold_count: metrics.totalSoldCount,
                total_revenue: metrics.totalRevenue,
                revenue_currency: metrics.revenueCurrency,
                sell_through_rate: metrics.sellThroughRate,
                commission_earned: metrics.commissionEarned,
                outstanding_invoices: metrics.outstandingInvoicesCount,
              },
            });
          }
        } catch (logErr) {
          const msg = logErr instanceof Error ? logErr.message : 'Unknown error';
          console.error(`Failed to log report for gallery ${gallery.name}: ${msg}`);
          // Non-fatal -- don't add to errors
        }

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Error processing gallery ${gallery.name}: ${msg}`);
        result.errors.push(`Gallery "${gallery.name}": ${msg}`);
      }
    }

    // ---- Return summary -----------------------------------------------------
    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
