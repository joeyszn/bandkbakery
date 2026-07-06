# Global Order Storage Setup

The admin page now supports global order storage. To enable cross-device order sync:

## Setup: Supabase + Vercel

You've already created the Supabase project 'bandkbakery' and connected it to Vercel. Just need to:

1. **Create the orders table in Supabase** - Go to SQL Editor and run:

```sql
-- Create orders table (with user_id column required by api/orders.js)
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

-- Enable RLS and allow public access for the bakery order system
alter table orders enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Allow public read" on orders;
drop policy if exists "Allow public insert" on orders;
drop policy if exists "Service role full access orders" on orders;

-- Allow public (unauthenticated) read and insert so orders work without login
create policy "Allow public read" on orders for select using (true);
create policy "Allow public insert" on orders for insert with check (true);
create policy "Service role full access orders" on orders for all using (auth.role() = 'service_role');
```

2. **Add Vercel Environment Variables** - Go to your Vercel project Settings > Environment Variables:
    - `SUPABASE_URL`: https://iqwhjqpwhmwipgtfrzoe.supabase.co
    - `SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxd2hqcXB3aG13aXBndGZyem9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzYzNzIsImV4cCI6MjA5NjYxMjM3Mn0.Qb3xv38v0LcGolhh87PrKMn7SJY4E-0MV-pij8IxYys
    - `ADMIN_PASSWORD`: bake (optional: change this for security)

3. **Redeploy** - Push to your repo or manually redeploy on Vercel

## How it works

- When an order is placed (cart.html), it saves to both localStorage AND `/api/orders`
- The admin page fetches all orders from `/api/orders-admin` endpoint
- All orders are now stored globally and visible to anyone accessing the admin page