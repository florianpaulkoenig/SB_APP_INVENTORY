// ---------------------------------------------------------------------------
// NOA Inventory -- Supabase Edge Function: check-reminders
// Cron job that checks for due reminders and sends email alerts.
// SECURITY: Requires CRON_SECRET header or valid admin JWT.
// ---------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Reminder {
  id: string;
  user_id: string;
  type: string;
  entity_type: string;
  entity_id: string;
  trigger_date: string;
  sent: boolean;
  notes: string | null;
}

interface ProcessResult {
  reminderId: string;
  success: boolean;
  error?: string;
}

// Timing-safe string comparison
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
// Entity detail lookups -- build a human-readable message for each type
// ---------------------------------------------------------------------------

async function buildConsignmentMessage(
  supabase: ReturnType<typeof createClient>,
  entityId: string,
): Promise<string> {
  // entity_id refers to an artwork_movements record (consignment type)
  const { data: movement } = await supabase
    .from('artwork_movements')
    .select('artwork_id, gallery_id, movement_date')
    .eq('id', entityId)
    .single();

  if (!movement) {
    return 'Consignment follow-up reminder (details unavailable)';
  }

  // Look up artwork title
  let artworkTitle = 'Unknown artwork';
  if (movement.artwork_id) {
    const { data: artwork } = await supabase
      .from('artworks')
      .select('title')
      .eq('id', movement.artwork_id)
      .single();
    if (artwork?.title) artworkTitle = artwork.title;
  }

  // Look up gallery name
  let galleryName = 'Unknown gallery';
  if (movement.gallery_id) {
    const { data: gallery } = await supabase
      .from('galleries')
      .select('name')
      .eq('id', movement.gallery_id)
      .single();
    if (gallery?.name) galleryName = gallery.name;
  }

  // Calculate months since consignment
  const consignedDate = new Date(movement.movement_date);
  const now = new Date();
  const months = Math.max(
    1,
    Math.round((now.getTime() - consignedDate.getTime()) / (1000 * 60 * 60 * 24 * 30)),
  );

  return `Artwork "${artworkTitle}" has been consigned to ${galleryName} for ${months} month${months !== 1 ? 's' : ''}`;
}

async function buildLoanReturnMessage(
  supabase: ReturnType<typeof createClient>,
  entityId: string,
): Promise<string> {
  const { data: loan } = await supabase
    .from('loans')
    .select('artwork_id, borrower, loan_end')
    .eq('id', entityId)
    .single();

  if (!loan) {
    return 'Loan return due (details unavailable)';
  }

  let artworkTitle = 'Unknown artwork';
  if (loan.artwork_id) {
    const { data: artwork } = await supabase
      .from('artworks')
      .select('title')
      .eq('id', loan.artwork_id)
      .single();
    if (artwork?.title) artworkTitle = artwork.title;
  }

  const borrower = loan.borrower || 'Unknown borrower';
  const dueDate = loan.loan_end ? new Date(loan.loan_end).toLocaleDateString() : 'unspecified date';

  return `Loan return due: "${artworkTitle}" loaned to ${borrower} (due ${dueDate})`;
}

async function buildInvoiceOverdueMessage(
  supabase: ReturnType<typeof createClient>,
  entityId: string,
): Promise<string> {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('invoice_number, total, currency, due_date')
    .eq('id', entityId)
    .single();

  if (!invoice) {
    return 'Invoice overdue (details unavailable)';
  }

  const number = invoice.invoice_number || 'N/A';
  const amount = invoice.total != null ? `${invoice.currency ?? 'EUR'} ${invoice.total.toFixed(2)}` : '';
  const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '';

  return `Invoice ${number} is overdue${amount ? ` (${amount})` : ''}${dueDate ? ` -- was due ${dueDate}` : ''}`;
}

async function buildTaskDueMessage(
  supabase: ReturnType<typeof createClient>,
  entityId: string,
): Promise<string> {
  const { data: task } = await supabase
    .from('tasks')
    .select('title, due_date')
    .eq('id', entityId)
    .single();

  if (!task) {
    return 'Task due (details unavailable)';
  }

  const title = task.title || 'Untitled task';
  return `Task "${title}" is due`;
}

