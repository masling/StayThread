"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { assessmentQuestions, dimensions, type AssessmentResult } from "@/lib/staythread-domain";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  category_code: string;
  progress: number;
  process_assets: Record<string, number>;
};

type DailyTask = {
  id: string;
  goal_id: string | null;
  title: string;
  meta: string;
  standard_task: string;
  easy_task: string;
  minimum_task: string;
  recommended_level: string;
  selected_level: string | null;
  status: string;
  reason: string | null;
};

type Profile = {
  id: string;
  auth_user_id: string | null;
  prototype_user_id: string;
  daily_available_minutes: number | null;
  preferred_time: string | null;
  goal_context: string | null;
  onboarding_completed: boolean;
  selected_module: string;
  ai_preferences: Record<string, unknown>;
};

type TaskCategory = {
  code: string;
  label: string;
  metric: string;
};

type Subscription = {
  id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  trial_started_at: string | null;
  trial_months: number;
  feature_flags: Record<string, unknown>;
};

type WeeklyReview = {
  id: string;
  summary: string;
  asset_growth: Record<string, number>;
  bottlenecks: string[];
  next_week_plan: string[];
  week_start: string;
  week_end: string;
};

type AuthUser = {
  id: string;
  email: string | null;
  provider?: string | null;
};

type BootstrapData = {
  user: AuthUser | null;
  profile: Profile;
  goals: Goal[];
  tasks: DailyTask[];
  taskCategories: TaskCategory[];
  subscription: Subscription;
  trialDaysRemaining?: number;
  weeklyReview: WeeklyReview | null;
  latestAssessment: null | {
    scores: Record<string, number>;
    stage_level: string;
    recommended_depth: string;
    primary_bottleneck: string;
    secondary_bottleneck: string | null;
    overall_score: number;
    summary: string | null;
  };
};

const routeIds = ["landing", "auth", "onboarding", "today", "assessment", "goals", "training", "review", "insights", "billing", "settings"] as const;
type RouteId = (typeof routeIds)[number];

const modules = [
  {
    name: "Reading",
    depth: "D1-D3",
    copy: "Rebuild tolerance for slow, low-stimulation attention.",
    standard: "Read 30 minutes with 3 notes.",
    easy: "Read 10 minutes.",
    minimum: "Read 2 pages.",
  },
  {
    name: "Movement",
    depth: "D1-D3",
    copy: "Support energy without turning movement into punishment.",
    standard: "Walk or train 30 minutes at comfortable effort.",
    easy: "Walk 15 minutes.",
    minimum: "Stand up and walk 5 minutes.",
  },
  {
    name: "Writing",
    depth: "D1-D4",
    copy: "Convert consumption and thinking into visible output.",
    standard: "Write 800 words or finish a section.",
    easy: "Write 200 words.",
    minimum: "Write 3 thoughts.",
  },
  {
    name: "Daily review",
    depth: "D1-D4",
    copy: "Train recovery by closing the day with a tiny feedback loop.",
    standard: "Answer all prompts and plan tomorrow.",
    easy: "Answer the 3 prompts.",
    minimum: "Choose tomorrow's minimum action.",
  },
];

const aiCapabilities = [
  {
    title: "Assessment intelligence",
    copy: "Scores seven action dimensions, detects the weakest constraint, and converts the result into a stage and training depth.",
    detail: "Deterministic scoring + AI explanation",
  },
  {
    title: "Adaptive task prescription",
    copy: "Generates standard, easy, and minimum tasks from category templates, constraints, and recent completion history.",
    detail: "Template-governed generation",
  },
  {
    title: "Recovery-aware coaching",
    copy: "Treats missed days as data. The system downgrades the next action instead of creating a shame loop.",
    detail: "Guardrailed feedback",
  },
];

const integrations = ["Supabase Auth", "PostgreSQL", "Google Search Console", "GitHub", "Notion / Docs", "Chrome extension"];

const planCards = [
  {
    name: "Starter",
    price: "$0",
    copy: "For testing the assessment and first 7-day thread.",
    features: ["Action profile", "One active goal", "Three-tier daily tasks"],
  },
  {
    name: "Builder",
    price: "$12",
    copy: "For individuals running multiple slow-feedback goals.",
    features: ["Unlimited goal templates", "AI weekly review", "Process asset dashboard"],
  },
  {
    name: "Team",
    price: "Custom",
    copy: "For coaches, schools, and creator teams that need structured continuity.",
    features: ["Shared templates", "Admin insight", "Privacy controls"],
  },
];

function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  }).then(async (response) => {
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Request failed");
    return payload as T;
  });
}

function routeFromHash(): RouteId {
  const hash = window.location.hash.replace("#", "");
  return routeIds.includes(hash as RouteId) ? (hash as RouteId) : "landing";
}

