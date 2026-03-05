// ---------------------------------------------------------------------------
// NOA Inventory -- Supabase Edge Function: send-email (via Resend API)
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  attachmentBase64?: string;
  attachmentFilename?: string;
}

serve(async (req: Request) => {
  // ---- Handle CORS preflight ------------------------------------------------
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // ---- Validate method ----------------------------------------------------
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // ---- Parse request body -------------------------------------------------
    const payload: SendEmailPayload = await req.json();

    if (!payload.to || !payload.subject || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, body' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // ---- Get Resend API key -------------------------------------------------
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY is not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // ---- Build the Resend API payload ---------------------------------------
    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${payload.body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')}
</body>
</html>`.trim();

    const resendPayload: Record<string, unknown> = {
      from: 'NOA Contemporary <noreply@noacontemporary.com>',
      to: payload.to,
      subject: payload.subject,
      html: htmlBody,
    };

    // Attach file if provided
    if (payload.attachmentBase64 && payload.attachmentFilename) {
      resendPayload.attachments = [
        {
          filename: payload.attachmentFilename,
          content: payload.attachmentBase64,
        },
      ];
    }

    // ---- Call Resend API -----------------------------------------------------
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      const errorMessage = resendData?.message ?? resendData?.error ?? 'Failed to send email via Resend';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: resendResponse.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // ---- Return success -----------------------------------------------------
    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
