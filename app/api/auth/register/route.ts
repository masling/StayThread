import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { attachAuthSession } from "@/lib/auth-session";
import { ensureProfile, linkProfileToAuthUser, logEvent } from "@/lib/data";
import { attachPrototypeSession, getPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || password.length < 8) return jsonError(new Error("Email and an 8+ character password are required."), 400);

    const session = getPrototypeSession(request);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Supabase Auth did not return a user.");

    const profile = await ensureProfile(supabase, session.prototypeUserId);
    const linkedProfile = await linkProfileToAuthUser(supabase, profile, data.user.id);
    await logEvent(supabase, linkedProfile, "auth_registered", { email });

    let response: NextResponse = NextResponse.json({ user: { id: data.user.id, email, provider: "email" }, profile: linkedProfile }, { status: 201 });
    response = attachPrototypeSession(response, session.prototypeUserId, session.isNew);
    return attachAuthSession(response, { userId: data.user.id, email, provider: "email" });
  } catch (error) {
    return jsonError(error);
  }
}
