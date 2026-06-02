import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "staythread_auth";

export type AuthSession = {
  userId: string;
  email: string | null;
  provider?: string | null;
};

function secret() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function readAuthSession(request: NextRequest): AuthSession | null {
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (!cookie) return null;
  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthSession & { iat?: number };
  if (!parsed.userId) return null;
  return { userId: parsed.userId, email: parsed.email ?? null, provider: parsed.provider ?? null };
}

export function attachAuthSession(response: NextResponse, session: AuthSession) {
  const payload = Buffer.from(JSON.stringify({ ...session, iat: Date.now() }), "utf8").toString("base64url");
  response.cookies.set(AUTH_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export function clearAuthSession(response: NextResponse) {
  response.cookies.delete(AUTH_COOKIE);
  return response;
}
