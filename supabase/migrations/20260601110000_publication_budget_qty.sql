alter table publication_budget_items
  add column if not exists quantity  numeric(10,2) not null default 1,
  add column if not exists unit_price numeric(14,2) not null default 0;

-- backfill: derive unit_price from existing amount (qty=1)
update publication_budget_items set unit_price = amount where unit_price = 0;
