import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { attachAuthSession } from "@/lib/auth-session";
import { ensureProfile, logEvent } from "@/lib/data";
import { attachPrototypeSession, getPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin, getSupabaseAuthClient } from "@/lib/supabase-admin";

function authProvider(user: { app_metadata?: Record<string, unknown>; identities?: Array<{ provider?: string }> }) {
  const metadataProvider = user.app_metadata?.provider;
  if (typeof metadataProvider === "string") return metadataProvider;
  return user.identities?.[0]?.provider ?? "email";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { accessToken?: string };
    if (!body.accessToken) return jsonError(new Error("accessToken is required."), 400);

    const authClient = getSupabaseAuthClient();
    const { data, error } = await authClient.auth.getUser(body.accessToken);
    if (error || !data.user) return jsonError(new Error(error?.message ?? "Invalid Supabase access token."), 401);

    const session = getPrototypeSession(request);
    const supabase = getSupabaseAdmin();
    const profile = await ensureProfile(supabase, session.prototypeUserId, data.user.id);
    const provider = authProvider(data.user);
    const email = data.user.email ?? null;
    await logEvent(supabase, profile, "oauth_session_bound", { provider, email });

    let response: NextResponse = NextResponse.json({ user: { id: data.user.id, email, provider }, profile });
    response = attachPrototypeSession(response, session.prototypeUserId, session.isNew);
    return attachAuthSession(response, { userId: data.user.id, email, provider });
  } catch (error) {
    return jsonError(error);
  }
}
