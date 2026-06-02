import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { ensureProfile, logEvent } from "@/lib/data";
import { attachPrototypeSession, getExistingPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const progressTables = ["progress_logs", "daily_reviews", "weekly_reviews", "daily_tasks", "daily_states", "ai_generation_logs"] as const;

export async function DELETE(request: NextRequest) {
  try {
    const session = getExistingPrototypeSession(request);
    if (!session) return jsonError(new Error("No active StayThread session."), 401);
    const supabase = getSupabaseAdmin();
    const profile = await ensureProfile(supabase, session.prototypeUserId);

    for (const table of progressTables) {
      const { error } = await supabase.from(table).delete().eq("profile_id", profile.id);
      if (error) throw new Error(error.message);
    }

    const { error: goalError } = await supabase.from("goals").update({ progress: 0, process_assets: {} }).eq("profile_id", profile.id);
    if (goalError) throw new Error(goalError.message);
    await logEvent(supabase, profile, "progress_reset", { tables: progressTables.length });

    const response = NextResponse.json({ ok: true });
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}
