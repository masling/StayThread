import { NextRequest, NextResponse } from "next/server";
import { currentWeekRange, ensureSeedGoals, ensureSubscription, ensureTodayTasks, listTaskCategories, trialDaysRemaining } from "@/lib/data";
import { resolveRequestProfile } from "@/lib/request-context";
import { attachPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { assessmentQuestions } from "@/lib/staythread-domain";
import { jsonError } from "@/app/api/_utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { prototypeSession: session, authSession, profile } = await resolveRequestProfile(request, supabase);
    const goals = await ensureSeedGoals(supabase, profile);
    const tasks = await ensureTodayTasks(supabase, profile, goals[0]?.id);
    const subscription = await ensureSubscription(supabase, profile);

    const { data: latestAssessment, error: assessmentError } = await supabase
      .from("assessment_results")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assessmentError) throw new Error(assessmentError.message);

    const { data: reviews, error: reviewsError } = await supabase
      .from("daily_reviews")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(7);
    if (reviewsError) throw new Error(reviewsError.message);

    const { weekStart } = currentWeekRange();
    const { data: weeklyReview, error: weeklyError } = await supabase
      .from("weekly_reviews")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (weeklyError) throw new Error(weeklyError.message);

    const response = NextResponse.json({
      profile,
      user: authSession ? { id: authSession.userId, email: authSession.email, provider: authSession.provider ?? null } : null,
      goals,
      tasks,
      subscription,
      trialDaysRemaining: trialDaysRemaining(subscription.current_period_end),
      taskCategories: listTaskCategories(),
      latestAssessment,
      weeklyReview,
      reviews: reviews ?? [],
      assessmentQuestions,
    });

    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}
