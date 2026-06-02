import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { ensureSeedGoals, logEvent, regenerateTodayTasks } from "@/lib/data";
import { resolveRequestProfile } from "@/lib/request-context";
import { attachPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { goalId?: string };
    const supabase = getSupabaseAdmin();
    const { prototypeSession: session, profile } = await resolveRequestProfile(request, supabase);
    const goals = await ensureSeedGoals(supabase, profile);
    const selectedGoal = goals.find((goal) => goal.id === body.goalId) ?? goals[0] ?? null;
    const tasks = await regenerateTodayTasks(supabase, profile, selectedGoal);

    await supabase.from("ai_generation_logs").insert({
      profile_id: profile.id,
      auth_user_id: profile.auth_user_id,
      prototype_user_id: profile.prototype_user_id,
      generation_type: "daily_task_prescription",
      input_summary: selectedGoal ? `${selectedGoal.category_code}: ${selectedGoal.title}` : "base training",
      output_summary: tasks.map((task) => task.title).join(", "),
      guardrails: { deterministic_templates: true, recovery_tiers: true },
    });
    await logEvent(supabase, profile, "daily_tasks_generated", { goalId: selectedGoal?.id ?? null, count: tasks.length });

    const response = NextResponse.json({ tasks });
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}
