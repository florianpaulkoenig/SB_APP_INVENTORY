-- Import/export document attachments for deliveries (customs papers,
-- shipping documents, invoices). Mirrors production_order_documents,
-- with the corrected get_user_role() RLS pattern from the start.

CREATE TABLE IF NOT EXISTS delivery_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_documents_delivery_id
  ON delivery_documents(delivery_id);

ALTER TABLE delivery_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_delivery_documents"
  ON delivery_documents FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');
