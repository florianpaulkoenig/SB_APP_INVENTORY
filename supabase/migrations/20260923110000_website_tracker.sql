-- ============================================================================
-- Website Tracker (extends the Social Media Tracker)
-- Monthly, manually entered website analytics (Squarespace / Wix style
-- figures), plus social visits per platform for the social → web conversion.
-- One row per website and calendar month; every metric is nullable so an
-- empty cell stays distinguishable from a real zero.
-- ============================================================================

CREATE TABLE IF NOT EXISTS websites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  portfolio   TEXT NOT NULL DEFAULT 'simon_berger',
  domain      TEXT NOT NULL,
  url         TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (portfolio, domain)
);

CREATE TABLE IF NOT EXISTS website_metrics (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id            UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  month                 DATE NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
  unique_visitors       INTEGER CHECK (unique_visitors >= 0),
  visits                INTEGER CHECK (visits >= 0),
  pageviews             INTEGER CHECK (pageviews >= 0),
  bounce_rate           NUMERIC(5,2) CHECK (bounce_rate BETWEEN 0 AND 100),   -- %
  avg_visit_duration    INTEGER CHECK (avg_visit_duration >= 0),              -- seconds
  form_submissions      INTEGER CHECK (form_submissions >= 0),
  newsletter_signups    INTEGER CHECK (newsletter_signups >= 0),
  -- Visits by traffic source
  source_direct         INTEGER CHECK (source_direct >= 0),
  source_search         INTEGER CHECK (source_search >= 0),
  source_social         INTEGER CHECK (source_social >= 0),
  source_referral       INTEGER CHECK (source_referral >= 0),
  source_email          INTEGER CHECK (source_email >= 0),
  source_other          INTEGER CHECK (source_other >= 0),
  -- Social visits split by platform: {"instagram": 120, "facebook": 30, ...}
  -- (keys = social_media_accounts.platform) — basis of the social → web
  -- conversion per platform
  social_by_platform    JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (website_id, month)
);

CREATE INDEX IF NOT EXISTS idx_website_metrics_month ON website_metrics (month);

ALTER TABLE websites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages websites" ON websites;
CREATE POLICY "Admin manages websites"
  ON websites FOR ALL TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  );

DROP POLICY IF EXISTS "Admin manages website_metrics" ON website_metrics;
CREATE POLICY "Admin manages website_metrics"
  ON website_metrics FOR ALL TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  );

-- The two sites tracked from the start
INSERT INTO websites (portfolio, domain, url, sort_order, user_id) VALUES
  ('simon_berger', 'simonberger.art',     'https://simonberger.art',     0, NULL),
  ('simon_berger', 'noacontemporary.com', 'https://noacontemporary.com', 1, NULL)
ON CONFLICT (portfolio, domain) DO NOTHING;
