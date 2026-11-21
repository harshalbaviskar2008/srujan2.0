/**
 * SmartClass - Supabase Configuration
 * 
 * IMPORTANT: The URL must be the base project URL (NO /rest/v1/ at the end!)
 * Example: https://abcdefghij.supabase.co   <-- CORRECT
 *          https://abcdefghij.supabase.co/rest/v1/  <-- WRONG (breaks Realtime)
 */

const SUPABASE_CONFIG = {
  url: localStorage.getItem('smartclass_sb_url') || "https://dokmayffuxynebgvxkrv.supabase.co",
  anonKey: localStorage.getItem('smartclass_sb_key') || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRva21heWZmdXh5bmViZ3Z4a3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwOTUzMjMsImV4cCI6MjExMDY3MTMyM30.X6SN189ldttU0VapKtFMW-jLlrhXUw_Ts59xF9qog3U"
};

/**
 * Returns true if real Supabase credentials have been configured
 */
function isSupabaseConfigured() {
  const url = SUPABASE_CONFIG.url || '';
  const key = SUPABASE_CONFIG.anonKey || '';
  return url.startsWith('https://') &&
         !url.includes('YOUR_PROJECT_ID') &&
         key.length > 20 &&
         !key.includes('YOUR_SUPABASE_ANON_PUBLIC_KEY');
}

/**
 * Initialize Supabase Client
 */
let supabaseClient = null;

try {
  if (window.supabase && isSupabaseConfigured()) {
    // Strip any accidental /rest/v1/ suffix — SDK adds this internally
    const cleanUrl = SUPABASE_CONFIG.url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    supabaseClient = window.supabase.createClient(cleanUrl, SUPABASE_CONFIG.anonKey, {
      realtime: {
        params: { eventsPerSecond: 10 }
      }
    });
    console.log("✔ Supabase client initialized:", cleanUrl);
  } else {
    console.warn("ℹ Supabase not configured. Running in demo mode.");
  }
} catch (err) {
  console.error("Error initializing Supabase client:", err);
}

/**
 * Save credentials from UI Settings Tab
 */
function saveSupabaseCredentials(url, key) {
  const cleanUrl = url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  localStorage.setItem('smartclass_sb_url', cleanUrl);
  localStorage.setItem('smartclass_sb_key', key.trim());
  SUPABASE_CONFIG.url = cleanUrl;
  SUPABASE_CONFIG.anonKey = key.trim();

  if (window.supabase && isSupabaseConfigured()) {
    supabaseClient = window.supabase.createClient(cleanUrl, key.trim(), {
      realtime: { params: { eventsPerSecond: 10 } }
    });
    return true;
  }
  return false;
}
