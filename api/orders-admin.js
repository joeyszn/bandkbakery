import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL: Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in Vercel.');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

function toNumber(value, fallback = 0){
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getItems(order){
  return Array.isArray(order?.items)
    ? order.items
    : Array.isArray(order?.purchasedItems)
      ? order.purchasedItems
      : [];
}

function calculateTotals(order){
  const items = getItems(order);
  const itemSubtotal = items.reduce((sum, item) => sum + toNumber(item?.price || item?.unitPrice) * toNumber(item?.quantity || item?.qty || 1), 0);
  const subtotal = items.length ? itemSubtotal : toNumber(order?.subtotal ?? order?.subTotal, 0);
  const deliveryFee = String(order?.method || order?.pickupOrDelivery || '').toLowerCase() === 'delivery' ? 10 : 0;
  const total = items.length ? subtotal + deliveryFee : toNumber(order?.total ?? order?.totalPaid ?? order?.amount, subtotal + deliveryFee);
  return { subtotal, deliveryFee, total };
}

function normalizeFromSupabase(row = {}){
  return {
    orderId: row.order_id || null,
    orderNumber: row.order_number || null,
    name: row.name || null,
    email: row.email || null,
    phone: row.phone || null,
    method: row.method || 'Pickup',
    address: row.address || null,
    pickupLocation: row.pickup_location || null,
    city: row.city || null,
    state: row.state || null,
    zip: row.zip || null,
    schedule: row.schedule || null,
    notes: row.notes || null,
    items: row.items || [],
    subtotal: row.subtotal || 0,
    deliveryFee: row.delivery_fee || 0,
    total: row.total || 0,
    paypalTransactionId: row.paypal_transaction_id || null,
    paymentStatus: row.payment_status || 'COMPLETED',
    adminStatus: row.admin_status || 'pending',
    capturedAt: row.captured_at || null,
    createdAt: row.created_at || null,
    user_id: row.user_id || null
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in Vercel.' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json((data || []).map(normalizeFromSupabase));
    }

    if (req.method === 'PATCH') {
      const { order_id, admin_status } = req.body || {};

      if (!order_id) {
        return res.status(400).json({ error: 'order_id is required' });
      }

      if (!admin_status || !['pending', 'completed'].includes(admin_status)) {
        return res.status(400).json({ error: 'admin_status must be "pending" or "completed"' });
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ admin_status, updated_at: new Date().toISOString() })
        .eq('order_id', order_id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({
        success: true,
        data: normalizeFromSupabase(data || {})
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin orders error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to process orders', details: error?.message || 'Unknown error' });
  }
}