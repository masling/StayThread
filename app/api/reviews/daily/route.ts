import { NextRequest, NextResponse } from "next/server";
import { resolveRequestProfile } from "@/lib/request-context";
import { attachPrototypeSession } from "@/lib/session";
import { generateReviewFeedback } from "@/lib/staythread-domain";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { jsonError } from "@/app/api/_utils";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      movedForward?: string;
      interruption?: string;
      tomorrowMinimum?: string;
    };
    const movedForward = body.movedForward?.trim() || "One SEO work count moved forward.";
    const interruption = body.interruption?.trim() || "No major interruption recorded.";
    const tomorrowMinimum = body.tomorrowMinimum?.trim() || "Choose one keep-alive SEO action.";
    const coachFeedback = generateReviewFeedback({ movedForward, interruption, tomorrowMinimum });

    const supabase = getSupabaseAdmin();
    const { prototypeSession: session, profile } = await resolveRequestProfile(request, supabase);
    const reviewDate = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("daily_reviews")
      .upsert(
        {
          profile_id: profile.id,
          auth_user_id: profile.auth_user_id,
          prototype_user_id: profile.prototype_user_id,
          review_date: reviewDate,
          moved_forward: movedForward,
          interruption,
          tomorrow_minimum: tomorrowMinimum,
          coach_feedback: coachFeedback,
        },
        { onConflict: "profile_id,review_date" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const response = NextResponse.json({ review: data });
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}
