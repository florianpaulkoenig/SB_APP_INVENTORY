// ---------------------------------------------------------------------------
// NOA Inventory -- Supabase Edge Function: invite-user
// Creates a new auth user + user_profile, optionally sends invitation email.
// SECURITY: Requires authenticated admin caller (JWT verified).
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Restrict CORS to known origins (update for production domain)
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InviteUserPayload {
  email: string;
  role: 'admin' | 'gallery' | 'collector';
  display_name: string;
  gallery_id?: string | null;
  contact_id?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join('');
}

/** HTML-escape a string to prevent XSS in emails */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

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

    // ---- Authenticate & authorize caller (admin only) -----------------------
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Verify the caller's JWT using the anon key (not service role)
    const supabaseCaller = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: callerUser }, error: authErr } = await supabaseCaller.auth.getUser();
    if (authErr || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid or expired token' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Check caller role is 'admin'
    const { data: callerProfile } = await supabaseCaller
      .from('user_profiles')
      .select('role')
      .eq('user_id', callerUser.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: admin role required' }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // ---- Parse request body -------------------------------------------------
    const payload: InviteUserPayload = await req.json();

    if (!payload.email || !payload.role || !payload.display_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, role, display_name' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // ---- Create Supabase admin client ---------------------------------------
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ---- Create the auth user -----------------------------------------------
    const tempPassword = generateTempPassword();

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: `Failed to create auth user: ${authError.message}` }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const userId = authData.user.id;

    // ---- Create the user_profile record -------------------------------------
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: userId,
        role: payload.role,
        display_name: payload.display_name,
        gallery_id: payload.gallery_id ?? null,
        contact_id: payload.contact_id ?? null,
      })
      .select()
      .single();

    if (profileError) {
      // Attempt to clean up the auth user if the profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return new Response(
        JSON.stringify({ error: `Failed to create user profile: ${profileError.message}` }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // ---- Optionally send invitation email via Resend ------------------------
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (resendApiKey) {
      try {
        // HTML-escape all user-provided values to prevent email injection
        const safeName = escapeHtml(payload.display_name);
        const safeRole = escapeHtml(payload.role);
        const safeEmail = escapeHtml(payload.email);

        const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2>Welcome to NOA Inventory</h2>
  <p>Hello ${safeName},</p>
  <p>You have been invited to join NOA Inventory as a <strong>${safeRole}</strong>.</p>
  <p>Your temporary login credentials:</p>
  <ul>
    <li><strong>Email:</strong> ${safeEmail}</li>
    <li><strong>Password:</strong> ${escapeHtml(tempPassword)}</li>
  </ul>
  <p>Please log in and change your password as soon as possible.</p>
  <br>
  <p>Best regards,<br>NOA Contemporary</p>
</body>
</html>`.trim();

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'NOA Contemporary <noreply@noacontemporary.com>',
            to: payload.email,
            subject: 'You have been invited to NOA Inventory',
            html: htmlBody,
          }),
        });

        if (!resendResponse.ok) {
          const resendData = await resendResponse.json();
          console.warn('Failed to send invitation email:', resendData?.message ?? resendData?.error);
        }
      } catch (emailErr) {
        // Email sending is non-critical -- log but don't fail the overall operation
        console.warn('Failed to send invitation email:', emailErr);
      }
    }

    // ---- Return success -----------------------------------------------------
    return new Response(
      JSON.stringify({ success: true, profile }),
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