// ---------------------------------------------------------------------------
// Build the right message based on reminder type
// ---------------------------------------------------------------------------

async function buildReminderMessage(
  supabase: ReturnType<typeof createClient>,
  reminder: Reminder,
): Promise<string> {
  switch (reminder.type) {
    case 'consignment_followup':
      return buildConsignmentMessage(supabase, reminder.entity_id);
    case 'loan_return':
      return buildLoanReturnMessage(supabase, reminder.entity_id);
    case 'invoice_overdue':
      return buildInvoiceOverdueMessage(supabase, reminder.entity_id);
    case 'task_due':
      return buildTaskDueMessage(supabase, reminder.entity_id);
    case 'collector_outreach':
      return reminder.notes || 'Collector outreach reminder';
    default:
      return `Reminder: ${reminder.type} (${reminder.entity_type} ${reminder.entity_id})`;
  }
}

// ---------------------------------------------------------------------------
// Look up user email from auth.users via the admin API
// ---------------------------------------------------------------------------

async function getUserEmail(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

// ---------------------------------------------------------------------------
// Send email directly via Resend API
// (Cannot use send-email Edge Function because service role key is not a JWT)
// ---------------------------------------------------------------------------

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'NOA Contemporary <noreply@noacontemporary.com>';

async function sendReminderEmail(
  _supabaseUrl: string,
  _serviceRoleKey: string,
  to: string,
  subject: string,
  body: string,
): Promise<void> {
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
      html: body,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = (errorData as Record<string, string>)?.message ?? `HTTP ${response.status}`;
    throw new Error(`Resend API failed: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Auto-detect consignment aging at 90/180/365 day thresholds
// ---------------------------------------------------------------------------

interface AgingResult {
  artworkId: string;
  threshold: number;
  success: boolean;
  error?: string;
}

const CONSIGNMENT_THRESHOLDS = [90, 180, 365];

async function checkConsignmentAging(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<AgingResult[]> {
  const results: AgingResult[] = [];

  // 1. Query artworks currently on consignment
  const { data: artworks, error: artworksError } = await supabase
    .from('artworks')
    .select('id, title, gallery_id, consigned_since, user_id')
    .eq('status', 'on_consignment')
    .not('consigned_since', 'is', null);

  if (artworksError || !artworks || artworks.length === 0) {
    if (artworksError) console.error('Failed to query consigned artworks:', artworksError.message);
    return results;
  }

  const now = new Date();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  for (const artwork of artworks) {
    const consignedSince = new Date(artwork.consigned_since);
    const daysConsigned = Math.floor((now.getTime() - consignedSince.getTime()) / MS_PER_DAY);

    for (const threshold of CONSIGNMENT_THRESHOLDS) {
      if (daysConsigned < threshold) continue;

      // Check if reminder already exists for this artwork + threshold
      const notePattern = `${threshold}-day consignment aging alert`;
      const { data: existing } = await supabase
        .from('reminders')
        .select('id')
        .eq('type', 'consignment_aging')
        .eq('entity_type', 'artwork')
        .eq('entity_id', artwork.id)
        .ilike('notes', `%${notePattern}%`)
        .limit(1);

      if (existing && existing.length > 0) continue;

      try {
        // Look up gallery name
        let galleryName = 'Unknown gallery';
        if (artwork.gallery_id) {
          const { data: gallery } = await supabase
            .from('galleries')
            .select('name')
            .eq('id', artwork.gallery_id)
            .single();
          if (gallery?.name) galleryName = gallery.name;
        }

        const message = `Consignment aging alert: "${artwork.title}" has been consigned to ${galleryName} for ${daysConsigned} days (${threshold}-day threshold crossed)`;

        // Create reminder record
        const { data: newReminder, error: insertError } = await supabase
          .from('reminders')
          .insert({
            user_id: artwork.user_id,
            type: 'consignment_aging',
            entity_type: 'artwork',
            entity_id: artwork.id,
            trigger_date: now.toISOString(),
            sent: false,
            notes: notePattern,
          })
          .select()
          .single();

        if (insertError || !newReminder) {
          results.push({ artworkId: artwork.id, threshold, success: false, error: insertError?.message });
          continue;
        }

        // Send email
        const email = await getUserEmail(supabase, artwork.user_id);
        if (email) {
          await sendReminderEmail(
            supabaseUrl, serviceRoleKey, email,
            `NOA Inventory -- Consignment Aging (${threshold} days)`,
            message,
          );
          await supabase.from('reminders').update({ sent: true }).eq('id', newReminder.id);
        }

        results.push({ artworkId: artwork.id, threshold, success: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ artworkId: artwork.id, threshold, success: false, error: msg });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Auto-detect overdue invoices and create reminders
// ---------------------------------------------------------------------------

async function autoDetectOverdueInvoices(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<{ created: number; errors: number }> {
  const now = new Date().toISOString();

  const { data: overdueInvoices, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, currency, due_date, user_id')
    .not('status', 'eq', 'paid')
    .not('status', 'eq', 'cancelled')
    .lt('due_date', now);

  if (invoiceError || !overdueInvoices || overdueInvoices.length === 0) {
    if (invoiceError) console.error('Failed to query overdue invoices:', invoiceError.message);
    return { created: 0, errors: 0 };
  }

  // Check existing reminders to avoid duplicates
  const overdueIds = overdueInvoices.map((inv: { id: string }) => inv.id);
  const { data: existingReminders } = await supabase
    .from('reminders')
    .select('entity_id')
    .eq('type', 'invoice_overdue')
    .eq('entity_type', 'invoice')
    .in('entity_id', overdueIds);

  const alreadyReminded = new Set(
    (existingReminders || []).map((r: { entity_id: string }) => r.entity_id),
  );

  let created = 0;
  let errors = 0;

  for (const invoice of overdueInvoices) {
    if (alreadyReminded.has(invoice.id)) continue;

    try {
      const { data: newReminder, error: insertError } = await supabase
        .from('reminders')
        .insert({
          user_id: invoice.user_id,
          type: 'invoice_overdue',
          entity_type: 'invoice',
          entity_id: invoice.id,
          trigger_date: now,
          sent: false,
          notes: `Auto-detected: invoice ${invoice.invoice_number || invoice.id} is past due`,
        })
        .select()
        .single();

      if (insertError || !newReminder) {
        console.error(`Failed to create reminder for invoice ${invoice.id}:`, insertError?.message);
        errors += 1;
        continue;
      }

      const email = await getUserEmail(supabase, invoice.user_id);
      if (email) {
        const message = await buildInvoiceOverdueMessage(supabase, invoice.id);
        await sendReminderEmail(supabaseUrl, serviceRoleKey, email, 'NOA Inventory -- Invoice Overdue', message);
        await supabase.from('reminders').update({ sent: true }).eq('id', newReminder.id);
      }

      created += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Auto-detect overdue invoice ${invoice.id}: ${msg}`);
      errors += 1;
    }
  }

  return { created, errors };
}

