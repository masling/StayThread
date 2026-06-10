import type { SupabaseClient } from "@supabase/supabase-js";
import { categoryTemplates, defaultTasks, seedGoals, tasksForGoal, type GoalLike } from "@/lib/staythread-domain";

export type ProfileRow = {
  id: string;
  auth_user_id: string | null;
  prototype_user_id: string;
  daily_available_minutes: number | null;
  preferred_time: string | null;
  goal_context: string | null;
  onboarding_completed: boolean;
  selected_module: string;
  ai_preferences: Record<string, unknown>;
};

const profileSelect =
  "id, auth_user_id, prototype_user_id, daily_available_minutes, preferred_time, goal_context, onboarding_completed, selected_module, ai_preferences";

export const defaultTrialMonths = 1;

export function isTrialMonths(value: unknown): value is 1 | 2 {
  return value === 1 || value === 2;
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function addMonths(dateString: string, months: 1 | 2) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function trialDaysRemaining(currentPeriodEnd?: string | null) {
  if (!currentPeriodEnd) return 0;
  const today = new Date(`${todayDateString()}T00:00:00.000Z`).getTime();
  const end = new Date(`${currentPeriodEnd}T00:00:00.000Z`).getTime();
  return Math.max(0, Math.ceil((end - today) / (1000 * 60 * 60 * 24)));
}

export async function ensureProfile(supabase: SupabaseClient, prototypeUserId: string, authUserId?: string | null): Promise<ProfileRow> {
  if (authUserId) {
    const { data: authProfile, error: authProfileError } = await supabase
      .from("user_profiles")
      .select(profileSelect)
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (authProfileError) throw new Error(authProfileError.message);
    if (authProfile) return authProfile as ProfileRow;
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        prototype_user_id: prototypeUserId,
        auth_user_id: authUserId ?? undefined,
        timezone: "America/Los_Angeles",
        daily_available_minutes: 35,
        preferred_time: "Afternoon",
        goal_context: "Solo international site owner doing keyword analysis and SEO backlink work",
      },
      { onConflict: "prototype_user_id", ignoreDuplicates: false },
    )
    .select(profileSelect)
    .single();

  if (error) throw new Error(error.message);
  return data as ProfileRow;
}

export async function linkProfileToAuthUser(supabase: SupabaseClient, profile: ProfileRow, authUserId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ auth_user_id: authUserId })
    .eq("id", profile.id)
    .select(profileSelect)
    .single();

  if (error) throw new Error(error.message);
  return data as ProfileRow;
}

export async function ensureTaskCategories(supabase: SupabaseClient) {
  const descriptionByCode: Record<string, string> = {
    seo: "Count-only SEO/Growth workflow for solo international site owners.",
    keyword_research: "Manual Semrush, Ahrefs, and Trends keyword analysis workload tracking.",
    backlink_work: "Manual backlink channel and normal-site prospect screening workload tracking.",
    content_pipeline: "Private content idea and brief pipeline tracking from keyword work.",
  };

  const { error } = await supabase.from("task_categories").upsert(
    categoryTemplates.map((category) => ({
      code: category.code,
      name: category.label,
      description: descriptionByCode[category.code] ?? `${category.label} workflow.`,
      required_fields: [],
      optional_fields: [],
      process_metrics: category.metric.split(", "),
      decomposition_rules: {
        standard: "Full count-only work block",
        easy: "Reduced count-only work block",
        minimum: "Keep-alive action",
      },
      risk_rules: { privacy_mode: "count_only", no_ai_targets: true },
      prompt_notes: "Do not ask for real keywords, backlink URLs, domains, or outreach recipients.",
      is_active: true,
    })),
    { onConflict: "code" },
  );

  if (error) throw new Error(error.message);
}

export async function updateProfile(
  supabase: SupabaseClient,
  profile: ProfileRow,
  updates: Partial<Pick<ProfileRow, "daily_available_minutes" | "preferred_time" | "goal_context" | "onboarding_completed" | "selected_module" | "ai_preferences">>,
) {
  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("id", profile.id)
    .select(profileSelect)
    .single();

  if (error) throw new Error(error.message);
  return data as ProfileRow;
}

