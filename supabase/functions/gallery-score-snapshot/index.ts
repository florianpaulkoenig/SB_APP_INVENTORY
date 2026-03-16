// ---------------------------------------------------------------------------
// NOA Inventory -- Supabase Edge Function: gallery-score-snapshot
// Cron job that computes monthly partner score snapshots for every gallery.
// SECURITY: Requires CRON_SECRET header or valid admin JWT.
// ---------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArtworkRow {
  id: string;
  gallery_id: string | null;
  status: string | null;
  consigned_since: string | null;
}

interface SaleRow {
  id: string;
  gallery_id: string | null;
  sale_price: number | null;
  currency: string | null;
  sale_date: string | null;
  reporting_status: string | null;
  artworks: { consigned_since: string | null } | null;
}

interface GalleryRow {
  id: string;
  name: string;
  user_id: string;
}

interface PartnerScoreFactors {
  salesVelocity: number;
  reportingCompleteness: number;
  consistency: number;
  conversionRate: number;
  timeliness: number;
}

// ---------------------------------------------------------------------------
// Scoring logic (mirrors useGalleryPerformanceAnalytics + gallery.ts)
// ---------------------------------------------------------------------------

function computePartnerScore(factors: PartnerScoreFactors): number {
  return (
    factors.salesVelocity * 0.25 +
    factors.reportingCompleteness * 0.25 +
    factors.consistency * 0.15 +
    factors.conversionRate * 0.25 +
    factors.timeliness * 0.10
  );
}

function calcReportingCompleteness(
  sales: { reporting_status: string }[],
): number {
  if (sales.length === 0) return 100;
  const complete = sales.filter(
    (s) => s.reporting_status === 'sold_reported' || s.reporting_status === 'verified',
  ).length;
  return (complete / sales.length) * 100;
}

function gallerySellThrough(sold: number, totalAllocated: number): number {
  if (totalAllocated <= 0) return 0;
  return (sold / totalAllocated) * 100;
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

    // ---- Fetch all galleries, artworks, and sales ---------------------------
    const [galleriesRes, artworksRes, salesRes] = await Promise.all([
      supabase.from('galleries').select('id, name, user_id'),
      supabase.from('artworks').select('id, gallery_id, status, consigned_since'),
      supabase.from('sales').select('id, gallery_id, sale_price, currency, sale_date, reporting_status, artwork_id, artworks(consigned_since)'),
    ]);

    if (galleriesRes.error) throw galleriesRes.error;
    if (artworksRes.error) throw artworksRes.error;
    if (salesRes.error) throw salesRes.error;

    const galleries = (galleriesRes.data ?? []) as GalleryRow[];
    const artworks = (artworksRes.data ?? []) as ArtworkRow[];
    const sales = (salesRes.data ?? []) as SaleRow[];

    // Group by gallery
    const artworksByGallery = new Map<string, ArtworkRow[]>();
    for (const a of artworks) {
      if (!a.gallery_id) continue;
      const arr = artworksByGallery.get(a.gallery_id) ?? [];
      arr.push(a);
      artworksByGallery.set(a.gallery_id, arr);
    }

    const salesByGallery = new Map<string, SaleRow[]>();
    for (const s of sales) {
      if (!s.gallery_id) continue;
      const arr = salesByGallery.get(s.gallery_id) ?? [];
      arr.push(s);
      salesByGallery.set(s.gallery_id, arr);
    }

    // ---- Compute score per gallery and insert snapshot -----------------------
    const now = new Date().toISOString();
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const g of galleries) {
      const gArtworks = artworksByGallery.get(g.id) ?? [];
      const gSales = salesByGallery.get(g.id) ?? [];

      // Skip galleries with no activity
      if (gArtworks.length === 0 && gSales.length === 0) {
        skipped++;
        continue;
      }

      const totalAllocated = gArtworks.length;
      const soldCount = gSales.length;
      const sellThru = gallerySellThrough(soldCount, totalAllocated);

      // Avg days to sale
      let totalDays = 0;
      let dayCount = 0;
      for (const s of gSales) {
        const start = s.artworks?.consigned_since;
        if (start && s.sale_date) {
          const days = (new Date(s.sale_date).getTime() - new Date(start).getTime()) / 86400000;
          if (days >= 0) { totalDays += days; dayCount++; }
        }
      }
      const avgDays = dayCount > 0 ? Math.round(totalDays / dayCount) : null;

      // Reporting completeness
      const repComp = calcReportingCompleteness(
        gSales.map((s) => ({ reporting_status: s.reporting_status || 'draft' })),
      );

      // Partner score factors
      const velocityScore = avgDays != null ? Math.max(0, 100 - avgDays) : 50;
      const conversionScore = sellThru;
      const factors: PartnerScoreFactors = {
        salesVelocity: Math.min(100, velocityScore),
        reportingCompleteness: repComp,
        consistency: soldCount > 0 ? Math.min(100, soldCount * 20) : 0,
        conversionRate: conversionScore,
        timeliness: repComp, // simplified: use reporting completeness as proxy
      };
      const score = computePartnerScore(factors);

      // Insert snapshot row
      const { error: insertError } = await supabase
        .from('partner_score_snapshots')
        .insert({
          user_id: g.user_id,
          gallery_id: g.id,
          score: Math.round(score),
          factors_json: factors,
          calculated_at: now,
        });

      if (insertError) {
        console.error(`Failed to insert snapshot for gallery ${g.id}:`, insertError.message);
        errors++;
      } else {
        inserted++;
      }
    }

    // ---- Return summary -----------------------------------------------------
    return new Response(
      JSON.stringify({
        processed: galleries.length,
        inserted,
        skipped,
        errors,
        calculated_at: now,
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
