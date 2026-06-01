-- Publication Budget: budgets + line items for book/publication projects

create table if not exists publication_budgets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  status      text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists publication_budget_items (
  id            uuid primary key default gen_random_uuid(),
  budget_id     uuid not null references publication_budgets(id) on delete cascade,
  type          text not null check (type in ('revenue', 'cost')),
  category      text not null,
  description   text not null,
  amount        numeric(14,2) not null default 0,
  currency      text not null default 'CHF',
  status        text not null default 'estimated' check (status in ('estimated', 'confirmed', 'invoiced', 'paid')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- RLS
alter table publication_budgets enable row level security;
alter table publication_budget_items enable row level security;

create policy "admin_all_publication_budgets" on publication_budgets
  for all using (
    exists (select 1 from user_profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin_all_publication_budget_items" on publication_budget_items
  for all using (
    exists (select 1 from user_profiles where id = auth.uid() and role = 'admin')
  );
