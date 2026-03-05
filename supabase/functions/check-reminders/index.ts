// ---------------------------------------------------------------------------
// NOA Inventory -- Supabase Edge Function: check-reminders
// Cron job that checks for due reminders and sends email alerts.
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
// Send email via the send-email Edge Function
// ---------------------------------------------------------------------------

async function sendReminderEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ to, subject, body }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = (errorData as Record<string, string>)?.error ?? `HTTP ${response.status}`;
    throw new Error(`send-email failed: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  try {
    // ---- Create Supabase admin client ---------------------------------------
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
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
      return new Response(
        JSON.stringify({ error: `Failed to query reminders: ${queryError.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: 'No due reminders found' }),
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
          results.push({ reminderId: reminder.id, success: false, error: `Sent but failed to update: ${updateError.message}` });
          continue;
        }

        results.push({ reminderId: reminder.id, success: true });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Reminder ${reminder.id}: ${errorMessage}`);
        results.push({ reminderId: reminder.id, success: false, error: errorMessage });
      }
    }

    // ---- Return summary -----------------------------------------------------
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        processed: results.length,
        sent: successCount,
        failed: failureCount,
        details: results,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('check-reminders fatal error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
