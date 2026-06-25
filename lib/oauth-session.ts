import { NextRequest, NextResponse } from "next/server";
import { attachAuthSession } from "@/lib/auth-session";
import { ensureProfile, logEvent } from "@/lib/data";
import { attachPrototypeSession, getPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin, getSupabaseAuthClient } from "@/lib/supabase-admin";

type OAuthUser = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string }>;
};

export class OAuthSessionError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "OAuthSessionError";
    this.status = status;
  }
}

function authProvider(user: OAuthUser) {
  const metadataProvider = user.app_metadata?.provider;
  if (typeof metadataProvider === "string") return metadataProvider;
  return user.identities?.[0]?.provider ?? "oauth";
}

export async function bindOAuthSession(request: NextRequest, accessToken: string, init?: ResponseInit) {
  const authClient = getSupabaseAuthClient();
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error || !data.user) throw new OAuthSessionError(error?.message ?? "Invalid Supabase access token.", 401);

  const user = data.user as OAuthUser;
  const session = getPrototypeSession(request);
  const supabase = getSupabaseAdmin();
  const profile = await ensureProfile(supabase, session.prototypeUserId, user.id);
  const provider = authProvider(user);
  const email = user.email ?? null;
  await logEvent(supabase, profile, "oauth_session_bound", { provider, email });

  let response: NextResponse = NextResponse.json({ user: { id: user.id, email, provider }, profile }, init);
  response = attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  return attachAuthSession(response, { userId: user.id, email, provider });
}
