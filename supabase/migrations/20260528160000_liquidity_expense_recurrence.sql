-- ---------------------------------------------------------------------------
-- Expand noa_liquidity_expenses recurrence types + add currency column
-- ---------------------------------------------------------------------------

-- 1. Drop old 2-value constraint
ALTER TABLE noa_liquidity_expenses
  DROP CONSTRAINT IF EXISTS noa_liquidity_expenses_type_check;

-- 2. Migrate legacy 'fixed' → 'monthly' before adding new constraint
UPDATE noa_liquidity_expenses SET type = 'monthly' WHERE type = 'fixed';

-- 3. New constraint: 5 recurrence types
ALTER TABLE noa_liquidity_expenses
  ADD CONSTRAINT noa_liquidity_expenses_type_check
  CHECK (type IN ('one_time', 'monthly', 'quarterly', 'semi_annual', 'annual'));

-- 4. Currency column (CHF default, matches income table)
ALTER TABLE noa_liquidity_expenses
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'CHF';

-- 5. Ensure every row has a due_date anchor (recurring rows that had no date)
UPDATE noa_liquidity_expenses
  SET due_date = CURRENT_DATE
  WHERE due_date IS NULL;
