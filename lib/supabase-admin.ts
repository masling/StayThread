import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;
let cachedAnonClient: SupabaseClient | null = null;

class DisabledRealtimeWebSocket {
  constructor() {
    throw new Error("Realtime is disabled for StayThread server-side Supabase clients.");
  }
}

const serverClientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: DisabledRealtimeWebSocket as never,
  },
};

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, serverClientOptions);

  return cachedClient;
}

export function getSupabaseAuthClient() {
  if (cachedAnonClient) return cachedAnonClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  cachedAnonClient = createClient(supabaseUrl, anonKey, serverClientOptions);

  return cachedAnonClient;
}
