import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
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
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const supabaseRoleCheck = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profileData } = await supabaseRoleCheck
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    if (profileData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch recent sales data for context
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: recentSales } = await supabaseAdmin
      .from('sales')
      .select('sale_price, currency, sale_date, sale_type')
      .order('sale_date', { ascending: false })
      .limit(20);

    const { data: artworks } = await supabaseAdmin
      .from('artworks')
      .select('price, currency, status, category, series')
      .in('status', ['available', 'on_consignment'])
      .not('price', 'is', null)
      .limit(50);

    const { data: auctionData } = await supabaseAdmin
      .from('auction_alerts')
      .select('hammer_price, currency, estimate_low, estimate_high, result, sale_date')
      .eq('result', 'sold')
      .order('sale_date', { ascending: false })
      .limit(10);

    const salesSummary = (recentSales || []).map(
      (s: Record<string, unknown>) => `${s.sale_date}: ${s.currency} ${s.sale_price} (${s.sale_type || 'direct'})`
    ).join('\n');

    const priceRange = (artworks || []).map((a: Record<string, unknown>) => a.price as number);
    const minPrice = priceRange.length > 0 ? Math.min(...priceRange) : 0;
    const maxPrice = priceRange.length > 0 ? Math.max(...priceRange) : 0;
    const avgPrice = priceRange.length > 0 ? priceRange.reduce((a, b) => a + b, 0) / priceRange.length : 0;

    const auctionSummary = (auctionData || []).map(
      (a: Record<string, unknown>) => `${a.sale_date}: Hammer ${a.currency} ${a.hammer_price} (Est. ${a.estimate_low}-${a.estimate_high})`
    ).join('\n');

    const prompt = `You are an art market analyst specializing in contemporary art pricing. Analyze the current market position for artist Simon Berger (Swiss artist known for glass-breaking portrait art).

Current Inventory Data:
- ${artworks?.length || 0} artworks available (price range: ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}, avg: ${Math.round(avgPrice).toLocaleString()})

Recent Sales (last 20):
${salesSummary || 'No recent sales data'}

Auction Results:
${auctionSummary || 'No auction data'}

Based on this data, provide a market analysis report as JSON with these fields:
- market_position: Brief assessment of current market standing (1-2 sentences)
- price_trend: "rising" | "stable" | "declining"
- demand_assessment: "strong" | "moderate" | "weak"
- recommended_action: "raise_prices" | "hold" | "reduce_prices"
- suggested_increase_percent: Number (0 if hold/reduce, positive if raise)
- reasoning: 3-5 bullet points explaining your recommendation
- confidence: "high" | "medium" | "low"
- comparable_artists: List of 3-5 comparable artists with similar price ranges
- timing_recommendation: When to implement changes (immediate, 3 months, 6 months)

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
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const aiResult = await response.json();
    const text = aiResult.content?.[0]?.text || '{}';

    let reportData;
    try {
      reportData = JSON.parse(text);
    } catch {
      reportData = { market_position: text, error: 'Failed to parse structured response' };
    }

    // Store report in database
    await supabaseAdmin.from('price_intelligence_reports').insert({
      user_id: user.id,
      report_type: 'market_analysis',
      title: `Market Analysis — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      summary: reportData.market_position || 'Analysis complete',
      report_data: reportData,
      ai_model: 'claude-sonnet-4-20250514',
    });

    return new Response(JSON.stringify(reportData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
