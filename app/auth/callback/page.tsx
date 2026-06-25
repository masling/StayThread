"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthProfile = {
  onboarding_completed: boolean;
};

async function completeOAuthBinding() {
  const supabase = getSupabaseBrowserClient();
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("OAuth session did not include an access token.");

  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });
  const payload = (await response.json()) as { profile?: AuthProfile; error?: string };
  if (!response.ok || !payload.profile) throw new Error(payload.error ?? "OAuth session binding failed.");

  const nextRoute = payload.profile.onboarding_completed ? "today" : "onboarding";
  window.location.replace(`/#${nextRoute}`);
}

export default function AuthCallback() {
  const [error, setError] = useState("");

  useEffect(() => {
    completeOAuthBinding().catch((err: Error) => setError(err.message));
  }, []);

  return (
    <main className="loading-screen">
      {error ? (
        <span>OAuth sign-in failed: {error}</span>
      ) : (
        <span>Completing sign-in...</span>
      )}
    </main>
  );
}