// ---------------------------------------------------------------------------
// Auto-detect collector outreach triggers
// ---------------------------------------------------------------------------

interface OutreachResult {
  triggerType: string;
  contactId: string;
  success: boolean;
  error?: string;
}

async function checkCollectorOutreachTriggers(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<OutreachResult[]> {
  const results: OutreachResult[] = [];
  const now = new Date();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  // Helper: get admin email (first admin user)
  async function getAdminEmail(): Promise<string | null> {
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)
      .single();
    if (!adminProfile) return null;
    return getUserEmail(supabase, adminProfile.user_id);
  }

  // Helper: get admin user_id for reminder ownership
  async function getAdminUserId(): Promise<string | null> {
    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)
      .single();
    return adminProfile?.user_id ?? null;
  }

  const adminEmail = await getAdminEmail();
  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    console.error('Collector outreach: no admin user found');
    return results;
  }

  // ---------- Trigger 1: New artwork in preferred series ----------
  try {
    // Find each collector's most-purchased series from sales
    const { data: salesData } = await supabase
      .from('sales')
      .select('contact_id, artwork_id')
      .not('contact_id', 'is', null);

    if (salesData && salesData.length > 0) {
      // Get artwork series for all sold artworks
      const artworkIds = [...new Set(salesData.map((s: { artwork_id: string }) => s.artwork_id))];
      const { data: soldArtworks } = await supabase
        .from('artworks')
        .select('id, series')
        .in('id', artworkIds)
        .not('series', 'is', null);

      if (soldArtworks && soldArtworks.length > 0) {
        const artworkSeriesMap = new Map<string, string>();
        for (const aw of soldArtworks) {
          artworkSeriesMap.set(aw.id, aw.series);
        }

        // Count series purchases per collector
        const collectorSeriesCounts = new Map<string, Map<string, number>>();
        for (const sale of salesData) {
          if (!sale.contact_id) continue;
          const series = artworkSeriesMap.get(sale.artwork_id);
          if (!series) continue;
          if (!collectorSeriesCounts.has(sale.contact_id)) {
            collectorSeriesCounts.set(sale.contact_id, new Map());
          }
          const counts = collectorSeriesCounts.get(sale.contact_id)!;
          counts.set(series, (counts.get(series) || 0) + 1);
        }

        // Find preferred series per collector (most purchased)
        const collectorPreferredSeries = new Map<string, string>();
        for (const [contactId, counts] of collectorSeriesCounts) {
          let maxCount = 0;
          let preferredSeries = '';
          for (const [series, count] of counts) {
            if (count > maxCount) {
              maxCount = count;
              preferredSeries = series;
            }
          }
          if (preferredSeries) {
            collectorPreferredSeries.set(contactId, preferredSeries);
          }
        }

        // Find artworks created in last 7 days
        const sevenDaysAgo = new Date(now.getTime() - 7 * MS_PER_DAY).toISOString();
        const { data: newArtworks } = await supabase
          .from('artworks')
          .select('id, title, series')
          .gte('created_at', sevenDaysAgo)
          .not('series', 'is', null);

        if (newArtworks && newArtworks.length > 0) {
          // Get contact names for matched collectors
          const contactIds = [...collectorPreferredSeries.keys()];
          const { data: contacts } = await supabase
            .from('contacts')
            .select('id, first_name, last_name')
            .in('id', contactIds);

          const contactNameMap = new Map<string, string>();
          if (contacts) {
            for (const c of contacts) {
              contactNameMap.set(c.id, `${c.first_name} ${c.last_name}`);
            }
          }

          for (const artwork of newArtworks) {
            for (const [contactId, preferredSeries] of collectorPreferredSeries) {
              if (artwork.series !== preferredSeries) continue;

              // Check for existing reminder (avoid duplicates)
              const noteKey = `new_artwork_series:${contactId}:${artwork.id}`;
              const { data: existing } = await supabase
                .from('reminders')
                .select('id')
                .eq('type', 'collector_outreach')
                .ilike('notes', `%${noteKey}%`)
                .limit(1);

              if (existing && existing.length > 0) continue;

              try {
                const contactName = contactNameMap.get(contactId) || 'Unknown collector';
                const notes = `[new_artwork_series] ${noteKey} | Collector "${contactName}" prefers series "${preferredSeries}". New artwork "${artwork.title}" was added in this series.`;

                const { data: newReminder, error: insertError } = await supabase
                  .from('reminders')
                  .insert({
                    user_id: adminUserId,
                    type: 'collector_outreach',
                    entity_type: 'contact',
                    entity_id: contactId,
                    trigger_date: now.toISOString(),
                    sent: false,
                    notes,
                  })
                  .select()
                  .single();

                if (insertError || !newReminder) {
                  results.push({ triggerType: 'new_artwork_series', contactId, success: false, error: insertError?.message });
                  continue;
                }

                if (adminEmail) {
                  await sendReminderEmail(
                    supabaseUrl, serviceRoleKey, adminEmail,
                    'NOA Inventory -- Collector Outreach: New Artwork in Preferred Series',
                    `<p><strong>Collector:</strong> ${contactName}</p>
                     <p><strong>Preferred Series:</strong> ${preferredSeries}</p>
                     <p><strong>New Artwork:</strong> "${artwork.title}"</p>
                     <p>Consider reaching out to this collector about the new work.</p>`,
                  );
                  await supabase.from('reminders').update({ sent: true }).eq('id', newReminder.id);
                }

                results.push({ triggerType: 'new_artwork_series', contactId, success: true });
              } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                results.push({ triggerType: 'new_artwork_series', contactId, success: false, error: msg });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Collector outreach (new_artwork_series):', err instanceof Error ? err.message : err);
  }

  // ---------- Trigger 2: Price change on wish-listed work ----------
  try {
    const sevenDaysAgo = new Date(now.getTime() - 7 * MS_PER_DAY).toISOString();

    // Get price changes in last 7 days
    const { data: recentPriceChanges } = await supabase
      .from('price_history')
      .select('artwork_id, price, currency, effective_date')
      .gte('created_at', sevenDaysAgo);

    if (recentPriceChanges && recentPriceChanges.length > 0) {
      const changedArtworkIds = [...new Set(recentPriceChanges.map((p: { artwork_id: string }) => p.artwork_id))];

      // Find wish list items for those artworks
      const { data: wishListMatches } = await supabase
        .from('wish_list_items')
        .select('contact_id, artwork_id')
        .in('artwork_id', changedArtworkIds);

      if (wishListMatches && wishListMatches.length > 0) {
        // Get artwork titles
        const { data: artworks } = await supabase
          .from('artworks')
          .select('id, title')
          .in('id', changedArtworkIds);

        const artworkTitleMap = new Map<string, string>();
        if (artworks) {
          for (const aw of artworks) artworkTitleMap.set(aw.id, aw.title);
        }

        // Get contact names
        const contactIds = [...new Set(wishListMatches.map((w: { contact_id: string }) => w.contact_id))];
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .in('id', contactIds);

        const contactNameMap = new Map<string, string>();
        if (contacts) {
          for (const c of contacts) contactNameMap.set(c.id, `${c.first_name} ${c.last_name}`);
        }

        for (const wish of wishListMatches) {
          const noteKey = `wishlist_price_change:${wish.contact_id}:${wish.artwork_id}`;
          const { data: existing } = await supabase
            .from('reminders')
            .select('id')
            .eq('type', 'collector_outreach')
            .ilike('notes', `%${noteKey}%`)
            .limit(1);

          if (existing && existing.length > 0) continue;

          try {
            const contactName = contactNameMap.get(wish.contact_id) || 'Unknown collector';
            const artworkTitle = artworkTitleMap.get(wish.artwork_id) || 'Unknown artwork';
            const priceEntry = recentPriceChanges.find((p: { artwork_id: string }) => p.artwork_id === wish.artwork_id);
            const priceInfo = priceEntry ? `${priceEntry.currency} ${priceEntry.price}` : 'updated';

            const notes = `[wishlist_price_change] ${noteKey} | Collector "${contactName}" has wish-listed "${artworkTitle}" which had a price change to ${priceInfo}.`;

            const { data: newReminder, error: insertError } = await supabase
              .from('reminders')
              .insert({
                user_id: adminUserId,
                type: 'collector_outreach',
                entity_type: 'contact',
                entity_id: wish.contact_id,
                trigger_date: now.toISOString(),
                sent: false,
                notes,
              })
              .select()
              .single();

            if (insertError || !newReminder) {
              results.push({ triggerType: 'wishlist_price_change', contactId: wish.contact_id, success: false, error: insertError?.message });
              continue;
            }

            if (adminEmail) {
              await sendReminderEmail(
                supabaseUrl, serviceRoleKey, adminEmail,
                'NOA Inventory -- Collector Outreach: Price Change on Wish-Listed Work',
                `<p><strong>Collector:</strong> ${contactName}</p>
                 <p><strong>Artwork:</strong> "${artworkTitle}"</p>
                 <p><strong>New Price:</strong> ${priceInfo}</p>
                 <p>This artwork is on the collector's wish list. Consider notifying them about the price change.</p>`,
              );
              await supabase.from('reminders').update({ sent: true }).eq('id', newReminder.id);
            }

            results.push({ triggerType: 'wishlist_price_change', contactId: wish.contact_id, success: true });
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            results.push({ triggerType: 'wishlist_price_change', contactId: wish.contact_id, success: false, error: msg });
          }
        }
      }
    }
  } catch (err) {
    console.error('Collector outreach (wishlist_price_change):', err instanceof Error ? err.message : err);
  }

  // ---------- Trigger 3: Exhibition in collector's city ----------
  try {
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * MS_PER_DAY).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // Get upcoming exhibitions with a city
    const { data: upcomingExhibitions } = await supabase
      .from('exhibitions')
      .select('id, title, venue, city, start_date')
      .gte('start_date', today)
      .lte('start_date', thirtyDaysFromNow)
      .not('city', 'is', null);

    if (upcomingExhibitions && upcomingExhibitions.length > 0) {
      // Get unique cities from exhibitions (case-insensitive)
      const exhibitionCities = [...new Set(upcomingExhibitions.map((e: { city: string }) => e.city.toLowerCase()))];

      // Get contacts with matching cities
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, city')
        .not('city', 'is', null);

      if (contacts && contacts.length > 0) {
        for (const exhibition of upcomingExhibitions) {
          const exhibCity = exhibition.city.toLowerCase();

          const matchingContacts = contacts.filter(
            (c: { city: string }) => c.city && c.city.toLowerCase() === exhibCity,
          );

          for (const contact of matchingContacts) {
            const noteKey = `exhibition_city:${contact.id}:${exhibition.id}`;
            const { data: existing } = await supabase
              .from('reminders')
              .select('id')
              .eq('type', 'collector_outreach')
              .ilike('notes', `%${noteKey}%`)
              .limit(1);

            if (existing && existing.length > 0) continue;

            try {
              const contactName = `${contact.first_name} ${contact.last_name}`;
              const exhibDate = new Date(exhibition.start_date).toLocaleDateString();
              const notes = `[exhibition_city] ${noteKey} | Collector "${contactName}" is in ${contact.city}. Exhibition "${exhibition.title}" at ${exhibition.venue || 'TBD'} starts ${exhibDate} in ${exhibition.city}.`;

              const { data: newReminder, error: insertError } = await supabase
                .from('reminders')
                .insert({
                  user_id: adminUserId,
                  type: 'collector_outreach',
                  entity_type: 'contact',
                  entity_id: contact.id,
                  trigger_date: now.toISOString(),
                  sent: false,
                  notes,
                })
                .select()
                .single();

              if (insertError || !newReminder) {
                results.push({ triggerType: 'exhibition_city', contactId: contact.id, success: false, error: insertError?.message });
                continue;
              }

              if (adminEmail) {
                await sendReminderEmail(
                  supabaseUrl, serviceRoleKey, adminEmail,
                  'NOA Inventory -- Collector Outreach: Exhibition in Collector\'s City',
                  `<p><strong>Collector:</strong> ${contactName} (${contact.city})</p>
                   <p><strong>Exhibition:</strong> "${exhibition.title}"</p>
                   <p><strong>Venue:</strong> ${exhibition.venue || 'TBD'}</p>
                   <p><strong>Date:</strong> ${exhibDate}</p>
                   <p>Consider inviting this collector to the upcoming exhibition in their city.</p>`,
                );
                await supabase.from('reminders').update({ sent: true }).eq('id', newReminder.id);
              }

              results.push({ triggerType: 'exhibition_city', contactId: contact.id, success: true });
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Unknown error';
              results.push({ triggerType: 'exhibition_city', contactId: contact.id, success: false, error: msg });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Collector outreach (exhibition_city):', err instanceof Error ? err.message : err);
  }

  // ---------- Trigger 4: Purchase anniversary (re-engagement) ----------
  try {
    // Find sales where sale_date was ~1 year ago (±3 days)
    const oneYearAgoStart = new Date(now.getTime() - (365 + 3) * MS_PER_DAY).toISOString().split('T')[0];
    const oneYearAgoEnd = new Date(now.getTime() - (365 - 3) * MS_PER_DAY).toISOString().split('T')[0];

    const { data: anniversarySales } = await supabase
      .from('sales')
      .select('id, contact_id, artwork_id, sale_date')
      .gte('sale_date', oneYearAgoStart)
      .lte('sale_date', oneYearAgoEnd)
      .not('contact_id', 'is', null);

    if (anniversarySales && anniversarySales.length > 0) {
      // Get artwork titles
      const artworkIds = [...new Set(anniversarySales.map((s: { artwork_id: string }) => s.artwork_id))];
      const { data: artworks } = await supabase
        .from('artworks')
        .select('id, title')
        .in('id', artworkIds);

      const artworkTitleMap = new Map<string, string>();
      if (artworks) {
        for (const aw of artworks) artworkTitleMap.set(aw.id, aw.title);
      }

      // Get contact names
      const contactIds = [...new Set(anniversarySales.map((s: { contact_id: string }) => s.contact_id))];
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .in('id', contactIds);

      const contactNameMap = new Map<string, string>();
      if (contacts) {
        for (const c of contacts) contactNameMap.set(c.id, `${c.first_name} ${c.last_name}`);
      }

      for (const sale of anniversarySales) {
        const noteKey = `purchase_anniversary:${sale.contact_id}:${sale.id}`;
        const { data: existing } = await supabase
          .from('reminders')
          .select('id')
          .eq('type', 'collector_outreach')
          .ilike('notes', `%${noteKey}%`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        try {
          const contactName = contactNameMap.get(sale.contact_id) || 'Unknown collector';
          const artworkTitle = artworkTitleMap.get(sale.artwork_id) || 'Unknown artwork';
          const saleDate = new Date(sale.sale_date).toLocaleDateString();
          const notes = `[purchase_anniversary] ${noteKey} | Collector "${contactName}" purchased "${artworkTitle}" one year ago on ${saleDate}. Re-engagement opportunity.`;

          const { data: newReminder, error: insertError } = await supabase
            .from('reminders')
            .insert({
              user_id: adminUserId,
              type: 'collector_outreach',
              entity_type: 'contact',
              entity_id: sale.contact_id,
              trigger_date: now.toISOString(),
              sent: false,
              notes,
            })
            .select()
            .single();

          if (insertError || !newReminder) {
            results.push({ triggerType: 'purchase_anniversary', contactId: sale.contact_id, success: false, error: insertError?.message });
            continue;
          }

          if (adminEmail) {
            await sendReminderEmail(
              supabaseUrl, serviceRoleKey, adminEmail,
              'NOA Inventory -- Collector Outreach: Purchase Anniversary',
              `<p><strong>Collector:</strong> ${contactName}</p>
               <p><strong>Artwork:</strong> "${artworkTitle}"</p>
               <p><strong>Original Purchase Date:</strong> ${saleDate}</p>
               <p>It has been one year since this collector's purchase. Consider reaching out for re-engagement.</p>`,
            );
            await supabase.from('reminders').update({ sent: true }).eq('id', newReminder.id);
          }

          results.push({ triggerType: 'purchase_anniversary', contactId: sale.contact_id, success: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          results.push({ triggerType: 'purchase_anniversary', contactId: sale.contact_id, success: false, error: msg });
        }
      }
    }
  } catch (err) {
    console.error('Collector outreach (purchase_anniversary):', err instanceof Error ? err.message : err);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  try {
    // ---- Verify caller authorization ----------------------------------------
    // Accept either a CRON_SECRET header (for scheduled invocations) or
    // a valid admin JWT (for manual triggers).
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

    // ---- Query due, unsent reminders ----------------------------------------
    const { data: reminders, error: queryError } = await supabase
      .from('reminders')
      .select('*')
      .eq('sent', false)
      .lte('trigger_date', new Date().toISOString())
      .order('trigger_date', { ascending: true });

    if (queryError) {
      console.error('Failed to query reminders:', queryError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to query reminders' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ---- Auto-detect overdue invoices, consignment aging & collector outreach --
    const overdueResult = await autoDetectOverdueInvoices(supabase, supabaseUrl, serviceRoleKey);
    const agingResults = await checkConsignmentAging(supabase, supabaseUrl, serviceRoleKey);
    const outreachResults = await checkCollectorOutreachTriggers(supabase, supabaseUrl, serviceRoleKey);

    // If no due reminders and no auto-detections, return early
    if (!reminders || reminders.length === 0) {
      const agingCreated = agingResults.filter((r) => r.success).length;
      const outreachCreated = outreachResults.filter((r) => r.success).length;
      return new Response(
        JSON.stringify({
          processed: 0,
          message: 'No due reminders found',
          overdueAutoDetected: overdueResult.created,
          consignmentAgingCreated: agingCreated,
          collectorOutreachCreated: outreachCreated,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ---- Process each reminder individually ---------------------------------
    const results: ProcessResult[] = [];

    for (const reminder of reminders as Reminder[]) {
      try {
        // 1. Build the message based on entity type/id
        const message = await buildReminderMessage(supabase, reminder);

        // 2. Look up user email
        const email = await getUserEmail(supabase, reminder.user_id);

        if (!email) {
          console.warn(`Reminder ${reminder.id}: could not resolve email for user ${reminder.user_id}`);
          results.push({ reminderId: reminder.id, success: false, error: 'User email not found' });
          continue;
        }

        // 3. Build a nice subject line
        const subjectMap: Record<string, string> = {
          consignment_followup: 'Consignment Follow-up',
          loan_return: 'Loan Return Due',
          invoice_overdue: 'Invoice Overdue',
          task_due: 'Task Due',
          collector_outreach: 'Collector Outreach',
        };
        const subject = `NOA Inventory -- ${subjectMap[reminder.type] ?? 'Reminder'}`;

        // Include notes if present
        const fullBody = reminder.notes
          ? `${message}\n\nNotes: ${reminder.notes}`
          : message;

        // 4. Send email via send-email Edge Function
        await sendReminderEmail(supabaseUrl, serviceRoleKey, email, subject, fullBody);

        // 5. Mark reminder as sent
        const { error: updateError } = await supabase
          .from('reminders')
          .update({ sent: true })
          .eq('id', reminder.id);

        if (updateError) {
          console.error(`Reminder ${reminder.id}: email sent but failed to mark as sent: ${updateError.message}`);
          results.push({ reminderId: reminder.id, success: false, error: 'Sent but failed to update status' });
          continue;
        }

        results.push({ reminderId: reminder.id, success: true });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Reminder ${reminder.id}: ${errorMessage}`);
        results.push({ reminderId: reminder.id, success: false, error: 'Processing failed' });
      }
    }

    // ---- Return summary -----------------------------------------------------
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    const agingCreated = agingResults.filter((r) => r.success).length;
    const agingFailed = agingResults.filter((r) => !r.success).length;

    const outreachCreated = outreachResults.filter((r) => r.success).length;
    const outreachFailed = outreachResults.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        processed: results.length,
        sent: successCount,
        failed: failureCount,
        overdueAutoDetected: overdueResult.created,
        overdueAutoDetectErrors: overdueResult.errors,
        consignmentAging: {
          checked: agingResults.length,
          created: agingCreated,
          failed: agingFailed,
        },
        collectorOutreach: {
          checked: outreachResults.length,
          created: outreachCreated,
          failed: outreachFailed,
          triggers: outreachResults,
        },
        details: results,
      }),
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
