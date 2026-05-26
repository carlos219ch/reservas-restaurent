-- ============================================================
-- 002_add_menu_items.sql
-- Carta del restaurante: platos con categoría, descripción y precio
-- ============================================================

create table if not exists public.menu_items (
  id          uuid         primary key default gen_random_uuid(),
  category    text         not null,
  name        text         not null,
  description text,
  price       numeric(10,2) not null check (price >= 0),
  available   boolean      not null default true,
  sort_order  integer      not null default 0,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

-- Índice para ordenar por categoría rápidamente
create index if not exists menu_items_category_idx on public.menu_items (category, sort_order);

alter table public.menu_items enable row level security;

-- Admins tienen acceso completo
create policy "admin_all_menu_items" on public.menu_items
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Clientes pueden leer ítems disponibles
create policy "client_read_available_menu" on public.menu_items
  for select
  using (available = true);

-- Trigger para updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger menu_items_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();
