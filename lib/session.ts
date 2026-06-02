import { randomUUID } from "crypto";
import type { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "staythread_uid";

export function getPrototypeSession(request: NextRequest) {
  const existing = request.cookies.get(COOKIE_NAME)?.value;
  return {
    prototypeUserId: existing ?? randomUUID(),
    isNew: !existing,
  };
}

export function getExistingPrototypeSession(request: NextRequest) {
  const existing = request.cookies.get(COOKIE_NAME)?.value;
  return existing ? { prototypeUserId: existing, isNew: false } : null;
}

export function attachPrototypeSession(response: NextResponse, prototypeUserId: string, isNew: boolean) {
  if (!isNew) return response;
  response.cookies.set(COOKIE_NAME, prototypeUserId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export function clearPrototypeSession(response: NextResponse) {
  response.cookies.delete(COOKIE_NAME);
  return response;
}
