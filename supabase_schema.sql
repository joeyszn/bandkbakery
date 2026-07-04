-- User carts table
create table if not exists carts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null unique,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User pending orders table
create table if not exists pending_orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null unique,
  orders jsonb not null default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table carts enable row level security;
alter table pending_orders enable row level security;

-- Drop existing policies if they exist (idempotent)
drop policy if exists "Users see own cart" on carts;
drop policy if exists "Users insert own cart" on carts;
drop policy if exists "Users update own cart" on carts;
drop policy if exists "Users delete own cart" on carts;

drop policy if exists "Users see own pending orders" on pending_orders;
drop policy if exists "Users insert own pending orders" on pending_orders;
drop policy if exists "Users update own pending orders" on pending_orders;
drop policy if exists "Users delete own pending orders" on pending_orders;

-- Cart policies
create policy "Users see own cart" on carts for select using (auth.uid() = user_id);
create policy "Users insert own cart" on carts for insert with check (auth.uid() = user_id);
create policy "Users update own cart" on carts for update using (auth.uid() = user_id);
create policy "Users delete own cart" on carts for delete using (auth.uid() = user_id);

-- Pending orders policies
create policy "Users see own pending orders" on pending_orders for select using (auth.uid() = user_id);
create policy "Users insert own pending orders" on pending_orders for insert with check (auth.uid() = user_id);
create policy "Users update own pending orders" on pending_orders for update using (auth.uid() = user_id);
create policy "Users delete own pending orders" on pending_orders for delete using (auth.uid() = user_id);

-- Allow service role full access (for API via service_role key)
create policy "Service role full access carts" on carts for all using (auth.role() = 'service_role');
create policy "Service role full access pending_orders" on pending_orders for all using (auth.role() = 'service_role');
