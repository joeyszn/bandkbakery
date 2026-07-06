-- Orders table (completed/past orders)
create table if not exists orders (
  id bigint generated always as identity primary key,
  order_id text,
  user_id uuid references auth.users(id),
  name text,
  email text,
  phone text,
  method text,
  address text,
  pickup_location text,
  city text,
  state text,
  zip text,
  schedule text,
  notes text,
  bagel_type text,
  macaron_type text,
  items jsonb default '[]'::jsonb,
  subtotal numeric default 0,
  delivery_fee numeric default 0,
  total numeric default 0,
  paypal_transaction_id text,
  payment_status text default 'COMPLETED',
  captured_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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
alter table orders enable row level security;
alter table carts enable row level security;
alter table pending_orders enable row level security;

-- Drop existing policies if they exist (idempotent)
drop policy if exists "Allow public read" on orders;
drop policy if exists "Allow public insert" on orders;
drop policy if exists "Service role full access orders" on orders;
drop policy if exists "Users see own cart" on carts;
drop policy if exists "Users insert own cart" on carts;
drop policy if exists "Users update own cart" on carts;
drop policy if exists "Users delete own cart" on carts;
drop policy if exists "Users see own pending orders" on pending_orders;
drop policy if exists "Users insert own pending orders" on pending_orders;
drop policy if exists "Users update own pending orders" on pending_orders;
drop policy if exists "Users delete own pending orders" on pending_orders;
drop policy if exists "Service role full access carts" on carts;
drop policy if exists "Service role full access pending_orders" on pending_orders;

-- Orders table policies
create policy "Allow public read" on orders for select using (true);
create policy "Allow public insert" on orders for insert with check (true);
create policy "Service role full access orders" on orders for all using (auth.role() = 'service_role');

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