export default function Home() {
  const [route, setRoute] = useState<RouteId>("landing");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReview | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [answers, setAnswers] = useState<number[]>(Array(assessmentQuestions.length).fill(3));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [activeGoal, setActiveGoal] = useState(0);
  const [taskMode, setTaskMode] = useState<0 | 1 | 2>(1);
  const [toast, setToast] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState("Choose Generate review to create a short supportive summary.");

  const currentQuestion = assessmentQuestions[questionIndex];
  const selectedGoal = goals[activeGoal] ?? goals[0];
  const publicMode = route === "landing" || route === "auth" || route === "assessment";

  useEffect(() => {
    const syncRoute = () => setRoute(routeFromHash());
    syncRoute();
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("public-mode", publicMode);
  }, [publicMode]);

  useEffect(() => {
    apiFetch<BootstrapData>("/api/bootstrap")
      .then((data) => {
        setProfile(data.profile);
        setAuthUser(data.user);
        setGoals(data.goals ?? []);
        setTasks(data.tasks ?? []);
        setTaskCategories(data.taskCategories ?? []);
        setSubscription(data.subscription);
        setTrialDaysRemaining(data.trialDaysRemaining ?? 0);
        setWeeklyReview(data.weeklyReview);
        if (data.latestAssessment) {
          setAssessmentResult({
            scores: data.latestAssessment.scores as AssessmentResult["scores"],
            stage: data.latestAssessment.stage_level,
            depth: data.latestAssessment.recommended_depth,
            primaryBottleneck: data.latestAssessment.primary_bottleneck as AssessmentResult["primaryBottleneck"],
            secondaryBottleneck: (data.latestAssessment.secondary_bottleneck ?? "Recovery ability") as AssessmentResult["secondaryBottleneck"],
            overallScore: data.latestAssessment.overall_score,
            summary: data.latestAssessment.summary ?? "",
          });
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.includes("access_token") && !hash.includes("refresh_token")) return;
    getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) throw sessionError;
        const accessToken = data.session?.access_token;
        if (!accessToken) throw new Error("OAuth session did not include an access token.");
        return apiFetch<{ user: AuthUser; profile: Profile }>("/api/auth/session", {
          method: "POST",
          body: JSON.stringify({ accessToken }),
        });
      })
      .then((response) => {
        setAuthUser(response.user);
        setProfile(response.profile);
        setToast("OAuth sign-in complete.");
        window.history.replaceState(null, "", `${window.location.pathname}#onboarding`);
        setRoute(response.profile.onboarding_completed ? "today" : "onboarding");
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  function navigate(nextRoute: RouteId) {
    window.location.hash = nextRoute;
    setRoute(nextRoute);
  }

  async function submitAssessment() {
    setError("");
    try {
      const response = await apiFetch<{
        result: AssessmentResult;
        goals: Goal[];
        tasks: DailyTask[];
      }>("/api/assessment/submit", {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      setAssessmentResult(response.result);
      setGoals(response.goals);
      setTasks(response.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assessment submit failed");
    }
  }

  async function authenticate(event: FormEvent<HTMLFormElement>, mode: "login" | "register") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      const response = await apiFetch<{ user: AuthUser; profile: Profile }>(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      setAuthUser(response.user);
      setProfile(response.profile);
      setToast(mode === "register" ? "Account created and workspace saved." : "Signed in.");
      navigate(response.profile.onboarding_completed ? "today" : "onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    }
  }

  async function logout() {
    setError("");
    try {
      await apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
      setAuthUser(null);
      setToast("Signed out.");
      navigate("landing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out failed");
    }
  }

  async function authenticateWithProvider(provider: "google" | "github") {
    setError("");
    try {
      const origin = window.location.origin;
      const { error: oauthError } = await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/#auth`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : `${provider} sign-in failed`);
    }
  }

  async function logTask(task: DailyTask, level: "standard" | "easy" | "minimum", mode: 0 | 1 | 2) {
    setTaskMode(mode);
    setError("");
    try {
      await apiFetch("/api/tasks/log", {
        method: "POST",
        body: JSON.stringify({ taskId: task.id, goalId: task.goal_id, level }),
      });
      setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, selected_level: level, status: "completed" } : item)));
      setToast(`${level} task logged. The chain stays intact.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task log failed");
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      const response = await apiFetch<{ review: { coach_feedback: string } }>("/api/reviews/daily", {
        method: "POST",
        body: JSON.stringify({
          movedForward: form.get("movedForward"),
          interruption: form.get("interruption"),
          tomorrowMinimum: form.get("tomorrowMinimum"),
        }),
      });
      setReviewFeedback(response.review.coach_feedback);
      setToast("Daily review saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Daily review failed");
    }
  }

  async function saveProfile(updates: {
    dailyAvailableMinutes?: number;
    preferredTime?: string;
    goalContext?: string;
    selectedModule?: string;
    onboardingCompleted?: boolean;
    aiPreferences?: Record<string, unknown>;
  }) {
    setError("");
    try {
      const response = await apiFetch<{ profile: Profile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      setProfile(response.profile);
      setToast("Profile saved.");
      return response.profile;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile save failed");
      return null;
    }
  }

  async function createGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      const response = await apiFetch<{ goal: Goal }>("/api/goals", {
        method: "POST",
        body: JSON.stringify({
          title: String(form.get("title") ?? "").trim(),
          categoryCode: String(form.get("categoryCode") ?? "project"),
          description: String(form.get("description") ?? "").trim(),
        }),
      });
      setGoals((current) => [...current, response.goal]);
      setActiveGoal(goals.length);
      setToast("Goal created. Generate a task set when ready.");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Goal creation failed");
    }
  }

  async function generateTasks(goalId?: string | null) {
    setError("");
    try {
      const response = await apiFetch<{ tasks: DailyTask[] }>("/api/tasks/generate", {
        method: "POST",
        body: JSON.stringify({ goalId }),
      });
      setTasks(response.tasks);
      setToast("Today task prescription regenerated.");
      navigate("today");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task generation failed");
    }
  }

  async function generateWeeklyReview() {
    setError("");
    try {
      const response = await apiFetch<{ weeklyReview: WeeklyReview }>("/api/reviews/weekly", { method: "POST" });
      setWeeklyReview(response.weeklyReview);
      setToast("Weekly review generated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Weekly review failed");
    }
  }

  async function selectPlan(plan?: string, trialMonths?: 1 | 2) {
    setError("");
    try {
      const response = await apiFetch<{ subscription: Subscription; trialDaysRemaining: number }>("/api/billing", {
        method: "PATCH",
        body: JSON.stringify({ plan, trialMonths }),
      });
      setSubscription(response.subscription);
      if ("trialDaysRemaining" in response && typeof response.trialDaysRemaining === "number") setTrialDaysRemaining(response.trialDaysRemaining);
      setToast(`${response.subscription.plan} trial updated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan update failed");
    }
  }

  async function exportProfileData() {
    setError("");
    try {
      const response = await fetch("/api/data/export");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Data export failed");
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `staythread-export-${payload.profile?.id ?? "profile"}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setToast("Profile data exported.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data export failed");
    }
  }

  async function resetProgressData() {
    setError("");
    try {
      await apiFetch<{ ok: boolean }>("/api/data/progress", { method: "DELETE" });
      const data = await apiFetch<BootstrapData>("/api/bootstrap");
      setGoals(data.goals ?? []);
      setTasks(data.tasks ?? []);
      setWeeklyReview(data.weeklyReview);
      setReviewFeedback("Progress was reset. Start again with a minimum action.");
      setToast("Progress data reset.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Progress reset failed");
    }
  }

  async function deleteAccountData() {
    setError("");
    try {
      await apiFetch<{ ok: boolean }>("/api/account", { method: "DELETE" });
      setProfile(null);
      setGoals([]);
      setTasks([]);
      setWeeklyReview(null);
      setSubscription(null);
      setAssessmentResult(null);
      setToast("Account data deleted.");
      navigate("landing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account deletion failed");
    }
  }

  const assetRows = useMemo(() => {
    const first = goals[0]?.process_assets ?? {};
    return [
      [first.keywords ?? 12, "keywords mapped"],
      [first.briefs ?? 2, "briefs drafted"],
      [first.internal_links ?? 4, "internal links"],
      [tasks.filter((task) => task.status === "completed").length, "tasks logged"],
    ];
  }, [goals, tasks]);

  if (loading) return <main className="loading-screen">Loading StayThread...</main>;

  return (
    <div className="app-shell">
      {!publicMode ? (
        <aside className="sidebar" data-app-chrome>
          <button className="brand button-link" onClick={() => navigate("landing")} aria-label="StayThread home">
            <span className="brand-mark" />
            <span>StayThread</span>
          </button>
          <nav className="side-nav" aria-label="Primary">
            {[
              ["landing", "Public", "nav-dot-gray"],
              ["onboarding", "Onboarding", "nav-dot-warn"],
              ["today", "Today", ""],
              ["assessment", "Assessment", "nav-dot-warn"],
              ["goals", "Goals", "nav-dot-green"],
              ["training", "Training", "nav-dot-dark"],
              ["review", "Review", "nav-dot-blue"],
              ["insights", "Insights", "nav-dot-green"],
              ["billing", "Billing", "nav-dot-gray"],
              ["settings", "Settings", "nav-dot-gray"],
            ].map(([id, label, dot]) => (
              <button key={id} className={route === id ? "active" : ""} onClick={() => navigate(id as RouteId)}>
                <span className={`nav-dot ${dot}`} />
                {label}
              </button>
            ))}
          </nav>
          <section className="sidebar-card">
            <span className="label">Current thread</span>
            <strong>{assessmentResult?.stage ?? "L2 Starter"}</strong>
            <p>{assessmentResult?.depth ?? "D1 Recovery"} depth · {subscription?.plan ?? "Starter"}</p>
          </section>
        </aside>
      ) : null}

      <main className="main">
        {route === "landing" ? <Landing onNavigate={navigate} /> : null}
        {route === "auth" ? <Auth onNavigate={navigate} onAuthenticate={authenticate} onProviderAuth={authenticateWithProvider} /> : null}
        {route === "onboarding" ? <Onboarding profile={profile} taskCategories={taskCategories} onSave={saveProfile} onNavigate={navigate} /> : null}
        {route === "assessment" ? (
          <section className="view active" id="view-assessment" aria-labelledby="assessment-title">
            <div className="page-head">
              <div>
                <span className="label">Action profile</span>
                <h1 id="assessment-title">Find the bottleneck behind the stalled goal.</h1>
                <p>Answer 30 short prompts. StayThread turns scores into a stage, depth, and 7-day prescription.</p>
              </div>
              <span className="badge badge-blue">{questionIndex + 1} / {assessmentQuestions.length}</span>
            </div>
            <div className="progress"><span style={{ width: `${((questionIndex + 1) / assessmentQuestions.length) * 100}%` }} /></div>
            {assessmentResult && questionIndex === assessmentQuestions.length ? (
              <AssessmentResultView result={assessmentResult} onNavigate={navigate} onRetake={() => setQuestionIndex(0)} />
            ) : (
              <section className="panel assessment-card">
                <span className="badge badge-blue">{currentQuestion.dimension}</span>
                <h2 className="question-title">{currentQuestion.text}</h2>
                <p>1 means strongly disagree. 5 means strongly agree.</p>
                <div className="scale">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      className={answers[questionIndex] === value ? "active" : ""}
                      onClick={() => setAnswers((current) => current.map((answer, index) => (index === questionIndex ? value : answer)))}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="controls">
                  <button className="btn btn-secondary" disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}>Back</button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (questionIndex < assessmentQuestions.length - 1) setQuestionIndex((index) => index + 1);
                      else submitAssessment().then(() => setQuestionIndex(assessmentQuestions.length));
                    }}
                  >
                    {questionIndex === assessmentQuestions.length - 1 ? "Show result" : "Next"}
                  </button>
                </div>
              </section>
            )}
          </section>
        ) : null}
        {route === "today" ? (
          <Today
            tasks={tasks}
            assetRows={assetRows}
            taskMode={taskMode}
            setTaskMode={setTaskMode}
            onLogTask={logTask}
            onGenerateTasks={() => generateTasks(selectedGoal?.id)}
            onNavigate={navigate}
          />
        ) : null}
        {route === "goals" ? (
          <Goals
            goals={goals}
            taskCategories={taskCategories}
            activeGoal={activeGoal}
            setActiveGoal={setActiveGoal}
            selectedGoal={selectedGoal}
            onCreateGoal={createGoal}
            onGenerateTasks={generateTasks}
          />
        ) : null}
        {route === "training" ? <Training /> : null}
        {route === "review" ? <Review feedback={reviewFeedback} onSubmit={submitReview} /> : null}
        {route === "insights" ? <Insights weeklyReview={weeklyReview} onGenerate={generateWeeklyReview} /> : null}
        {route === "billing" ? <Billing subscription={subscription} trialDaysRemaining={trialDaysRemaining} onSelectPlan={selectPlan} /> : null}
        {route === "settings" ? (
          <Settings
            profile={profile}
            authUser={authUser}
            onSave={saveProfile}
            onLogout={logout}
            onExportData={exportProfileData}
            onResetProgress={resetProgressData}
            onDeleteAccount={deleteAccountData}
          />
        ) : null}
        {error ? <div className="setup-error">{error}</div> : null}
      </main>

      {toast ? <div className="toast active" role="status">{toast}</div> : null}
    </div>
  );
}

function Landing({ onNavigate }: { onNavigate: (route: RouteId) => void }) {
  return (
    <section className="view public-view active" id="view-landing" aria-labelledby="landing-title">
      <header className="public-nav">
        <button className="brand button-link" onClick={() => onNavigate("landing")} aria-label="StayThread home">
          <span className="brand-mark" />
          <span>StayThread</span>
        </button>
        <nav aria-label="Public">
          <button className="btn btn-secondary" onClick={() => onNavigate("assessment")}>Try assessment</button>
          <button className="btn btn-primary" onClick={() => onNavigate("auth")}>Sign in</button>
        </nav>
      </header>
      <section className="landing-hero">
        <div className="hero-copy">
          <span className="label">AI goal training for slow-feedback work</span>
          <h1 id="landing-title">Stop restarting. Build a system that keeps going.</h1>
          <p>StayThread diagnoses your execution pattern and gives you adaptive daily tasks: standard when you have energy, easy when life is busy, minimum when the only goal is not breaking the line.</p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => onNavigate("assessment")}>Get my action profile</button>
            <a className="btn btn-secondary" href="#product-loop">See how it works</a>
          </div>
        </div>
        <aside className="hero-preview panel">
          <div className="preview-top"><span className="label">Today</span><span className="badge badge-green">Line intact · 6 days</span></div>
          <div className="preview-list">
            <div className="preview-task"><div><strong>Reading base training</strong><span>10 minutes + 2 notes, adjusted for low energy.</span></div><em>Easy</em></div>
            <div className="preview-task"><div><strong>SEO goal block</strong><span>Cluster 5 search terms around &quot;focus recovery&quot;.</span></div><em>Standard</em></div>
            <div className="preview-task"><div><strong>Recovery rule</strong><span>If missed, restart with one 5-minute action tomorrow.</span></div><em>Protected</em></div>
          </div>
        </aside>
      </section>
      <LandingInfo onNavigate={onNavigate} />
    </section>
  );
}

function LandingInfo({ onNavigate }: { onNavigate: (route: RouteId) => void }) {
  return (
    <>
      <section className="saas-proof">
        {[
          ["30", "assessment prompts"],
          ["7", "action dimensions"],
          ["3", "task levels every day"],
          ["14d", "private beta loop"],
        ].map(([value, label]) => (
          <div className="proof-metric" key={label}><strong>{value}</strong><span>{label}</span></div>
        ))}
      </section>
      <section className="landing-section">
        <div className="landing-section-head">
          <div><span className="label">The real problem</span><h2>It is not only discipline. It is feedback design.</h2></div>
          <p>Long goals lose against short-form feeds because they pay off slowly. StayThread manufactures process feedback before the external result arrives.</p>
        </div>
        <div className="problem-grid">
          {[
            ["Slow feedback", "You doubt the direction too early.", "Process metrics make invisible progress visible: minutes read, keywords mapped, drafts shipped, workouts completed."],
            ["High stimulus", "Your attention gets bought cheaply.", "The assessment identifies temptation patterns and starts with low-stimulation training, not motivational slogans."],
            ["Start friction", "You know the task, but cannot begin.", "Every plan includes a minimum action so starting is measured in minutes, not perfect conditions."],
            ["Break collapse", "One missed day becomes the end.", "Recovery is designed into the system. A missed day triggers a lower tier, not shame."],
          ].map(([badge, title, copy]) => (
            <article className="problem-card" key={badge}><span className="badge">{badge}</span><h3>{title}</h3><p>{copy}</p></article>
          ))}
        </div>
      </section>
      <section className="landing-section">
        <div className="landing-section-head">
          <div><span className="label">AI SaaS engine</span><h2>Structured AI, not a motivational chatbot.</h2></div>
          <p>StayThread uses deterministic scoring and category templates first, then uses AI to explain, adapt, and summarize. That keeps the product testable and avoids vague advice.</p>
        </div>
        <div className="ai-grid">
          {aiCapabilities.map((capability) => (
            <article className="ai-card" key={capability.title}>
              <span className="badge badge-blue">{capability.detail}</span>
              <h3>{capability.title}</h3>
              <p>{capability.copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="landing-section" id="product-loop">
        <div className="landing-section-head">
          <div><span className="label">Product loop</span><h2>Assessment, prescription, practice, coaching, review.</h2></div>
          <p>StayThread is not a generic to-do list. It is a training loop for the ability underneath long-term execution.</p>
        </div>
        <div className="loop-grid">
          {["Assess", "Prescribe", "Train", "Coach", "Adjust"].map((title, index) => (
            <article className="loop-step" key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{["7 dimensions: clarity, start, continuity, resistance, recovery, energy, planning.", "Main training, support training, depth, and a realistic 7-day plan.", "Reading, movement, writing/logging, and daily review as base capacity.", "Goal templates for learning, writing, project work, movement, and SEO growth.", "Weekly AI review changes difficulty using completion, state, and process data."][index]}</p></article>
          ))}
        </div>
      </section>
      <section className="landing-section">
        <div className="landing-section-head">
          <div><span className="label">Trust architecture</span><h2>Built like a serious SaaS, even in MVP.</h2></div>
          <p>User-owned action data needs boring, reliable trust basics: scoped keys, RLS-ready tables, export/delete controls, and no clinical claims.</p>
        </div>
        <div className="trust-grid">
          <article><strong>RLS-ready Postgres</strong><span>Supabase tables include user ownership fields and Row Level Security for production auth.</span></article>
          <article><strong>Server-only secrets</strong><span>Service role access stays inside Next.js API routes, never in browser code.</span></article>
          <article><strong>Safety guardrails</strong><span>Movement and coaching copy avoids diagnosis, punishment, and unsafe intensity jumps.</span></article>
          <article><strong>Data controls</strong><span>Settings include export/delete surfaces for profile and progress data.</span></article>
        </div>
      </section>
      <section className="landing-section" id="who">
        <div className="landing-section-head">
          <div><span className="label">Who it helps</span><h2>For people with goals and unreliable execution.</h2></div>
          <p>Students, employees, and early freelancers share the same pattern: ambition is real, but the operating system is fragile.</p>
        </div>
        <div className="audience-grid">
          {[
            ["Students", "Turn studying into daily evidence.", "Reading and course plans become smaller actions with recovery rules for exams, language learning, and deep skill work."],
            ["Knowledge workers", "Protect personal goals after work.", "Use low-energy task tiers to keep writing, fitness, learning, and side projects alive during busy weeks."],
            ["Freelancers", "Ship when nobody is managing you.", "Project and SEO templates turn vague growth goals into keyword research, content, outreach, and publishing blocks."],
            ["Habit rebuilders", "Recover from broken plans faster.", "Minimum tasks and weekly review stop the common all-or-nothing loop after a missed day."],
          ].map(([badge, title, copy]) => (
            <article key={badge}><span className="badge">{badge}</span><h3>{title}</h3><p>{copy}</p></article>
          ))}
        </div>
      </section>
      <section className="landing-section">
        <div className="landing-section-head">
          <div><span className="label">Connected workflow</span><h2>Designed to become the action layer across your tools.</h2></div>
          <p>The MVP starts with manual logging. The product architecture leaves room for trustworthy integrations when users are ready to connect more data.</p>
        </div>
        <div className="integration-rail">
          {integrations.map((integration) => <span key={integration}>{integration}</span>)}
        </div>
      </section>
      <section className="landing-section">
        <div className="landing-section-head">
          <div><span className="label">Pricing direction</span><h2>Simple enough for beta, credible enough for SaaS.</h2></div>
          <p>Pricing is staged around value depth: assessment, individual continuity, and managed templates for teams or coaches.</p>
        </div>
        <div className="pricing-grid">
          {planCards.map((plan) => (
            <article className="pricing-card" key={plan.name}>
              <span className="badge">{plan.name}</span>
              <strong>{plan.price}</strong>
              <p>{plan.copy}</p>
              <ul>
                {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <section className="landing-cta panel">
        <div>
          <span className="label">Start here</span>
          <h2>Run the 5-minute diagnostic before you plan another goal.</h2>
          <p>Get a stage, two bottlenecks, one advantage, and a first 7-day training prescription.</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate("assessment")}>Start free assessment</button>
      </section>
      <footer className="landing-footer">
        <div>
          <button className="brand button-link" onClick={() => onNavigate("landing")} aria-label="StayThread home">
            <span className="brand-mark" />
            <span>StayThread</span>
          </button>
          <p>AI-assisted goal training for people who keep starting over. Diagnose the pattern, protect the line, and turn long goals into daily evidence.</p>
        </div>
        <div>
          <h3>Product</h3>
          <button type="button" onClick={() => onNavigate("assessment")}>Assessment</button>
          <button type="button" onClick={() => onNavigate("today")}>Today dashboard</button>
          <button type="button" onClick={() => onNavigate("goals")}>Goal coaching</button>
          <button type="button" onClick={() => onNavigate("settings")}>Data controls</button>
        </div>
        <div>
          <h3>Use cases</h3>
          <a href="#who">Students</a>
          <a href="#who">Knowledge workers</a>
          <a href="#who">Freelancers</a>
          <a href="#product-loop">Habit recovery</a>
        </div>
      </footer>
    </>
  );
}

function Auth({ onNavigate, onAuthenticate, onProviderAuth }: {
  onNavigate: (route: RouteId) => void;
  onAuthenticate: (event: FormEvent<HTMLFormElement>, mode: "login" | "register") => void;
  onProviderAuth: (provider: "google" | "github") => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("register");
  return (
    <section className="view public-view active" id="view-auth" aria-labelledby="auth-title">
      <header className="public-nav">
        <button className="brand button-link" onClick={() => onNavigate("landing")} aria-label="StayThread home">
          <span className="brand-mark" /><span>StayThread</span>
        </button>
        <nav aria-label="Auth"><button className="btn btn-secondary" onClick={() => onNavigate("landing")}>Back</button></nav>
      </header>
      <section className="auth-layout">
        <div><span className="label">Account</span><h1 id="auth-title">Save the assessment when the plan feels right.</h1><p>You can test the flow first. Then create a real Supabase Auth account so the workspace is tied to a user instead of only a prototype browser cookie.</p></div>
        <form className="panel auth-card" onSubmit={(event) => onAuthenticate(event, mode)}>
          <div className="auth-toggle" role="tablist" aria-label="Auth mode">
            <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>Create account</button>
            <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>Sign in</button>
          </div>
          <label>Email<input name="email" type="email" defaultValue="builder@example.com" autoComplete="email" /></label>
          <label>Password<input name="password" type="password" defaultValue="staythread-demo" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
          <button className="btn btn-primary" type="submit">{mode === "register" ? "Create account and save workspace" : "Sign in"}</button>
          <div className="oauth-grid">
            <button className="btn btn-secondary" type="button" onClick={() => onProviderAuth("google")}>Continue with Google</button>
            <button className="btn btn-secondary" type="button" onClick={() => onProviderAuth("github")}>Continue with GitHub</button>
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => onNavigate("assessment")}>Try assessment first</button>
        </form>
      </section>
    </section>
  );
}

function Onboarding({ profile, taskCategories, onSave, onNavigate }: {
  profile: Profile | null;
  taskCategories: TaskCategory[];
  onSave: (updates: {
    dailyAvailableMinutes?: number;
    preferredTime?: string;
    goalContext?: string;
    selectedModule?: string;
    onboardingCompleted?: boolean;
    aiPreferences?: Record<string, unknown>;
  }) => Promise<Profile | null>;
  onNavigate: (route: RouteId) => void;
}) {
  return (
    <section className="view active" id="view-onboarding" aria-labelledby="onboarding-title">
      <div className="page-head">
        <div>
          <span className="label">Setup</span>
          <h1 id="onboarding-title">Configure the operating system before adding pressure.</h1>
          <p>StayThread uses these inputs to size tasks and choose the first goal template. 特定字段保持 English，描述部分用中文也可以继续扩展。</p>
        </div>
        <span className="badge badge-blue">{profile?.onboarding_completed ? "Configured" : "New workspace"}</span>
      </div>
      <form
        className="panel settings-card onboarding-card"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const saved = await onSave({
            dailyAvailableMinutes: Number(form.get("dailyAvailableMinutes") ?? 35),
            preferredTime: String(form.get("preferredTime") ?? "Afternoon"),
            goalContext: String(form.get("goalContext") ?? ""),
            selectedModule: String(form.get("selectedModule") ?? "seo"),
            onboardingCompleted: true,
            aiPreferences: {
              tone: form.get("tone"),
              pressureMode: form.get("pressureMode"),
            },
          });
          if (saved) onNavigate("today");
        }}
      >
        <div className="settings-grid compact-grid">
          <label>Daily available minutes<input name="dailyAvailableMinutes" type="number" min="5" max="180" defaultValue={profile?.daily_available_minutes ?? 35} /></label>
          <label>Preferred time<select name="preferredTime" defaultValue={profile?.preferred_time ?? "Afternoon"}><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label>
          <label>First module<select name="selectedModule" defaultValue={profile?.selected_module ?? "seo"}>{taskCategories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}</select></label>
          <label>Coach tone<select name="tone" defaultValue={String(profile?.ai_preferences?.tone ?? "Calm")}><option>Calm</option><option>Direct</option><option>Analytical</option></select></label>
        </div>
        <label>Primary goal context<textarea name="goalContext" defaultValue={profile?.goal_context ?? "Independent builder working on SEO and product publishing"} /></label>
        <label>Pressure mode<select name="pressureMode" defaultValue={String(profile?.ai_preferences?.pressureMode ?? "Recovery-first")}><option>Recovery-first</option><option>Balanced</option><option>Growth</option></select></label>
        <div className="controls">
          <button className="btn btn-primary" type="submit">Save and enter Today</button>
          <button className="btn btn-secondary" type="button" onClick={() => onNavigate("assessment")}>Run assessment first</button>
        </div>
      </form>
    </section>
  );
}

function AssessmentResultView({ result, onNavigate, onRetake }: { result: AssessmentResult; onNavigate: (route: RouteId) => void; onRetake: () => void }) {
  return (
    <section className="panel result-card">
      <span className="label">Your result</span>
      <h2 className="question-title">{result.stage}</h2>
      <p>Your primary bottleneck is <strong>{result.primaryBottleneck}</strong>. Recommended starting depth is <strong>{result.depth}</strong>.</p>
      <div className="score-grid" style={{ margin: "24px 0" }}>
        {dimensions.map((dimension) => (
          <div className="score-row" key={dimension}>
            <strong>{dimension}</strong>
            <div className="progress"><span style={{ width: `${result.scores[dimension]}%` }} /></div>
            <span>{result.scores[dimension]}</span>
          </div>
        ))}
      </div>
      <div className="plan-grid">
        <article className="plan-card"><span className="badge badge-blue">Main focus</span><h3>{result.primaryBottleneck}</h3><p>Protect the weakest dimension before increasing task volume.</p></article>
        <article className="plan-card"><span className="badge badge-green">Support focus</span><h3>{result.secondaryBottleneck}</h3><p>Use this as the secondary lens for task sizing.</p></article>
        <article className="plan-card"><span className="badge">7-day plan</span><h3>No intensity jump</h3><p>Complete one valid action each day and review after day seven.</p></article>
      </div>
      <div className="controls">
        <button className="btn btn-primary" onClick={() => onNavigate("auth")}>Create account to save</button>
        <button className="btn btn-secondary" onClick={() => onNavigate("today")}>Preview Today page</button>
        <button className="btn btn-secondary" onClick={onRetake}>Retake</button>
      </div>
    </section>
  );
}

function Today({ tasks, assetRows, taskMode, setTaskMode, onLogTask, onGenerateTasks, onNavigate }: {
  tasks: DailyTask[];
  assetRows: Array<Array<string | number>>;
  taskMode: 0 | 1 | 2;
  setTaskMode: (mode: 0 | 1 | 2) => void;
  onLogTask: (task: DailyTask, level: "standard" | "easy" | "minimum", mode: 0 | 1 | 2) => void;
  onGenerateTasks: () => void;
  onNavigate: (route: RouteId) => void;
}) {
  const states: Array<[string, string, 0 | 1 | 2]> = [["Ready", "standard tasks", 0], ["Busy", "easy tasks", 1], ["Tired", "minimum line", 2], ["Recovering", "restart only", 2]];
  const levels: Array<["Standard" | "Easy" | "Minimum", "standard" | "easy" | "minimum", keyof DailyTask, 0 | 1 | 2]> = [
    ["Standard", "standard", "standard_task", 0],
    ["Easy", "easy", "easy_task", 1],
    ["Minimum", "minimum", "minimum_task", 2],
  ];

  return (
    <section className="view active" id="view-today" aria-labelledby="today-title">
      <div className="page-head">
        <div><span className="label">Today</span><h1 id="today-title">Keep the chain from breaking.</h1><p>The day is successful when one meaningful line stays intact.</p></div>
        <button className="btn btn-secondary" onClick={() => onNavigate("assessment")}>Retake assessment</button>
      </div>
      <div className="today-grid">
        <section className="panel ai-command">
          <div>
            <span className="label">AI command center</span>
            <h2>Today&apos;s plan was lowered because recovery is the active bottleneck.</h2>
            <p>StayThread is prioritizing continuity over volume. Finish any minimum task to keep the thread valid.</p>
          </div>
          <div className="ai-command-actions">
            <button className="btn btn-primary" onClick={onGenerateTasks}>Regenerate plan</button>
            <button className="btn btn-primary" onClick={() => onNavigate("review")}>Generate review</button>
            <button className="btn btn-secondary" onClick={() => onNavigate("goals")}>Inspect goal template</button>
          </div>
        </section>
        <section className="panel">
          <div className="section-head"><div><span className="label">Daily state</span><h2>How much depth can today hold?</h2></div><span className="badge">{["Standard", "Easy", "Minimum"][taskMode]} recommended</span></div>
          <div className="state-grid">
            {states.map(([name, detail, mode]) => <button key={name} className={`state-card ${taskMode === mode ? "active" : ""}`} onClick={() => setTaskMode(mode)}><strong>{name}</strong><span>{detail}</span></button>)}
          </div>
        </section>
        <section className="panel task-panel">
          <div className="section-head"><div><span className="label">Three-tier task set</span><h2>Choose the line that fits today.</h2></div><span className="badge badge-blue">Backend connected</span></div>
          <div className="task-stack">
            {tasks.map((task) => (
              <article className="task-card" key={task.id}>
                <header><div><h3>{task.title}</h3><p>{task.meta}</p></div><span className="badge">{task.status === "completed" ? "Logged" : "Open"}</span></header>
                <div className="tiers">
                  {levels.map(([label, level, field, mode]) => (
                    <button key={level} className={`tier ${taskMode === mode || task.selected_level === level ? "active" : ""}`} onClick={() => onLogTask(task, level, mode)}>
                      <strong>{label}</strong><span>{String(task[field])}</span>
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
        <aside className="right-rail">
          <section className="panel compact"><span className="label">Line status</span><div className="metric-row"><strong>6</strong><span>valid days this week</span></div><div className="week-line">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span className={`week-day ${index < 6 ? "done" : "today"}`} key={`${day}-${index}`}>{day}</span>)}</div></section>
          <section className="panel compact coach-panel"><span className="label">AI coach</span><h3>Protect continuity before volume.</h3><p>A minimum task counts as a protected day. Do not compensate tomorrow; return with a realistic next action.</p><div className="coach-signal"><span>Confidence</span><strong>High</strong></div><div className="coach-signal"><span>Next adjustment</span><strong>D1 → D2 after 5 valid days</strong></div></section>
          <section className="panel compact"><span className="label">Process assets</span><div className="asset-grid">{assetRows.map(([value, label]) => <div className="asset" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></section>
        </aside>
      </div>
    </section>
  );
}

function Goals({ goals, taskCategories, activeGoal, setActiveGoal, selectedGoal, onCreateGoal, onGenerateTasks }: {
  goals: Goal[];
  taskCategories: TaskCategory[];
  activeGoal: number;
  setActiveGoal: (index: number) => void;
  selectedGoal?: Goal;
  onCreateGoal: (event: FormEvent<HTMLFormElement>) => void;
  onGenerateTasks: (goalId?: string | null) => void;
}) {
  return (
    <section className="view active" id="view-goals" aria-labelledby="goals-title">
      <div className="page-head"><div><span className="label">Category companion</span><h1 id="goals-title">Long-term goals become process assets.</h1><p>Templates keep tasks professional and realistic instead of generic.</p></div><button className="btn btn-primary" onClick={() => onGenerateTasks(selectedGoal?.id)}>Generate Today tasks</button></div>
      <div className="goal-layout">
        <section className="goal-list">{goals.map((goal, index) => <button className={`goal-item ${index === activeGoal ? "active" : ""}`} key={goal.id} onClick={() => setActiveGoal(index)}><span className="badge">{goal.category_code}</span><h3 style={{ margin: "12px 0 8px" }}>{goal.title}</h3><p>{goal.description}</p><div className="progress" style={{ marginTop: 14 }}><span style={{ width: `${goal.progress}%` }} /></div></button>)}</section>
        <section className="panel goal-detail">{selectedGoal ? <><span className="badge badge-blue">{selectedGoal.category_code} template</span><h2>{selectedGoal.title}</h2><p>{selectedGoal.description}</p><div className="score-grid" style={{ marginTop: 18 }}>{Object.entries(selectedGoal.process_assets ?? {}).slice(0, 2).map(([label, value]) => <div className="asset" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><button className="btn btn-secondary" onClick={() => onGenerateTasks(selectedGoal.id)}>Use this template today</button></> : <p>No goals yet.</p>}</section>
        <form className="panel settings-card goal-create" onSubmit={onCreateGoal}>
          <span className="label">Create goal</span>
          <h2>Start with a category so AI has constraints.</h2>
          <label>Goal title<input name="title" required placeholder="Publish a search-led resource hub" /></label>
          <label>Category<select name="categoryCode" defaultValue="seo">{taskCategories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}</select></label>
          <label>Description<textarea name="description" placeholder="What is the slow-feedback outcome and why does it matter?" /></label>
          <button className="btn btn-primary" type="submit">Create goal</button>
        </form>
      </div>
    </section>
  );
}

function Training() {
  return <section className="view active" id="view-training"><div className="page-head"><div><span className="label">Foundational training</span><h1>Build the ability to stay with slow feedback.</h1><p>Reading, movement, writing, and daily review train the base capacity behind long-term action.</p></div></div><div className="module-grid">{modules.map((module) => <article className="module-card" key={module.name}><span className="badge badge-blue">{module.depth}</span><h2>{module.name}</h2><p>{module.copy}</p><div className="milestone-list"><div className="milestone"><strong>Standard</strong><span>{module.standard}</span></div><div className="milestone"><strong>Easy</strong><span>{module.easy}</span></div><div className="milestone"><strong>Minimum</strong><span>{module.minimum}</span></div></div></article>)}</div></section>;
}

function Review({ feedback, onSubmit }: { feedback: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <section className="view active" id="view-review"><div className="page-head"><div><span className="label">Daily review</span><h1>Close the day without overthinking it.</h1><p>Two minutes is enough. Capture what moved, what interrupted, and tomorrow&apos;s minimum action.</p></div></div><form className="panel review-form" onSubmit={onSubmit}><label>What moved forward today?<textarea name="movedForward" defaultValue="Read 10 minutes and mapped one keyword cluster." /></label><label>What interrupted or reduced progress?<textarea name="interruption" defaultValue="Energy dipped after lunch, so I chose the easy tier." /></label><label>What is tomorrow&apos;s minimum action?<textarea name="tomorrowMinimum" defaultValue="Open the keyword sheet and mark one next term." /></label><button className="btn btn-primary">Generate review</button></form><section className="panel compact review-output"><span className="label">Coach feedback</span><p>{feedback}</p></section></section>;
}

function Insights({ weeklyReview, onGenerate }: { weeklyReview: WeeklyReview | null; onGenerate: () => void }) {
  const assetGrowth = weeklyReview?.asset_growth ?? {};
  return (
    <section className="view active" id="view-insights">
      <div className="page-head">
        <div><span className="label">Weekly AI review</span><h1>Turn activity into the next operating decision.</h1><p>Weekly review summarizes process assets, bottlenecks, and the next plan from real task and review data.</p></div>
        <button className="btn btn-primary" onClick={onGenerate}>Generate weekly review</button>
      </div>
      <div className="insight-grid">
        <section className="panel insight-summary">
          <span className="badge badge-blue">{weeklyReview ? `${weeklyReview.week_start} to ${weeklyReview.week_end}` : "Not generated"}</span>
          <h2>{weeklyReview ? "Current week summary" : "Generate the first weekly review"}</h2>
          <p>{weeklyReview?.summary ?? "StayThread will read task completion, daily reviews, and active goals, then produce a constrained plan for next week."}</p>
        </section>
        <section className="panel compact">
          <span className="label">Asset growth</span>
          <div className="asset-grid">
            {Object.entries(assetGrowth).length ? Object.entries(assetGrowth).map(([label, value]) => <div className="asset" key={label}><strong>{value}</strong><span>{label.replaceAll("_", " ")}</span></div>) : <div className="asset"><strong>0</strong><span>review data</span></div>}
          </div>
        </section>
        <section className="panel settings-card">
          <h2>Bottlenecks</h2>
          {(weeklyReview?.bottlenecks ?? ["No weekly review yet."]).map((item) => <p key={item}>{item}</p>)}
        </section>
        <section className="panel settings-card">
          <h2>Next week plan</h2>
          {(weeklyReview?.next_week_plan ?? ["Generate a review after logging tasks."]).map((item) => <p key={item}>{item}</p>)}
        </section>
      </div>
    </section>
  );
}

function Billing({ subscription, trialDaysRemaining, onSelectPlan }: {
  subscription: Subscription | null;
  trialDaysRemaining: number;
  onSelectPlan: (plan?: string, trialMonths?: 1 | 2) => void;
}) {
  const trialMonths = subscription?.trial_months === 2 ? 2 : 1;
  return (
    <section className="view active" id="view-billing">
      <div className="page-head">
        <div><span className="label">Billing</span><h1>Start with a controlled trial.</h1><p>StayThread is in trial-first mode. Paid checkout can attach later to the same subscription record without changing this product surface.</p></div>
        <span className="badge badge-green">{subscription?.plan ?? "Starter"} · {trialDaysRemaining} days left</span>
      </div>
      <section className="panel trial-panel">
        <div>
          <span className="label">Trial control</span>
          <h2>{trialMonths} month trial</h2>
          <p>Trial ends on {subscription?.current_period_end ?? "not set"}. Status stays trialing while payment is not connected.</p>
        </div>
        <div className="trial-toggle" aria-label="Trial length">
          <button className={trialMonths === 1 ? "active" : ""} onClick={() => onSelectPlan(undefined, 1)}>1 month</button>
          <button className={trialMonths === 2 ? "active" : ""} onClick={() => onSelectPlan(undefined, 2)}>2 months</button>
        </div>
      </section>
      <div className="pricing-grid app-pricing">
        {planCards.map((plan) => (
          <article className={`pricing-card ${subscription?.plan === plan.name ? "active" : ""}`} key={plan.name}>
            <span className="badge">{plan.name}</span>
            <strong>{plan.price}</strong>
            <p>{plan.copy}</p>
            <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <button className="btn btn-primary" onClick={() => onSelectPlan(plan.name)}>{subscription?.plan === plan.name ? "Current trial plan" : "Use during trial"}</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Settings({ profile, authUser, onSave, onLogout, onExportData, onResetProgress, onDeleteAccount }: {
  profile: Profile | null;
  authUser: AuthUser | null;
  onSave: (updates: {
    dailyAvailableMinutes?: number;
    preferredTime?: string;
    goalContext?: string;
    onboardingCompleted?: boolean;
  }) => Promise<Profile | null>;
  onLogout: () => void;
  onExportData: () => void;
  onResetProgress: () => void;
  onDeleteAccount: () => void;
}) {
  return <section className="view active" id="view-settings"><div className="page-head"><div><span className="label">Trust and control</span><h1>Profile data stays editable.</h1><p>StayThread should collect only what affects the selected goal or training module.</p></div></div><div className="settings-grid"><form className="panel settings-card" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); onSave({ dailyAvailableMinutes: Number(form.get("dailyAvailableMinutes") ?? 35), preferredTime: String(form.get("preferredTime") ?? "Afternoon"), goalContext: String(form.get("goalContext") ?? ""), onboardingCompleted: true }); }}><h2>Profile</h2><label>Daily available minutes<input name="dailyAvailableMinutes" type="number" defaultValue={profile?.daily_available_minutes ?? 35} /></label><label>Preferred time<select name="preferredTime" defaultValue={profile?.preferred_time ?? "Afternoon"}><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label><label>Primary goal context<input name="goalContext" defaultValue={profile?.goal_context ?? "Independent builder working on SEO and product publishing"} /></label><button className="btn btn-primary" type="submit">Save profile</button></form><section className="panel settings-card"><h2>Account</h2><p>{authUser ? `Signed in as ${authUser.email ?? authUser.id} with ${authUser.provider ?? "email"}. Your workspace is linked to Supabase Auth.` : "You are using prototype preview mode. Create an account to bind this workspace to Supabase Auth."}</p>{authUser ? <button className="btn btn-secondary" onClick={onLogout}>Sign out</button> : null}</section><section className="panel settings-card"><h2>Privacy controls</h2><p>Export is a full JSON snapshot. Reset removes progress and reviews while keeping profile and goals. Delete account removes the prototype profile and cascaded data.</p><button className="btn btn-secondary" onClick={onExportData}>Export profile data</button><button className="btn btn-secondary" onClick={onResetProgress}>Reset progress data</button><button className="btn btn-danger" onClick={onDeleteAccount}>Delete account</button></section></div></section>;
}
