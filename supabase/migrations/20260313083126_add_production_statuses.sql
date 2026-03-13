-- Add 'consignment' and 'pre_sold' to production_orders status CHECK constraint
-- consignment: ordered for exhibition/sale
-- pre_sold: collector already purchased, revenue confirmed

ALTER TABLE production_orders DROP CONSTRAINT IF EXISTS production_orders_status_check;
ALTER TABLE production_orders ADD CONSTRAINT production_orders_status_check
  CHECK (status IN ('draft', 'ordered', 'in_production', 'quality_check', 'completed', 'consignment', 'pre_sold'));
