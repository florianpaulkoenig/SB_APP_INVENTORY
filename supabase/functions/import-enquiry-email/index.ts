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
// Timing-safe string comparison
// ---------------------------------------------------------------------------
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  if (aBuf.length !== bBuf.length) return false;
  let result = 0;
  for (let i = 0; i < aBuf.length; i++) {
    result |= aBuf[i] ^ bBuf[i];
  }
  return result === 0;
}

// Simple in-memory rate limiter for webhook calls
const recentCalls: number[] = [];
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 per minute

function checkWebhookRateLimit(): boolean {
  const now = Date.now();
  // Remove old entries
  while (recentCalls.length > 0 && recentCalls[0] < now - RATE_LIMIT_WINDOW) {
    recentCalls.shift();
  }
  if (recentCalls.length >= RATE_LIMIT_MAX) return false;
  recentCalls.push(now);
  return true;
}

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

  // Flexible name field: "Name", "Your Name", "Full Name", "First Name", "Contact Name", etc.
  const name = text.match(/(?:your\s+|full\s+|first\s+|contact\s+)?name:\s*(.+)/i)?.[1]?.trim() || null;

  // Flexible email field: "Email", "Email Address", "Your Email", "Contact Email", etc.
  const email = text.match(/(?:your\s+|contact\s+)?e?-?mail(?:\s+address)?:\s*(\S+@\S+)/i)?.[1]?.trim() || null;

  // Flexible subject/inquiry field: "Subject of Inquiry", "Subject", "Inquiry", "Topic", "Regarding", etc.
  const inquirySubject =
    text.match(/subject\s+of\s+inquiry:\s*(.+)/i)?.[1]?.trim() ||
    text.match(/(?:inquiry|enquiry|topic|regarding|subject):\s*(.+)/i)?.[1]?.trim() ||
    null;

  // Extract message — everything between "Message:"/"Comments:"/"Details:" and "Manage Submissions"
  const msgMatch = text.match(/(?:message|comments|details|inquiry):\s*([\s\S]+?)(?=\s*Manage Submissions|Does this submission|Sent via|$)/i);
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
    // Verify webhook secret (header only — never accept secrets in URL query params)
    const secret =
      req.headers.get('x-webhook-secret') ||
      req.headers.get('webhook-secret');
    if (!WEBHOOK_SECRET || !secret || !timingSafeEqual(secret, WEBHOOK_SECRET)) {
      return new Response(JSON.stringify({ error: 'Invalid webhook secret' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting
    if (!checkWebhookRateLimit()) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    console.log('[import-enquiry-email] Received webhook, type:', payload.type);

    // Resend sends { type: "email.received", data: { ... } }
    if (payload.type !== 'email.received') {
      console.log('[import-enquiry-email] Skipping non-email event:', payload.type);
      return new Response(JSON.stringify({ ok: true, skipped: 'not email.received' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailData = payload.data;
    const emailSubject = emailData.subject || '';
    const emailText = emailData.text || '';
    const emailHtml = emailData.html || '';
    console.log('[import-enquiry-email] Email subject:', emailSubject, '| Has text:', !!emailText, '| Has html:', !!emailHtml);

    // Use text body if available, fall back to HTML (truncate to prevent abuse)
    const rawContent = (emailText || emailHtml).slice(0, 50000);

    if (!rawContent) {
      return new Response(JSON.stringify({ ok: true, skipped: 'empty body' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse Squarespace form fields
    const parsed = parseSquarespaceEmail(rawContent);
    console.log('[import-enquiry-email] Parsed fields — name:', parsed.name, '| email:', parsed.email, '| subject:', parsed.inquirySubject, '| hasMessage:', !!parsed.message);

    // Use parsed fields, fall back to email-level fields
    const senderName = parsed.name || emailData.from || null;
    const senderEmail = parsed.email || null;
    const subject = parsed.inquirySubject || emailSubject || null;
    const body = parsed.message || rawContent;
    console.log('[import-enquiry-email] Final sender:', senderName, '| email:', senderEmail, '| subject:', subject);

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
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1);

    if (profileError) {
      console.error('[import-enquiry-email] Failed to query user_profiles:', profileError.message);
      return new Response(JSON.stringify({ error: 'Failed to look up admin user', detail: profileError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const adminUserId = profiles?.[0]?.user_id || null;

    if (!adminUserId) {
      console.error('[import-enquiry-email] No admin user found in user_profiles table. Ensure at least one user has role=admin.');
      return new Response(JSON.stringify({ error: 'No admin user found in user_profiles. Please create an admin user first.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.log('[import-enquiry-email] Admin user_id:', adminUserId);

    // Insert enquiry
    console.log('[import-enquiry-email] Inserting enquiry record...');
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
      console.error('[import-enquiry-email] Insert failed:', insertError?.message);
      return new Response(JSON.stringify({ error: 'Failed to create enquiry', detail: insertError?.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.log('[import-enquiry-email] Enquiry created successfully, id:', enquiry.id);

    // AI Analysis (non-blocking — if it fails, enquiry still exists)
    let aiResult = null;
    try {
      console.log('[import-enquiry-email] Starting AI analysis for enquiry:', enquiry.id);
      aiResult = await analyzeWithClaude(subject || '', body);
      if (aiResult) {
        console.log('[import-enquiry-email] AI analysis succeeded, updating enquiry with results');
        const { error: updateError } = await supabase
          .from('enquiries')
          .update({
            interest_description: aiResult.interest_description || null,
            location_city: aiResult.location_city || null,
            location_country: aiResult.location_country || null,
            estimated_value: aiResult.estimated_value || null,
            priority: aiResult.priority || 'normal',
          })
          .eq('id', enquiry.id);
        if (updateError) {
          console.error('[import-enquiry-email] Failed to update enquiry with AI results:', updateError.message);
        }
      } else {
        console.log('[import-enquiry-email] AI analysis returned no results (API key missing or empty response)');
      }
    } catch (aiError) {
      console.error('[import-enquiry-email] AI analysis failed (enquiry still created):', aiError);
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

    console.log('[import-enquiry-email] Complete. enquiry_id:', enquiry.id, '| ai_analyzed:', !!aiResult);
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
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
