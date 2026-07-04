import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    if (req.method === 'POST') {
      const { action, email, password, name } = req.body || {};

      if (action === 'signup') {
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || ''
            }
          }
        });

        if (error) {
          return res.status(400).json({ error: error.message || 'Sign up failed' });
        }

        return res.status(200).json({
          success: true,
          user: data.user ? {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || ''
          } : null,
          session: data.session ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          } : null
        });
      }

      if (action === 'login') {
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          return res.status(400).json({ error: error.message || 'Login failed' });
        }

        return res.status(200).json({
          success: true,
          user: data.user ? {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || ''
          } : null,
          session: data.session ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          } : null
        });
      }

      if (action === 'logout') {
        const token = getAuthHeader(req);
        const user = await getUserFromToken(token);
        if (!user) {
          return res.status(401).json({ error: 'Not authenticated' });
        }

        const { error } = await supabase.auth.admin.signOut(token);
        if (error) {
          return res.status(400).json({ error: error.message || 'Logout failed' });
        }

        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid action. Use signup, login, or logout.' });
    }

    if (req.method === 'GET') {
      const token = getAuthHeader(req);
      const user = await getUserFromToken(token);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || ''
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Auth error:', error?.message || error);
    return res.status(500).json({ error: 'Failed to process auth request', details: error?.message || 'Unknown error' });
  }
}
