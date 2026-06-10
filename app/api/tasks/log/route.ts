import { NextRequest, NextResponse } from "next/server";
import { resolveRequestProfile } from "@/lib/request-context";
import { attachPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeSeoWorkEvidence } from "@/lib/staythread-domain";
import { jsonError } from "@/app/api/_utils";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      taskId?: string;
      goalId?: string | null;
      level?: string;
      notes?: string;
      valueData?: Record<string, unknown>;
    };
    if (!body.taskId || !body.level) return jsonError(new Error("taskId and level are required."), 400);
    if (!["standard", "easy", "minimum"].includes(body.level)) {
      return jsonError(new Error("level must be standard, easy, or minimum."), 400);
    }

    const supabase = getSupabaseAdmin();
    const { prototypeSession: session, profile } = await resolveRequestProfile(request, supabase);
    const valueData = sanitizeSeoWorkEvidence(body.valueData);

    const { error: updateError } = await supabase
      .from("daily_tasks")
      .update({ selected_level: body.level, status: "completed" })
      .eq("id", body.taskId)
      .eq("profile_id", profile.id);
    if (updateError) throw new Error(updateError.message);

    const { data, error } = await supabase
      .from("progress_logs")
      .insert({
        profile_id: profile.id,
        auth_user_id: profile.auth_user_id,
        prototype_user_id: profile.prototype_user_id,
        goal_id: body.goalId ?? null,
        task_id: body.taskId,
        task_level: body.level,
        completion_status: "completed",
        value_data: valueData,
        notes: body.notes ?? "",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const response = NextResponse.json({ progressLog: data });
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}
