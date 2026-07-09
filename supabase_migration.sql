-- Migration: Add admin_status column to orders table
-- Run this in your Supabase SQL Editor if the table already exists

-- Add the admin_status column if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS admin_status text DEFAULT 'pending';

-- Create an index on admin_status for faster admin filtering
CREATE INDEX IF NOT EXISTS idx_orders_admin_status ON orders (admin_status);

-- Update existing completed/past orders that have no admin_status set
-- 'pending' means the order needs admin attention
-- 'completed' means the admin has fulfilled the order
UPDATE orders 
SET admin_status = 'pending' 
WHERE admin_status IS NULL;

-- Make sure all new orders will default to 'pending'
ALTER TABLE orders 
ALTER COLUMN admin_status SET DEFAULT 'pending';