import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { getEnv } from "./env.ts";

let singleton: ReturnType<typeof createClient> | null = null;

export function getServiceClient() {
  if (singleton) return singleton;
  const env = getEnv();
  singleton = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return singleton;
}
