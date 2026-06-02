import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { updateProfile } from "@/lib/data";
import { resolveRequestProfile } from "@/lib/request-context";
import { attachPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { prototypeSession: session, profile } = await resolveRequestProfile(request, supabase);
    const response = NextResponse.json({ profile });
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      dailyAvailableMinutes?: number;
      preferredTime?: string;
      goalContext?: string;
      onboardingCompleted?: boolean;
      selectedModule?: string;
      aiPreferences?: Record<string, unknown>;
    };
    const supabase = getSupabaseAdmin();
    const { prototypeSession: session, profile } = await resolveRequestProfile(request, supabase);
    const updated = await updateProfile(supabase, profile, {
      daily_available_minutes: body.dailyAvailableMinutes,
      preferred_time: body.preferredTime,
      goal_context: body.goalContext,
      onboarding_completed: body.onboardingCompleted,
      selected_module: body.selectedModule,
      ai_preferences: body.aiPreferences,
    });

    const response = NextResponse.json({ profile: updated });
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}
