import { NextResponse } from "next/server";
import { clearAuthSession } from "@/lib/auth-session";

export async function POST() {
  return clearAuthSession(NextResponse.json({ ok: true }));
}
