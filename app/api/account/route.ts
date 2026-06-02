import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { clearAuthSession } from "@/lib/auth-session";
import { ensureProfile } from "@/lib/data";
import { clearPrototypeSession, getExistingPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(request: NextRequest) {
  try {
    const session = getExistingPrototypeSession(request);
    if (!session) return jsonError(new Error("No active StayThread session."), 401);
    const supabase = getSupabaseAdmin();
    const profile = await ensureProfile(supabase, session.prototypeUserId);
    const { error } = await supabase.from("user_profiles").delete().eq("id", profile.id);
    if (error) throw new Error(error.message);
    if (profile.auth_user_id) {
      const { error: authError } = await supabase.auth.admin.deleteUser(profile.auth_user_id);
      if (authError) throw new Error(authError.message);
    }

    const response = NextResponse.json({ ok: true });
    return clearAuthSession(clearPrototypeSession(response));
  } catch (error) {
    return jsonError(error);
  }
}
