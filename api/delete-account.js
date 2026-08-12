import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authentication' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    return res.status(503).json({ error: 'Account deletion service not configured' });
  }

  const accessToken = authHeader.split(' ')[1];

  try {
    const userClient = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('Account deletion failed:', deleteError.message);
      return res.status(500).json({ error: 'Account deletion failed' });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Account deletion error:', e.message);
    return res.status(500).json({ error: 'Internal error' });
  }
}
