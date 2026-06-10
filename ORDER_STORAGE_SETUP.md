# Global Order Storage Setup

The admin page now supports global order storage. To enable cross-device order sync:

## Setup: Supabase + Vercel

You've already created the Supabase project 'bandkbakery' and connected it to Vercel. Just need to:

1. **Create the orders table in Supabase** - Go to SQL Editor and run:

```sql
-- Create orders table
create table orders (
  id bigint generated always as identity primary key,
  order_id text,
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
  items jsonb,
  subtotal numeric,
  delivery_fee numeric,
  total numeric,
  paypal_transaction_id text,
  payment_status text,
  captured_at timestamp,
  created_at timestamp default now()
);

-- Enable RLS and allow public access for the bakery order system
alter table orders enable row level security;
create policy "Allow public read" on orders for select using (true);
create policy "Allow public insert" on orders for insert with check (true);
```

2. **Add Vercel Environment Variables** - Go to your Vercel project Settings > Environment Variables:
   - `SUPABASE_URL`: https://iqwhjqpwhmwipgtfrzoe.supabase.co
   - `SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxd2hqcXB3aG13aXBndGZyem9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzYzNzIsImV4cCI6MjA5NjYxMjM3Mn0.Qb3xv38v0LcGolhh87PrKMn7SJY4E-0MV-pij8IxYys

3. **Redeploy** - Push to your repo or manually redeploy on Vercel

## How it works

- When an order is placed (cart.html), it saves to both localStorage AND `/api/orders`
- When admin page loads, it fetches from `/api/orders` first, then merges with localStorage
- All orders are now stored globally and visible to anyone accessing the admin page