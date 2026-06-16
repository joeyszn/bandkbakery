import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const FIELD_MAP = {
  orderId: 'order_id',
  pickupLocation: 'pickup_location',
  paypalTransactionId: 'paypal_transaction_id',
  paymentStatus: 'payment_status',
  deliveryFee: 'delivery_fee',
  capturedAt: 'captured_at',
  createdAt: 'created_at'
};

const REVERSE_FIELD_MAP = Object.fromEntries(
  Object.entries(FIELD_MAP).map(([clientKey, dbKey]) => [dbKey, clientKey])
);

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
  const deliveryFee = String(order?.method || order?.pickupOrDelivery || '').toLowerCase() === 'delivery' ? 5 : 0;
  const total = items.length ? subtotal + deliveryFee : toNumber(order?.total ?? order?.totalPaid ?? order?.amount, subtotal + deliveryFee);
  return { subtotal, deliveryFee, total };
}

function normalizeForSupabase(order = {}){
  const { subtotal, deliveryFee, total } = calculateTotals(order);

  return {
    order_id: order.orderId || order.order_id || order.orderNumber || null,
    name: order.name || order.customerName || null,
    email: order.email || order.customerEmail || null,
    phone: order.phone || order.customerPhone || null,
    method: order.method || order.pickupOrDelivery || 'Pickup',
    address: order.address || null,
    pickup_location: order.pickupLocation || order.pickup_location || null,
    city: order.city || null,
    state: order.state || null,
    zip: order.zip || null,
    schedule: order.schedule || null,
    notes: order.notes || order.specialInstructions || null,
    items: getItems(order),
    subtotal,
    delivery_fee: deliveryFee,
    total,
    paypal_transaction_id: order.paypalTransactionId || order.paypal_transaction_id || order.paymentId || order.transactionId || null,
    payment_status: order.paymentStatus || order.payment_status || order.status || 'COMPLETED',
    captured_at: order.capturedAt || order.captured_at || null,
    created_at: order.createdAt || order.created_at || new Date().toISOString()
  };
}

function normalizeFromSupabase(row = {}){
  const order = {};

  for (const [clientKey, dbKey] of Object.entries(FIELD_MAP)){
    if (row[dbKey] !== undefined && row[dbKey] !== null) {
      order[clientKey] = row[dbKey];
    }
  }

  for (const [key, value] of Object.entries(row)){
    if (order[key] === undefined && !Object.values(FIELD_MAP).includes(key)) {
      order[key] = value;
    }
  }

  if (row.order_id && !order.orderId) order.orderId = row.order_id;
  if (row.pickup_location && !order.pickupLocation) order.pickupLocation = row.pickup_location;
  if (row.paypal_transaction_id && !order.paypalTransactionId) order.paypalTransactionId = row.paypal_transaction_id;
  if (row.payment_status && !order.paymentStatus) order.paymentStatus = row.payment_status;
  if (row.delivery_fee !== undefined) order.deliveryFee = row.delivery_fee;
  if (row.captured_at && !order.capturedAt) order.capturedAt = row.captured_at;
  if (row.created_at && !order.createdAt) order.createdAt = row.created_at;
  if (row.items) order.items = row.items;

  const totals = calculateTotals(order);
  if (order.subtotal === undefined || order.subtotal === null) order.subtotal = totals.subtotal;
  if (order.deliveryFee === undefined || order.deliveryFee === null) order.deliveryFee = totals.deliveryFee;
  if (order.total === undefined || order.total === null) order.total = totals.total;

  return order;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in Vercel.' });
  }

  try {
    if (req.method === 'GET') {
      let query = supabase
        .from('orders')
        .select('*');

      const email = req.query?.email;
      if (email) {
        query = query.eq('email', email);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json((data || []).map(normalizeFromSupabase));
    }

    if (req.method === 'POST') {
      const order = normalizeForSupabase(req.body || {});

      const { data, error } = await supabase
        .from('orders')
        .insert(order)
        .select();

      if (error) throw error;
      return res.status(200).json({
        success: true,
        data: normalizeFromSupabase(Array.isArray(data) ? data[0] : data)
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Orders error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to process order', details: error?.message || 'Unknown error' });
  }
}