export async function ensureSeedGoals(supabase: SupabaseClient, profile: ProfileRow) {
  await ensureTaskCategories(supabase);

  const { data: existing, error: existingError } = await supabase
    .from("goals")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: true });

  if (existingError) throw new Error(existingError.message);
  if (existing && existing.length > 0) return existing;

  const { data, error } = await supabase
    .from("goals")
    .insert(
      seedGoals.map((goal) => ({
        ...goal,
        profile_id: profile.id,
        auth_user_id: profile.auth_user_id,
        prototype_user_id: profile.prototype_user_id,
      })),
    )
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function ensureTodayTasks(supabase: SupabaseClient, profile: ProfileRow, goalId?: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing, error: existingError } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("task_date", today)
    .order("created_at", { ascending: true });

  if (existingError) throw new Error(existingError.message);
  if (existing && existing.length > 0) return existing;

  const { data, error } = await supabase
    .from("daily_tasks")
    .insert(
      defaultTasks(goalId).map((task) => ({
        ...task,
        profile_id: profile.id,
        auth_user_id: profile.auth_user_id,
        prototype_user_id: profile.prototype_user_id,
        task_date: today,
      })),
    )
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export function listTaskCategories() {
  return categoryTemplates;
}

export async function regenerateTodayTasks(supabase: SupabaseClient, profile: ProfileRow, goal?: GoalLike | null) {
  const today = new Date().toISOString().slice(0, 10);
  const { error: deleteError } = await supabase.from("daily_tasks").delete().eq("profile_id", profile.id).eq("task_date", today);
  if (deleteError) throw new Error(deleteError.message);

  const { data, error } = await supabase
    .from("daily_tasks")
    .insert(
      tasksForGoal(goal).map((task) => ({
        ...task,
        profile_id: profile.id,
        auth_user_id: profile.auth_user_id,
        prototype_user_id: profile.prototype_user_id,
        task_date: today,
      })),
    )
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function ensureSubscription(supabase: SupabaseClient, profile: ProfileRow, trialMonths: 1 | 2 = defaultTrialMonths) {
  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) {
    const normalizedTrialMonths = isTrialMonths(existing.trial_months) ? existing.trial_months : trialMonths;
    const trialStartedAt = existing.trial_started_at ?? existing.created_at?.slice(0, 10) ?? todayDateString();
    const currentPeriodEnd = existing.current_period_end ?? addMonths(trialStartedAt, normalizedTrialMonths);
    if (!existing.trial_started_at || !existing.current_period_end || !isTrialMonths(existing.trial_months) || existing.status === "checkout_pending") {
      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          trial_started_at: trialStartedAt,
          trial_months: normalizedTrialMonths,
          current_period_end: currentPeriodEnd,
          status: existing.status === "checkout_pending" ? "trialing" : existing.status,
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    return existing;
  }

  const trialStartedAt = todayDateString();
  const currentPeriodEnd = addMonths(trialStartedAt, trialMonths);

  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(
      {
      profile_id: profile.id,
      auth_user_id: profile.auth_user_id,
      prototype_user_id: profile.prototype_user_id,
      plan: "Starter",
      status: "trialing",
      trial_started_at: trialStartedAt,
      trial_months: trialMonths,
      current_period_end: currentPeriodEnd,
      feature_flags: { weekly_review: true, task_generation: true, count_only_seo_tracking: true },
      },
      { onConflict: "profile_id" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function logEvent(
  supabase: SupabaseClient,
  profile: ProfileRow,
  eventName: string,
  properties: Record<string, unknown> = {},
) {
  const { error } = await supabase.from("events").insert({
    profile_id: profile.id,
    auth_user_id: profile.auth_user_id,
    prototype_user_id: profile.prototype_user_id,
    event_name: eventName,
    properties,
  });
  if (error) throw new Error(error.message);
}

export function currentWeekRange() {
  const now = new Date();
  const day = now.getUTCDay() || 7;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return {
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: end.toISOString().slice(0, 10),
  };
}
