-- ============================================================================
-- Social Media Tracker
-- Monthly, manually entered figures per social media account. One account per
-- platform/handle (a portfolio may run several accounts on one platform); one
-- metrics row per account and calendar month.
--
--   followers            — stock: follower/subscriber count at month end
--   everything else      — flow: activity within that month
-- All metrics are nullable: not every platform reports every figure, and an
-- empty cell must stay distinguishable from a real zero.
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_media_accounts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  portfolio    TEXT NOT NULL DEFAULT 'simon_berger',
  platform     TEXT NOT NULL CHECK (platform IN (
                 'instagram', 'facebook', 'tiktok', 'threads', 'x',
                 'linkedin', 'rednote', 'youtube', 'snapchat', 'bluesky'
               )),
  handle       TEXT NOT NULL DEFAULT '',
  url          TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (portfolio, platform, handle)
);

CREATE TABLE IF NOT EXISTS social_media_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES social_media_accounts(id) ON DELETE CASCADE,
  month           DATE NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
  followers       INTEGER CHECK (followers >= 0),
  posts           INTEGER CHECK (posts >= 0),
  views           BIGINT  CHECK (views >= 0),
  reach           BIGINT  CHECK (reach >= 0),
  impressions     BIGINT  CHECK (impressions >= 0),
  likes           BIGINT  CHECK (likes >= 0),
  comments        BIGINT  CHECK (comments >= 0),
  shares          BIGINT  CHECK (shares >= 0),
  saves           BIGINT  CHECK (saves >= 0),
  profile_visits  BIGINT  CHECK (profile_visits >= 0),
  link_clicks     BIGINT  CHECK (link_clicks >= 0),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, month)
);

CREATE INDEX IF NOT EXISTS idx_social_media_metrics_month
  ON social_media_metrics (month);

ALTER TABLE social_media_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_metrics  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages social_media_accounts" ON social_media_accounts;
CREATE POLICY "Admin manages social_media_accounts"
  ON social_media_accounts FOR ALL TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  );

DROP POLICY IF EXISTS "Admin manages social_media_metrics" ON social_media_metrics;
CREATE POLICY "Admin manages social_media_metrics"
  ON social_media_metrics FOR ALL TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE user_id = (select auth.uid())) = 'admin'
  );
