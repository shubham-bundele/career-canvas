export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=300');

  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    siteUrl: process.env.PUBLIC_SITE_URL || '',
    magicLinkEnabled: process.env.AUTH_MAGIC_LINK_ENABLED === 'true',
    googleEnabled: process.env.AUTH_GOOGLE_ENABLED === 'true'
  });
}
