const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Supabase environment variables are missing. Configure backend/.env before starting.");
}

const supabase = createClient(
  process.env.SUPABASE_URL || "https://example.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "missing-server-key",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

module.exports = supabase;
