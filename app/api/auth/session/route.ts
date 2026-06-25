import { NextRequest } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { bindOAuthSession, OAuthSessionError } from "@/lib/oauth-session";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { accessToken?: string };
    if (!body.accessToken) return jsonError(new Error("accessToken is required."), 400);
    return bindOAuthSession(request, body.accessToken);
  } catch (error) {
    return jsonError(error, error instanceof OAuthSessionError ? error.status : 500);
  }
}
