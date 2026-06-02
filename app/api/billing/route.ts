import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { addMonths, ensureSubscription, isTrialMonths, logEvent, trialDaysRemaining } from "@/lib/data";
import { resolveRequestProfile } from "@/lib/request-context";
import { attachPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const allowedPlans = new Set(["Starter", "Builder", "Team"]);

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { prototypeSession: session, profile } = await resolveRequestProfile(request, supabase);
    const subscription = await ensureSubscription(supabase, profile);
    const response = NextResponse.json({ subscription, trialDaysRemaining: trialDaysRemaining(subscription.current_period_end) });
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { plan?: string; trialMonths?: number };
    if (body.plan && !allowedPlans.has(body.plan)) return jsonError(new Error("A valid plan is required."), 400);
    if (body.trialMonths !== undefined && !isTrialMonths(body.trialMonths)) return jsonError(new Error("trialMonths must be 1 or 2."), 400);
    if (!body.plan && body.trialMonths === undefined) return jsonError(new Error("plan or trialMonths is required."), 400);

    const supabase = getSupabaseAdmin();
    const { prototypeSession: session, profile } = await resolveRequestProfile(request, supabase);
    const existing = await ensureSubscription(supabase, profile);
    const trialMonths = body.trialMonths ?? existing.trial_months ?? 1;
    if (!isTrialMonths(trialMonths)) return jsonError(new Error("Existing trialMonths must be 1 or 2."), 400);
    const trialStartedAt = existing.trial_started_at ?? new Date().toISOString().slice(0, 10);
    const currentPeriodEnd = addMonths(trialStartedAt, trialMonths);
    const { data, error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          profile_id: profile.id,
          auth_user_id: profile.auth_user_id,
          prototype_user_id: profile.prototype_user_id,
          plan: body.plan ?? existing.plan ?? "Starter",
          status: "trialing",
          trial_started_at: trialStartedAt,
          trial_months: trialMonths,
          current_period_end: currentPeriodEnd,
          feature_flags: { weekly_review: true, task_generation: true, team_templates: (body.plan ?? existing.plan) === "Team" },
        },
        { onConflict: "profile_id" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await logEvent(supabase, profile, "subscription_updated", { plan: data.plan, trialMonths: data.trial_months });
    const response = NextResponse.json({ subscription: data, trialDaysRemaining: trialDaysRemaining(data.current_period_end) });
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}
