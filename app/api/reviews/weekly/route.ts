import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { currentWeekRange, ensureSeedGoals, logEvent } from "@/lib/data";
import { resolveRequestProfile } from "@/lib/request-context";
import { attachPrototypeSession } from "@/lib/session";
import { generateWeeklyReview, sanitizeSeoWorkEvidence, seoWorkMetricKeys } from "@/lib/staythread-domain";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { prototypeSession: session, profile } = await resolveRequestProfile(request, supabase);
    const { weekStart } = currentWeekRange();
    const { data, error } = await supabase
      .from("weekly_reviews")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const response = NextResponse.json({ weeklyReview: data });
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { locale?: string };
    const locale = body.locale === "zh" ? "zh" : "en";
    const supabase = getSupabaseAdmin();
    const { prototypeSession: session, profile } = await resolveRequestProfile(request, supabase);
    const goals = await ensureSeedGoals(supabase, profile);
    const { weekStart, weekEnd } = currentWeekRange();

    const { data: tasks, error: taskError } = await supabase
      .from("daily_tasks")
      .select("id,status")
      .eq("profile_id", profile.id)
      .gte("task_date", weekStart)
      .lte("task_date", weekEnd);
    if (taskError) throw new Error(taskError.message);

    const { data: reviews, error: reviewError } = await supabase
      .from("daily_reviews")
      .select("coach_feedback")
      .eq("profile_id", profile.id)
      .gte("review_date", weekStart)
      .lte("review_date", weekEnd)
      .order("review_date", { ascending: false })
      .limit(1);
    if (reviewError) throw new Error(reviewError.message);

    const { data: progressLogs, error: progressError } = await supabase
      .from("progress_logs")
      .select("value_data")
      .eq("profile_id", profile.id)
      .gte("log_date", weekStart)
      .lte("log_date", weekEnd);
    if (progressError) throw new Error(progressError.message);

    const seoWorkEvidence = Object.fromEntries(seoWorkMetricKeys.map((key) => [key, 0])) as Record<(typeof seoWorkMetricKeys)[number], number>;
    for (const log of progressLogs ?? []) {
      const valueData = sanitizeSeoWorkEvidence((log.value_data ?? {}) as Record<string, unknown>);
      for (const key of seoWorkMetricKeys) {
        seoWorkEvidence[key] += valueData[key];
      }
    }

    const generated = generateWeeklyReview({
      completedCount: (tasks ?? []).filter((task) => task.status === "completed").length,
      totalCount: tasks?.length ?? 0,
      activeGoals: goals.length,
      latestDailyFeedback: reviews?.[0]?.coach_feedback ?? null,
      seoWorkEvidence,
      locale,
    });

    const { data, error } = await supabase
      .from("weekly_reviews")
      .upsert(
        {
          profile_id: profile.id,
          auth_user_id: profile.auth_user_id,
          prototype_user_id: profile.prototype_user_id,
          week_start: weekStart,
          week_end: weekEnd,
          summary: generated.summary,
          asset_growth: generated.assetGrowth,
          bottlenecks: generated.bottlenecks,
          next_week_plan: generated.nextWeekPlan,
        },
        { onConflict: "profile_id,week_start" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("ai_generation_logs").insert({
      profile_id: profile.id,
      auth_user_id: profile.auth_user_id,
      prototype_user_id: profile.prototype_user_id,
      generation_type: "weekly_review",
      input_summary: `${tasks?.length ?? 0} tasks, ${goals.length} goals`,
      output_summary: generated.summary,
      guardrails: { no_clinical_claims: true, deterministic_summary: true },
    });
    await logEvent(supabase, profile, "weekly_review_generated", { weekStart, completionRate: generated.assetGrowth.completion_rate });

    const response = NextResponse.json({ weeklyReview: data });
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}
