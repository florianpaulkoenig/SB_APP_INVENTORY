-- Add manual sell-through override per gallery
-- NULL = use computed rate, 0.00–1.00 = manual override
ALTER TABLE galleries ADD COLUMN IF NOT EXISTS sell_through_override NUMERIC(5,2) DEFAULT NULL;

COMMENT ON COLUMN galleries.sell_through_override IS 'Manual sell-through rate override (0.00-1.00). NULL = use computed rate from sales history.';
