import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('FATAL: Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in Vercel.');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

function getAuthHeader(req){
  const header = req.headers['authorization'] || req.headers['Authorization'] || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function getUserFromToken(token){
  if(!supabase || !token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if(error || !data?.user) return null;
    return data.user;
  } catch(e){
    return null;
  }
}

export default async function handler(req, res){
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in Vercel.' });
  }

  try {
    const token = getAuthHeader(req);
    const user = await getUserFromToken(token);

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return res.status(200).json({
        success: true,
        items: data?.items || []
      });
    }

    if (req.method === 'POST') {
      const { items } = req.body || {};

      const { data, error } = await supabase
        .from('carts')
        .upsert({
          user_id: user.id,
          items: items || [],
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        items: data?.items || []
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Cart API error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to process cart request', details: error?.message || 'Unknown error' });
  }
}
