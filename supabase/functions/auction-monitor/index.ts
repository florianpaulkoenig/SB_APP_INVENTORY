import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'https://app.noacontemporary.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth: accept CRON_SECRET or admin JWT
    const cronHeader = req.headers.get('x-cron-secret');
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (cronHeader === CRON_SECRET && CRON_SECRET) {
      // Cron invocation — get admin user
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1);
      userId = profiles?.[0]?.user_id || null;
    } else if (authHeader) {
      const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (user) {
        // Verify admin role for JWT auth path
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: profileData } = await supabaseAdmin
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        if (profileData?.role === 'admin') {
          userId = user.id;
        }
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Rate limiting: 10 requests per minute
    const { data: withinLimit } = await supabase
      .rpc('check_rate_limit', { p_user_id: userId, p_function_name: 'auction-monitor', p_max_requests: 10 });
    if (withinLimit === false) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get existing alerts to avoid duplicates
    const { data: existingAlerts } = await supabase
      .from('auction_alerts')
      .select('artwork_title, auction_house, sale_date')
      .eq('ai_detected', true);

    const existingKeys = new Set(
      (existingAlerts || []).map(
        (a: Record<string, unknown>) => `${a.auction_house}|${a.artwork_title}|${a.sale_date}`
      )
    );

    const prompt = `You are an art market researcher. Search your knowledge for any upcoming or recent auction lots featuring artworks by Simon Berger (Swiss contemporary artist known for glass-breaking portrait artwork, shattered glass art).

Check these auction houses: Christie's, Sotheby's, Phillips, Bonhams, Dorotheum, Ketterer Kunst, Koller, Artcurial, Grisebach, Lempertz.

For each lot found, return a JSON array with objects containing:
- auction_house: Name of the auction house
- sale_title: Name of the auction sale
- sale_date: Date in YYYY-MM-DD format
- lot_number: Lot number if known
- artwork_title: Title of the artwork
- artwork_description: Brief description (medium, dimensions)
- estimate_low: Low estimate in the sale currency (number only)
- estimate_high: High estimate in the sale currency (number only)
- currency: Currency code (EUR, USD, CHF, GBP)

If you don't find any current auction lots, return an empty array [].
Return ONLY valid JSON array, no markdown or explanation.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const aiResult = await response.json();
    const text = aiResult.content?.[0]?.text || '[]';

    let lots: Array<Record<string, unknown>>;
    try {
      lots = JSON.parse(text);
      if (!Array.isArray(lots)) lots = [];
    } catch {
      lots = [];
    }

    // Filter out duplicates and insert new alerts
    let newCount = 0;
    const newAlerts: string[] = [];

    for (const lot of lots) {
      const key = `${lot.auction_house}|${lot.artwork_title}|${lot.sale_date}`;
      if (existingKeys.has(key)) continue;

      // Try to match artwork in our database
      let matchedArtworkId = null;
      let matchedGalleryId = null;

      if (lot.artwork_title) {
        const { data: matchedArtworks } = await supabase
          .from('artworks')
          .select('id, title, gallery_id')
          .ilike('title', `%${lot.artwork_title}%`)
          .limit(1);

        if (matchedArtworks && matchedArtworks.length > 0) {
          matchedArtworkId = matchedArtworks[0].id;
          matchedGalleryId = matchedArtworks[0].gallery_id;

          // If no gallery on artwork, check sales history
          if (!matchedGalleryId) {
            const { data: sales } = await supabase
              .from('sales')
              .select('gallery_id')
              .eq('artwork_id', matchedArtworkId)
              .not('gallery_id', 'is', null)
              .limit(1);
            if (sales && sales.length > 0) matchedGalleryId = sales[0].gallery_id;
          }
        }
      }

      const { error } = await supabase.from('auction_alerts').insert({
        user_id: userId,
        auction_house: lot.auction_house || 'Unknown',
        sale_title: lot.sale_title || null,
        sale_date: lot.sale_date || null,
        lot_number: lot.lot_number || null,
        artwork_title: lot.artwork_title || 'Unknown',
        artwork_description: lot.artwork_description || null,
        estimate_low: lot.estimate_low || null,
        estimate_high: lot.estimate_high || null,
        currency: lot.currency || 'EUR',
        result: 'upcoming',
        matched_artwork_id: matchedArtworkId,
        matched_gallery_id: matchedGalleryId,
        ai_detected: true,
      });

      if (!error) {
        newCount++;
        newAlerts.push(`${lot.auction_house}: ${lot.artwork_title}`);
      }
    }

    // Send email notification if new lots found
    if (newCount > 0) {
      // Get admin email
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const adminUser = users?.find((u: Record<string, unknown>) => u.id === userId);
      const adminEmail = (adminUser as Record<string, unknown>)?.email as string;

      if (adminEmail) {
        const alertList = newAlerts.join('\n• ');
        await supabase.functions.invoke('send-email', {
          body: {
            to: adminEmail,
            subject: `Auction Monitor: ${newCount} new lot${newCount > 1 ? 's' : ''} found`,
            body: `The auction monitor has detected ${newCount} new lot(s) by Simon Berger:\n\n• ${alertList}\n\nView details in your dashboard: Auction Tracking`,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({ processed: lots.length, new: newCount, alerts: newAlerts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
