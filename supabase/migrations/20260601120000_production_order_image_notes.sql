create table if not exists production_order_image_notes (
  id                   uuid primary key default gen_random_uuid(),
  production_order_id  uuid not null references production_orders(id) on delete cascade,
  storage_path         text not null,
  note                 text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (production_order_id, storage_path)
);

alter table production_order_image_notes enable row level security;

drop policy if exists "admin_all_production_order_image_notes" on production_order_image_notes;
create policy "admin_all_production_order_image_notes" on production_order_image_notes
  for all
  using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');
