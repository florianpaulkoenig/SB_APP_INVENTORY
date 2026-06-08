-- ---------------------------------------------------------------------------
-- NOA Inventory -- Packing List Crates
-- Structured crates per packing list; items link to a crate via crate_id.
-- ---------------------------------------------------------------------------

create table if not exists packing_list_crates (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  packing_list_id uuid references packing_lists(id) on delete cascade not null,
  crate_name      text not null,
  width           numeric(10,1),
  height          numeric(10,1),
  depth           numeric(10,1),
  dimension_unit  text not null default 'cm',
  weight          numeric(10,2),
  packaging_type  text,
  notes           text,
  sort_order      int not null default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_packing_list_crates_list
  on packing_list_crates(packing_list_id);

-- Link items to a crate (nullable — unassigned items have crate_id = null)
alter table packing_list_items
  add column if not exists crate_id uuid references packing_list_crates(id) on delete set null;

-- RLS
alter table packing_list_crates enable row level security;

drop policy if exists "admin_all_packing_list_crates" on packing_list_crates;
create policy "admin_all_packing_list_crates" on packing_list_crates
  for all using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');
