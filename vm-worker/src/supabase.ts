import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

// Cliente com a chave secreta (sb_secret_ / service_role): IGNORA RLS (bypass total).
// Fica SOMENTE na VM.
export const supabase = createClient(config.supabaseUrl, config.secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
