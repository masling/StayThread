import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { readAuthSession } from "@/lib/auth-session";
import { ensureProfile } from "@/lib/data";
import { getPrototypeSession } from "@/lib/session";

export async function resolveRequestProfile(request: NextRequest, supabase: SupabaseClient) {
  const prototypeSession = getPrototypeSession(request);
  const authSession = readAuthSession(request);
  const profile = await ensureProfile(supabase, prototypeSession.prototypeUserId, authSession?.userId ?? null);
  return { prototypeSession, authSession, profile };
}
