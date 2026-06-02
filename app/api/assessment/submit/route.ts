import { NextRequest, NextResponse } from "next/server";
import { ensureSeedGoals, ensureTodayTasks } from "@/lib/data";
import { resolveRequestProfile } from "@/lib/request-context";
import { attachPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { scoreAssessment } from "@/lib/staythread-domain";
import { jsonError } from "@/app/api/_utils";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { answers?: number[] };
    const answers = body.answers;
    if (!Array.isArray(answers)) return jsonError(new Error("answers must be an array."), 400);

    const result = scoreAssessment(answers);
    const supabase = getSupabaseAdmin();
    const { prototypeSession: session, profile } = await resolveRequestProfile(request, supabase);

    const { data: assessment, error } = await supabase
      .from("assessment_results")
      .insert({
        profile_id: profile.id,
        auth_user_id: profile.auth_user_id,
        prototype_user_id: profile.prototype_user_id,
        scores: result.scores,
        stage_level: result.stage,
        recommended_depth: result.depth,
        primary_bottleneck: result.primaryBottleneck,
        secondary_bottleneck: result.secondaryBottleneck,
        overall_score: result.overallScore,
        summary: result.summary,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const goals = await ensureSeedGoals(supabase, profile);
    const tasks = await ensureTodayTasks(supabase, profile, goals[0]?.id);

    const response = NextResponse.json({ result, assessment, goals, tasks });
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("Expected") ? 400 : 500);
  }
}
