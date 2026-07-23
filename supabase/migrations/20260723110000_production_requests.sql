-- Production requests: gallery/collector enquiries captured with the same
-- schema as production orders. A request lives in production_orders with
-- record_type = 'request' and status 'requested' or 'rejected'.
-- Confirming converts it in place (record_type -> 'order', new PO number,
-- original REQ number preserved in request_number, converted_from_request_at
-- stamped for sell-through analytics).

ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS record_type TEXT NOT NULL DEFAULT 'order',
  ADD COLUMN IF NOT EXISTS request_number TEXT,
  ADD COLUMN IF NOT EXISTS converted_from_request_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

ALTER TABLE production_orders DROP CONSTRAINT IF EXISTS production_orders_record_type_check;
ALTER TABLE production_orders ADD CONSTRAINT production_orders_record_type_check
  CHECK (record_type IN ('order', 'request'));

-- Extend status check with request statuses
ALTER TABLE production_orders DROP CONSTRAINT IF EXISTS production_orders_status_check;
ALTER TABLE production_orders ADD CONSTRAINT production_orders_status_check
  CHECK (status IN (
    'draft', 'ordered', 'in_production', 'quality_check', 'completed',
    'consignment', 'pre_sold', 'shipped',
    'requested', 'rejected'
  ));

CREATE INDEX IF NOT EXISTS production_orders_record_type_idx
  ON production_orders (record_type);
