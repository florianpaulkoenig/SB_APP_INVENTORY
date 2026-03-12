-- ============================================================================
-- Migration: 001_intelligence_platform.sql
-- Description: Extend NOA Inventory database for Strategic Intelligence Platform
-- Date: 2026-03-12
-- ============================================================================

-- ============================================================================
-- 1. Extend existing tables
-- ============================================================================

-- 1a. Extend sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reporting_status TEXT DEFAULT 'draft';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reporting_due_date TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_location_type TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS final_invoiced_amount NUMERIC;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS negotiation_notes TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sales_channel TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS collector_anonymity_mode TEXT DEFAULT 'named';

-- 1b. Extend artworks table
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS size_category TEXT;

-- 1c. Extend production_orders table
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS planned_release_date DATE;

-- ============================================================================
-- 2. New tables
-- ============================================================================

-- 2a. anonymous_collectors
CREATE TABLE IF NOT EXISTS anonymous_collectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT UNIQUE NOT NULL,
  city TEXT,
  country TEXT,
  collector_type TEXT,
  segment TEXT,
  acquisition_pattern TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2b. partner_score_snapshots
CREATE TABLE IF NOT EXISTS partner_score_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL,
  factors_json JSONB,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2c. reporting_reminders
CREATE TABLE IF NOT EXISTS reporting_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2d. gallery_access_tiers
CREATE TABLE IF NOT EXISTS gallery_access_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'standard',
  unlocked_features JSONB DEFAULT '[]',
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2e. career_milestones
CREATE TABLE IF NOT EXISTS career_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  milestone_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  institution TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. Enable Row Level Security
-- ============================================================================

ALTER TABLE anonymous_collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reporting_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_access_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_milestones ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies (user_id = auth.uid())
-- ============================================================================

-- anonymous_collectors
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'anonymous_collectors' AND policyname = 'anonymous_collectors_user_policy'
  ) THEN
    CREATE POLICY anonymous_collectors_user_policy ON anonymous_collectors
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- partner_score_snapshots
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'partner_score_snapshots' AND policyname = 'partner_score_snapshots_user_policy'
  ) THEN
    CREATE POLICY partner_score_snapshots_user_policy ON partner_score_snapshots
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- reporting_reminders
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reporting_reminders' AND policyname = 'reporting_reminders_user_policy'
  ) THEN
    CREATE POLICY reporting_reminders_user_policy ON reporting_reminders
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- gallery_access_tiers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gallery_access_tiers' AND policyname = 'gallery_access_tiers_user_policy'
  ) THEN
    CREATE POLICY gallery_access_tiers_user_policy ON gallery_access_tiers
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- career_milestones
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'career_milestones' AND policyname = 'career_milestones_user_policy'
  ) THEN
    CREATE POLICY career_milestones_user_policy ON career_milestones
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- 5. Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_partner_score_snapshots_gallery_calculated
  ON partner_score_snapshots (gallery_id, calculated_at DESC);

CREATE INDEX IF NOT EXISTS idx_reporting_reminders_sale_id
  ON reporting_reminders (sale_id);

CREATE INDEX IF NOT EXISTS idx_reporting_reminders_status_due_date
  ON reporting_reminders (status, due_date);

CREATE INDEX IF NOT EXISTS idx_career_milestones_year
  ON career_milestones (year);

CREATE INDEX IF NOT EXISTS idx_anonymous_collectors_country
  ON anonymous_collectors (country);

-- ============================================================================
-- 6. Reload PostgREST schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';
