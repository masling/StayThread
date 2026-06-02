import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { logEvent } from "@/lib/data";
import { resolveRequestProfile } from "@/lib/request-context";
import { attachPrototypeSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { eventName?: string; properties?: Record<string, unknown> };
    if (!body.eventName) return jsonError(new Error("eventName is required."), 400);

    const supabase = getSupabaseAdmin();
    const { prototypeSession: session, profile } = await resolveRequestProfile(request, supabase);
    await logEvent(supabase, profile, body.eventName, body.properties);

    const response = NextResponse.json({ ok: true });
    return attachPrototypeSession(response, session.prototypeUserId, session.isNew);
  } catch (error) {
    return jsonError(error);
  }
}
