// Supabase > Project Settings > API. The anon key is meant to be public (security comes from
// the row-level-security policies in supabase/schema.sql). NEVER put the service_role key here.
// Leave both empty to run in local-only mode (reports stay in this browser).
window.CIVICEYE_CONFIG = {
  SUPABASE_URL: '',       // e.g. 'https://abcdxyz.supabase.co'
  SUPABASE_ANON_KEY: '',  // starts with 'eyJ...' or 'sb_publishable_...'
};
