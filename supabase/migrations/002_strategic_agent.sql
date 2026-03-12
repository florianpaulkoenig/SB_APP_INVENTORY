-- ---------------------------------------------------------------------------
-- 002_strategic_agent.sql — AI Strategic Agent tables
-- ---------------------------------------------------------------------------

-- AI Insights table
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Classification
  category TEXT NOT NULL CHECK (category IN (
    'pricing', 'inventory', 'sales', 'collector',
    'gallery', 'exhibition', 'production', 'market', 'strategic'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),

  -- Content
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  analysis TEXT NOT NULL,
  recommendations JSONB DEFAULT '[]',
  data_snapshot JSONB DEFAULT '{}',

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'acted', 'dismissed', 'expired')),
  expires_at TIMESTAMPTZ,
  acted_at TIMESTAMPTZ,

  -- Source
  trigger TEXT NOT NULL CHECK (trigger IN ('scheduled', 'on_demand', 'threshold')),
  ai_model TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user_status ON ai_insights(user_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_insights_category ON ai_insights(category);
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON ai_insights(priority);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created ON ai_insights(created_at DESC);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own insights" ON ai_insights FOR ALL
  USING (auth.uid() = user_id);

-- AI Conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]',
  context_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, updated_at DESC);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own conversations" ON ai_conversations FOR ALL
  USING (auth.uid() = user_id);

-- AI Rate Limits table
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  window_date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, mode, window_date)
);

ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own rate limits" ON ai_rate_limits FOR ALL
  USING (auth.uid() = user_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
