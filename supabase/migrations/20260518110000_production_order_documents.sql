-- PDF attachments for production orders
CREATE TABLE IF NOT EXISTS production_order_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  production_order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE production_order_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_production_order_documents"
  ON production_order_documents FOR ALL
  USING  ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');
