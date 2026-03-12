-- ---------------------------------------------------------------------------
-- 003_insight_feedback.sql
-- Adds feedback table for AI insight training + DELETE policy on conversations
-- ---------------------------------------------------------------------------

-- ai_insight_feedback: thumbs up/down + optional comment per insight
CREATE TABLE IF NOT EXISTS ai_insight_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  insight_id uuid REFERENCES ai_insights(id) ON DELETE CASCADE NOT NULL,
  rating text NOT NULL CHECK (rating IN ('positive', 'negative')),
  comment text,
  insight_category text NOT NULL,
  insight_priority text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, insight_id)
);

ALTER TABLE ai_insight_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON ai_insight_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own feedback"
  ON ai_insight_feedback FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
  ON ai_insight_feedback FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on feedback"
  ON ai_insight_feedback FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookup of feedback by user
CREATE INDEX IF NOT EXISTS idx_feedback_user ON ai_insight_feedback(user_id, created_at DESC);

-- Allow users to delete their own conversations
CREATE POLICY "Users can delete own conversations"
  ON ai_conversations FOR DELETE USING (auth.uid() = user_id);
