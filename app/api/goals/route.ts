import { NextRequest, NextResponse } from "next/server";
import { ensureSeedGoals } from "@/lib/data";
import { resolveRequestProfile } from "@/lib/request-context";
import { attachPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { jsonError } from "@/app/api/_utils";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { prototypeSession: session, profile } = await resolveRequestProfile(request, supabase);
    const goals = await ensureSeedGoals(supabase, profile);
    const response = NextResponse.json({ goals });
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      title?: string;
      categoryCode?: string;
      description?: string;
    };
    if (!body.title || !body.categoryCode) return jsonError(new Error("title and categoryCode are required."), 400);

    const supabase = getSupabaseAdmin();
    const { prototypeSession: session, profile } = await resolveRequestProfile(request, supabase);

    const { data, error } = await supabase
      .from("goals")
      .insert({
        profile_id: profile.id,
        auth_user_id: profile.auth_user_id,
        prototype_user_id: profile.prototype_user_id,
        category_code: body.categoryCode,
        title: body.title,
        description: body.description ?? "",
        progress: 0,
        process_assets: {},
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const response = NextResponse.json({ goal: data }, { status: 201 });
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}
