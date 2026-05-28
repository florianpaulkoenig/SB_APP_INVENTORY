-- Add show_price flag to production_orders (for museum/client use cases)
ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS show_price BOOLEAN NOT NULL DEFAULT true;
