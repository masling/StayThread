import { NextRequest, NextResponse } from "next/server";
import { readAuthSession } from "@/lib/auth-session";

export async function GET(request: NextRequest) {
  const session = readAuthSession(request);
  return NextResponse.json({ user: session ? { id: session.userId, email: session.email, provider: session.provider ?? null } : null });
}
