import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { ensureProfile, logEvent } from "@/lib/data";
import { attachPrototypeSession, getExistingPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const exportTables = [
  "assessment_results",
  "goals",
  "daily_states",
  "daily_tasks",
  "progress_logs",
  "daily_reviews",
  "weekly_reviews",
  "subscriptions",
  "events",
  "ai_generation_logs",
] as const;

export async function GET(request: NextRequest) {
  try {
    const session = getExistingPrototypeSession(request);
    if (!session) return jsonError(new Error("No active StayThread session."), 401);
    const supabase = getSupabaseAdmin();
    const profile = await ensureProfile(supabase, session.prototypeUserId);
    const payload: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      profile,
    };

    for (const table of exportTables) {
      const { data, error } = await supabase.from(table).select("*").eq("profile_id", profile.id);
      if (error) throw new Error(error.message);
      payload[table] = data ?? [];
    }

    await logEvent(supabase, profile, "data_exported", { tables: exportTables.length });
    const response = NextResponse.json(payload);
    response.headers.set("Content-Disposition", `attachment; filename=\"staythread-export-${profile.id}.json\"`);
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}
