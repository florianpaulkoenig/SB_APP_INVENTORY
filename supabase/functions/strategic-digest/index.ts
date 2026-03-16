// ---------------------------------------------------------------------------
// NOA Inventory -- Supabase Edge Function: strategic-digest
// Cron-triggered weekly digest that runs strategic analysis for each admin
// user, collects generated insights, and emails a formatted weekly brief.
// SECURITY: Requires CRON_SECRET header or valid admin JWT.
// ---------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AiInsight {
  id: string;
  category: string;
  priority: string;
  title: string;
  summary: string;
  analysis: string;
  recommendations: string[];
  status: string;
  created_at: string;
}

interface DigestResult {
  users_processed: number;
  insights_generated: number;
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
// Rate limiting -- max 1 digest per day
// ---------------------------------------------------------------------------

async function checkDigestRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('ai_rate_limits')
    .select('call_count')
    .eq('user_id', userId)
    .eq('mode', 'digest')
    .eq('window_date', today)
    .single();

  if (data && data.call_count >= 1) return false;

  if (data) {
    await supabase
      .from('ai_rate_limits')
      .update({ call_count: (data.call_count || 0) + 1 } as never)
      .eq('user_id', userId)
      .eq('mode', 'digest')
      .eq('window_date', today);
  } else {
    await supabase
      .from('ai_rate_limits')
      .insert({ user_id: userId, mode: 'digest', window_date: today, call_count: 1 } as never);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Get user email from auth.users
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
// Invoke strategic-agent in analyze mode
// ---------------------------------------------------------------------------

async function triggerAnalysis(
  supabaseUrl: string,
  serviceRoleKey: string,
  cronSecret: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/strategic-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'x-cron-secret': cronSecret,
      },
      body: JSON.stringify({ mode: 'analyze' }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`strategic-agent returned ${response.status}: ${body.slice(0, 300)}`);
      return false;
    }

    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Failed to invoke strategic-agent: ${msg}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Fetch recent insights for a user (created in last hour, status = 'new')
// ---------------------------------------------------------------------------

async function fetchRecentInsights(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<AiInsight[]> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('ai_insights')
    .select('id, category, priority, title, summary, analysis, recommendations, status, created_at')
    .eq('user_id', userId)
    .eq('status', 'new')
    .gte('created_at', oneHourAgo)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Failed to fetch insights for user ${userId}:`, error.message);
    return [];
  }

  return (data as AiInsight[]) || [];
}

// ---------------------------------------------------------------------------
// Build digest email HTML
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#CA8A04',
  low: '#16A34A',
};

const CATEGORY_COLORS: Record<string, string> = {
  pricing: '#7C3AED',
  inventory: '#2563EB',
  sales: '#059669',
  collector: '#D97706',
  gallery: '#DB2777',
  exhibition: '#4F46E5',
  production: '#0891B2',
  market: '#9333EA',
  strategic: '#1D4ED8',
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function buildDigestHtml(insights: AiInsight[], dateStr: string): string {
  const criticalCount = insights.filter((i) => i.priority === 'critical').length;
  const highCount = insights.filter((i) => i.priority === 'high').length;

  const prioritySummaryParts: string[] = [];
  if (criticalCount > 0) prioritySummaryParts.push(`${criticalCount} critical`);
  if (highCount > 0) prioritySummaryParts.push(`${highCount} high priority`);
  const prioritySummary = prioritySummaryParts.length > 0
    ? ` (${prioritySummaryParts.join(', ')})`
    : '';

  const insightBlocks = insights.map((insight) => {
    const categoryColor = CATEGORY_COLORS[insight.category] || '#6B7280';
    const priorityColor = PRIORITY_COLORS[insight.priority] || '#6B7280';

    const recommendations = Array.isArray(insight.recommendations)
      ? insight.recommendations
      : [];
    const recsHtml = recommendations.length > 0
      ? `<div style="margin-top: 12px;">
           <div style="font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;">Recommendations:</div>
           <ul style="margin: 0; padding-left: 20px; color: #4B5563; font-size: 13px; line-height: 1.6;">
             ${recommendations.map((r: string) => `<li>${escapeHtml(String(r))}</li>`).join('')}
           </ul>
         </div>`
      : '';

    return `
      <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
          <span style="display: inline-block; background: ${categoryColor}; color: #FFFFFF; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${escapeHtml(insight.category)}
          </span>
          <span style="display: inline-block; background: ${priorityColor}; color: #FFFFFF; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${escapeHtml(insight.priority)}
          </span>
        </div>
        <div style="font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 8px;">
          ${escapeHtml(insight.title)}
        </div>
        <div style="font-size: 14px; color: #4B5563; line-height: 1.5;">
          ${escapeHtml(insight.summary)}
        </div>
        ${recsHtml}
      </div>`;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NOA Weekly Strategic Brief</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1E293B 0%, #334155 100%); border-radius: 12px 12px 0 0; padding: 32px 24px; text-align: center;">
      <div style="font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: 2px; margin-bottom: 4px;">NOA</div>
      <div style="font-size: 12px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.5px;">Contemporary</div>
      <div style="width: 40px; height: 2px; background: #60A5FA; margin: 16px auto;"></div>
      <div style="font-size: 18px; font-weight: 600; color: #E2E8F0;">Weekly Strategic Brief</div>
      <div style="font-size: 13px; color: #94A3B8; margin-top: 4px;">${escapeHtml(dateStr)}</div>
    </div>

    <!-- Summary Bar -->
    <div style="background: #FFFFFF; border-left: 1px solid #E5E7EB; border-right: 1px solid #E5E7EB; padding: 20px 24px;">
      <div style="font-size: 14px; color: #6B7280;">
        <strong style="color: #111827; font-size: 20px;">${insights.length}</strong>
        new insight${insights.length !== 1 ? 's' : ''} this week${prioritySummary}
      </div>
    </div>

    <!-- Insights -->
    <div style="background: #F9FAFB; border-left: 1px solid #E5E7EB; border-right: 1px solid #E5E7EB; padding: 24px;">
      ${insightBlocks || '<div style="text-align: center; color: #6B7280; padding: 32px 0;">No new insights generated this week.</div>'}
    </div>

    <!-- Footer -->
    <div style="background: #1E293B; border-radius: 0 0 12px 12px; padding: 24px; text-align: center;">
      <a href="https://app.noacontemporary.com/strategic-intelligence"
         style="display: inline-block; background: #3B82F6; color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 24px; border-radius: 6px;">
        View Strategic Intelligence Dashboard
      </a>
      <div style="font-size: 12px; color: #64748B; margin-top: 16px;">
        NOA Contemporary Art Inventory &mdash; Powered by NOA Intelligence
      </div>
    </div>

  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

    if (!cronSecret) {
      console.error('Missing CRON_SECRET -- needed for strategic-agent invocation');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: CRON_SECRET required' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ---- Get all admin users ------------------------------------------------
    const { data: adminProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('role', 'admin');

    if (profilesError) {
      console.error('Failed to query admin profiles:', profilesError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to query admin users' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No admin users found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ---- Process each admin user --------------------------------------------
    const result: DigestResult = {
      users_processed: 0,
      insights_generated: 0,
      emails_sent: 0,
      errors: [],
    };

    const dateStr = formatDate(new Date());

    for (const profile of adminProfiles) {
      const userId = profile.user_id;

      try {
        // Rate limit: max 1 digest per day per user
        const allowed = await checkDigestRateLimit(supabase, userId);
        if (!allowed) {
          result.errors.push(`User ${userId}: digest already sent today (rate limited)`);
          continue;
        }

        result.users_processed++;

        // Trigger strategic-agent analysis
        const analysisOk = await triggerAnalysis(supabaseUrl, serviceRoleKey, cronSecret);
        if (!analysisOk) {
          result.errors.push(`User ${userId}: strategic-agent invocation failed`);
          // Continue anyway -- there may be recent insights to report
        }

        // Brief delay to allow insight generation to complete
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Fetch newly generated insights
        const insights = await fetchRecentInsights(supabase, userId);
        result.insights_generated += insights.length;

        // Get user email
        const email = await getUserEmail(supabase, userId);
        if (!email) {
          result.errors.push(`User ${userId}: email not found`);
          continue;
        }

        // Build and send digest email
        if (insights.length === 0) {
          result.errors.push(`User ${userId}: no new insights generated`);
          continue;
        }

        const subject = `NOA Weekly Strategic Brief \u2014 ${dateStr}`;
        const html = buildDigestHtml(insights, dateStr);

        await sendEmail(email, subject, html);
        result.emails_sent++;

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Digest error for user ${userId}: ${msg}`);
        result.errors.push(`User ${userId}: ${msg}`);
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
