import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

// Cliente com service_role: IGNORA RLS (bypass total). Fica SOMENTE na VM.
export const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
