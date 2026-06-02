import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { attachAuthSession } from "@/lib/auth-session";
import { ensureProfile, logEvent } from "@/lib/data";
import { attachPrototypeSession, getPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin, getSupabaseAuthClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !password) return jsonError(new Error("Email and password are required."), 400);

    const authClient = getSupabaseAuthClient();
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({ email, password });
    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("Supabase Auth did not return a user.");

    const session = getPrototypeSession(request);
    const supabase = getSupabaseAdmin();
    const profile = await ensureProfile(supabase, session.prototypeUserId, authData.user.id);
    await logEvent(supabase, profile, "auth_logged_in", { email });

    let response: NextResponse = NextResponse.json({ user: { id: authData.user.id, email, provider: "email" }, profile });
    response = attachPrototypeSession(response, session.prototypeUserId, session.isNew);
    return attachAuthSession(response, { userId: authData.user.id, email, provider: "email" });
  } catch (error) {
    return jsonError(error);
  }
}
