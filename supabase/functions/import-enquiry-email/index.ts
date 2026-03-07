// ---------------------------------------------------------------------------
// NOA Inventory — Edge Function: import-enquiry-email
// Receives inbound email webhooks from Resend, parses Squarespace form
// submissions, creates enquiry records, and runs AI analysis.
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

// ---------------------------------------------------------------------------
// Parse Squarespace form email body
// ---------------------------------------------------------------------------
function parseSquarespaceEmail(raw: string): {
  name: string | null;
  email: string | null;
  inquirySubject: string | null;
  message: string | null;
} {
  // Strip HTML tags for parsing (keep text content)
  const text = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

  const name = text.match(/Name:\s*(.+)/i)?.[1]?.trim() || null;
  const email = text.match(/Email:\s*(\S+@\S+)/i)?.[1]?.trim() || null;
  const inquirySubject = text.match(/Subject of Inquiry:\s*(.+)/i)?.[1]?.trim() || null;

  // Extract message — everything between "Message:" and "Manage Submissions"
  const msgMatch = text.match(/Message:\s*([\s\S]+?)(?=\s*Manage Submissions|Does this submission|$)/i);
  const message = msgMatch?.[1]?.trim() || null;

  return { name, email, inquirySubject, message };
}

// ---------------------------------------------------------------------------
// AI Analysis (reuses analyze-enquiry prompt)
// ---------------------------------------------------------------------------
async function analyzeWithClaude(subject: string, body: string) {
  if (!ANTHROPIC_API_KEY) return null;

  try {
    const prompt = `Analyze this art enquiry and extract structured information.

Subject: ${subject || 'N/A'}
Body: ${body || 'N/A'}

Extract and return a JSON object with these fields:
- interest_description: Brief summary of what artwork/type the enquirer is interested in
- location_city: City mentioned or inferred (null if unknown)
- location_country: Country mentioned or inferred from email domain, name, or context (null if unknown)
- estimated_value: Estimated budget in EUR if mentioned or inferable (null if unknown)
- priority: One of "low", "normal", "high", "urgent" based on tone and urgency

Return ONLY valid JSON, no markdown or explanation.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const result = await response.json();
    const text = result.content?.[0]?.text || '{}';
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify webhook secret (check header first, then URL query parameter)
    const url = new URL(req.url);
    const secret =
      req.headers.get('x-webhook-secret') ||
      req.headers.get('webhook-secret') ||
      url.searchParams.get('secret');
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'Invalid webhook secret' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();

    // Resend sends { type: "email.received", data: { ... } }
    if (payload.type !== 'email.received') {
      return new Response(JSON.stringify({ ok: true, skipped: 'not email.received' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailData = payload.data;
    const emailSubject = emailData.subject || '';
    const emailText = emailData.text || '';
    const emailHtml = emailData.html || '';

    // Use text body if available, fall back to HTML
    const rawContent = emailText || emailHtml;

    if (!rawContent) {
      return new Response(JSON.stringify({ ok: true, skipped: 'empty body' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse Squarespace form fields
    const parsed = parseSquarespaceEmail(rawContent);

    // Use parsed fields, fall back to email-level fields
    const senderName = parsed.name || emailData.from || null;
    const senderEmail = parsed.email || null;
    const subject = parsed.inquirySubject || emailSubject || null;
    const body = parsed.message || rawContent;

    // Connect to Supabase with service role (no user JWT available in webhooks)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Deduplication: check if same sender_email + subject exists in last 24h
    if (senderEmail && subject) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from('enquiries')
        .select('id')
        .eq('sender_email', senderEmail)
        .eq('subject', subject)
        .gte('created_at', oneDayAgo)
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ ok: true, skipped: 'duplicate' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Get admin user_id (same pattern as auction-monitor)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1);
    const adminUserId = profiles?.[0]?.user_id || null;

    if (!adminUserId) {
      return new Response(JSON.stringify({ error: 'No admin user found' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Insert enquiry
    const { data: enquiry, error: insertError } = await supabase
      .from('enquiries')
      .insert({
        user_id: adminUserId,
        source: 'website',
        sender_name: senderName,
        sender_email: senderEmail,
        subject: subject,
        body: body,
        status: 'new',
        priority: 'normal',
        currency: 'EUR',
      })
      .select()
      .single();

    if (insertError || !enquiry) {
      return new Response(JSON.stringify({ error: 'Failed to create enquiry', detail: insertError?.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // AI Analysis (non-blocking — if it fails, enquiry still exists)
    const aiResult = await analyzeWithClaude(subject || '', body);
    if (aiResult) {
      await supabase
        .from('enquiries')
        .update({
          interest_description: aiResult.interest_description || null,
          location_city: aiResult.location_city || null,
          location_country: aiResult.location_country || null,
          estimated_value: aiResult.estimated_value || null,
          priority: aiResult.priority || 'normal',
        })
        .eq('id', enquiry.id);
    }

    // Send admin notification email
    if (RESEND_API_KEY) {
      try {
        const notifSubject = `New Enquiry: ${subject || 'Website Form'}`;
        const notifBody = [
          `A new enquiry has been automatically imported from your website.`,
          ``,
          `From: ${senderName || 'Unknown'}`,
          `Email: ${senderEmail || 'Unknown'}`,
          `Subject: ${subject || 'N/A'}`,
          ``,
          `Message:`,
          body,
          ``,
          aiResult ? `--- AI Analysis ---` : '',
          aiResult?.interest_description ? `Interest: ${aiResult.interest_description}` : '',
          aiResult?.location_country ? `Location: ${[aiResult.location_city, aiResult.location_country].filter(Boolean).join(', ')}` : '',
          aiResult?.estimated_value ? `Estimated Value: EUR ${aiResult.estimated_value}` : '',
          aiResult?.priority ? `Priority: ${aiResult.priority}` : '',
          ``,
          `View in dashboard: https://app.noacontemporary.com/enquiries/${enquiry.id}`,
        ].filter(Boolean).join('\n');

        // Get admin email
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const adminUser = users?.find((u: Record<string, unknown>) => u.id === adminUserId);
        const adminEmail = (adminUser as Record<string, unknown>)?.email as string;

        if (adminEmail) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'NOA Contemporary <noreply@noacontemporary.com>',
              to: adminEmail,
              subject: notifSubject,
              text: notifBody,
            }),
          });
        }
      } catch {
        // Notification failure shouldn't break the import
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        enquiry_id: enquiry.id,
        sender: senderName,
        email: senderEmail,
        subject: subject,
        ai_analyzed: !!aiResult,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
