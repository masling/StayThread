const baseUrl = (process.env.STAYTHREAD_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const cookieJar = new Map();

function updateCookies(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  const fallback = response.headers.get("set-cookie");
  const values = raw.length > 0 ? raw : fallback ? [fallback] : [];

  for (const value of values) {
    for (const part of value.split(/,(?=\s*[^;,=]+=[^;,]+)/)) {
      const [pair] = part.trim().split(";");
      const index = pair.indexOf("=");
      if (index > 0) cookieJar.set(pair.slice(0, index), pair.slice(index + 1));
    }
  }
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function request(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(cookieJar.size ? { Cookie: cookieHeader() } : {}),
    ...(options.headers ?? {}),
  };

  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  updateCookies(response);

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = typeof payload === "string" ? payload.slice(0, 300) : JSON.stringify(payload);
    throw new Error(`${options.method ?? "GET"} ${path} failed with ${response.status}: ${detail}`);
  }

  return payload;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSeoEvidenceIsSanitized(valueData) {
  const allowedKeys = new Set([
    "tools_opened",
    "competitor_sites_analyzed",
    "seed_terms_analyzed",
    "keywords_analyzed",
    "usable_keywords_found",
    "backlink_channels_screened",
    "normal_site_prospects_counted",
    "outreach_attempts_logged",
    "followups_logged",
    "privacy_mode",
  ]);

  for (const key of Object.keys(valueData)) {
    assert(allowedKeys.has(key), `Unexpected private or unrecognized value_data key persisted: ${key}`);
  }

  assert(valueData.privacy_mode === "count_only", "Expected privacy_mode to be count_only.");
  assert(valueData.keywords_analyzed === 12, "Expected numeric SEO evidence to persist.");
  assert(!("real_keyword" in valueData), "real_keyword should not persist.");
  assert(!("backlink_url" in valueData), "backlink_url should not persist.");
}

async function main() {
  console.log(`Running StayThread smoke E2E against ${baseUrl}`);

  const landing = await fetch(`${baseUrl}/`);
  assert(landing.ok, `Landing did not load: ${landing.status}`);
  const html = await landing.text();
  assert(html.includes("StayThread"), "Landing HTML should include StayThread.");

  const bootstrap = await request("/api/bootstrap");
  assert(Array.isArray(bootstrap.assessmentQuestions), "Bootstrap should return assessmentQuestions.");
  assert(bootstrap.assessmentQuestions.length === 30, "Expected 30 assessment questions.");
  assert(Array.isArray(bootstrap.goals) && bootstrap.goals.length > 0, "Bootstrap should return seed goals.");
  assert(Array.isArray(bootstrap.tasks) && bootstrap.tasks.length > 0, "Bootstrap should return today tasks.");

  const answers = bootstrap.assessmentQuestions.map((_, index) => (index % 5) + 1);
  const assessment = await request("/api/assessment/submit", {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
  assert(assessment.result?.stage, "Assessment should return a stage.");
  assert(assessment.result?.depth, "Assessment should return a depth.");
  assert(Array.isArray(assessment.tasks) && assessment.tasks.length > 0, "Assessment should return tasks.");

  const generated = await request("/api/tasks/generate", {
    method: "POST",
    body: JSON.stringify({ goalId: assessment.goals?.[0]?.id }),
  });
  assert(Array.isArray(generated.tasks) && generated.tasks.length > 0, "Task generation should return tasks.");

  const task = generated.tasks[0];
  assert(task.id, "Generated task should have an id.");
  const logged = await request("/api/tasks/log", {
    method: "POST",
    body: JSON.stringify({
      taskId: task.id,
      goalId: task.goal_id,
      level: "easy",
      notes: "E2E count-only SEO work evidence.",
      valueData: {
        tools_opened: 1,
        competitor_sites_analyzed: 2,
        seed_terms_analyzed: 2,
        keywords_analyzed: 12,
        usable_keywords_found: 3,
        backlink_channels_screened: 1,
        normal_site_prospects_counted: 1,
        outreach_attempts_logged: 0,
        followups_logged: 0,
        real_keyword: "private keyword should be removed",
        backlink_url: "https://private.example.com/should-not-persist",
      },
    }),
  });
  assert(logged.progressLog?.id, "Task logging should return a progress log.");
  assertSeoEvidenceIsSanitized(logged.progressLog.value_data);

  const dailyReview = await request("/api/reviews/daily", {
    method: "POST",
    body: JSON.stringify({
      movedForward: "Opened an SEO tool, reviewed keyword rows, and logged counts only.",
      interruption: "Stopped before outreach.",
      tomorrowMinimum: "Screen one backlink channel and log passable prospect count.",
    }),
  });
  assert(dailyReview.review?.coach_feedback, "Daily review should return coach feedback.");

  const weeklyReview = await request("/api/reviews/weekly", { method: "POST" });
  assert(weeklyReview.weeklyReview?.summary, "Weekly review should return summary.");
  assert(
    weeklyReview.weeklyReview?.asset_growth?.keywords_analyzed >= 12,
    "Weekly review should aggregate keyword evidence.",
  );

  console.log("StayThread smoke E2E passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
