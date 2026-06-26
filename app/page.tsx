"use client";

import { createContext, FormEvent, useContext, useEffect, useMemo, useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { assessmentQuestions, dimensions, type AssessmentResult, type SeoWorkEvidence } from "@/lib/staythread-domain";
import { formatLabel, locales, tr, type Locale } from "@/lib/i18n";
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

type SeoWorkInput = SeoWorkEvidence;

function emptySeoWorkInput(): SeoWorkInput {
  return {
    tools_opened: 0,
    competitor_sites_analyzed: 0,
    seed_terms_analyzed: 0,
    keywords_analyzed: 0,
    usable_keywords_found: 0,
    backlink_channels_screened: 0,
    normal_site_prospects_counted: 0,
    outreach_attempts_logged: 0,
    followups_logged: 0,
    privacy_mode: "count_only",
  };
}

type AuthUser = {
  id: string;
  email: string | null;
  provider?: string | null;
};

type OAuthProviderId = "google" | "github";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (text: string | null | undefined) => string;
  label: (text: string | null | undefined) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nContext");
  return value;
}

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "zh";
}

const oauthProviderOptions: Array<{
  id: OAuthProviderId;
  label: string;
  hint: string;
}> = [
  { id: "google", label: "Continue with Google", hint: "Fastest on Chrome" },
  { id: "github", label: "Continue with GitHub", hint: "Developer account" },
];

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
    name: "Keyword analysis",
    depth: "D1-D3",
    copy: "Use Semrush, Ahrefs, or Trends without asking StayThread to store the actual terms.",
    standard: "Analyze 3 competitor sites, 3 seed terms, and at least 30 keyword rows.",
    easy: "Analyze 1 competitor site or 1 seed term.",
    minimum: "Open one keyword tool and review one seed term.",
  },
  {
    name: "Backlink screening",
    depth: "D1-D3",
    copy: "Check whether backlink opportunities have normal content, a passable application path, and low spam risk.",
    standard: "Screen 10 sites or channels and count passable prospects.",
    easy: "Screen 3 sites or one channel.",
    minimum: "Screen one site for application path and spam risk.",
  },
  {
    name: "Content pipeline",
    depth: "D1-D4",
    copy: "Move usable keyword counts into private page ideas and brief placeholders.",
    standard: "Create 3 page ideas and 1 brief in your private workspace.",
    easy: "Create 1 page idea from keyword analysis.",
    minimum: "Write one page idea ID or placeholder.",
  },
  {
    name: "Daily review",
    depth: "D1-D4",
    copy: "Close the day with workload counts, blocker, and the next keep-alive action.",
    standard: "Summarize tools opened, rows analyzed, usable count, and channels screened.",
    easy: "Answer the 3 review prompts with counts only.",
    minimum: "Choose tomorrow's smallest SEO action.",
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
    copy: "Generates standard, easy, and keep-alive actions from deterministic templates, constraints, and recent completion history.",
    detail: "Template-governed generation",
  },
  {
    title: "Recovery-aware coaching",
    copy: "Treats missed days as data. The system downgrades the next action instead of creating a shame loop.",
    detail: "Guardrailed feedback",
  },
];

const integrations = ["Supabase Auth", "PostgreSQL", "Assessment engine", "Task templates", "Weekly reviews", "Export/delete controls"];

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
    copy: "For individuals who need a daily operating rhythm for one serious goal.",
    features: ["Action evidence dashboard", "AI weekly review", "Recovery-aware tasks"],
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

function appEntryRoute(profile: Profile | null): RouteId {
  return profile?.onboarding_completed ? "today" : "onboarding";
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
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
  const [seoWorkInput, setSeoWorkInput] = useState<SeoWorkInput>(emptySeoWorkInput);
  const [toast, setToast] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState("Choose Generate review to create a short supportive summary.");

  const currentQuestion = assessmentQuestions[questionIndex];
  const selectedGoal = goals[activeGoal] ?? goals[0];
  const publicMode = route === "landing" || route === "auth" || route === "assessment";
  const t = (text: string | null | undefined) => tr(locale, text);
  const label = (text: string | null | undefined) => formatLabel(locale, text);
  const i18n = useMemo<I18nContextValue>(() => ({ locale, setLocale, t, label }), [locale]);

  useEffect(() => {
    const syncRoute = () => setRoute(routeFromHash());
    syncRoute();
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    const requestedLocale = new URLSearchParams(window.location.search).get("lang");
    const savedLocale = window.localStorage.getItem("staythread_locale");
    if (isLocale(requestedLocale)) setLocale(requestedLocale);
    else if (isLocale(savedLocale)) setLocale(savedLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    window.localStorage.setItem("staythread_locale", locale);
  }, [locale]);

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
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!loading && route === "auth" && authUser) navigate(appEntryRoute(profile));
  }, [authUser, loading, profile, route]);

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

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      const response = await apiFetch<{ user: AuthUser; profile: Profile }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      setAuthUser(response.user);
      setProfile(response.profile);
      setToast("Signed in.");
      navigate(appEntryRoute(response.profile));
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

  function isChromeBrowser() {
    const ua = navigator.userAgent;
    return /Chrome|CriOS/.test(ua) && !/Edg|OPR|Opera/.test(ua);
  }

  function oauthProvider(provider: OAuthProviderId): Provider {
    return provider;
  }

  async function authenticateWithProvider(provider: OAuthProviderId) {
    setError("");
    try {
      const origin = window.location.origin;
      const scopesByProvider: Partial<Record<OAuthProviderId, string>> = {
        github: "read:user user:email",
      };
      const { error: oauthError } = await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider: oauthProvider(provider),
        options: {
          redirectTo: `${origin}/auth/callback`,
          scopes: scopesByProvider[provider],
          queryParams:
            provider === "google"
              ? {
                  prompt: isChromeBrowser() ? "select_account" : "consent",
                  access_type: "offline",
                }
              : undefined,
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
        body: JSON.stringify({
          taskId: task.id,
          goalId: task.goal_id,
          level,
          valueData: seoWorkInput,
          notes: "Count-only SEO work evidence. Real keywords and backlink URLs stay private.",
        }),
      });
      setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, selected_level: level, status: "completed" } : item)));
      setSeoWorkInput(emptySeoWorkInput());
      setToast(`${level === "minimum" ? "keep-alive" : level} task logged with count-only SEO evidence.`);
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
          locale,
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
      const response = await apiFetch<{ weeklyReview: WeeklyReview }>("/api/reviews/weekly", {
        method: "POST",
        body: JSON.stringify({ locale }),
      });
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
      setReviewFeedback("Progress was reset. Start again with a keep-alive SEO action.");
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
      [first.tools_opened ?? 5, "tools opened"],
      [first.keywords_analyzed ?? 240, "keywords analyzed"],
      [first.usable_keywords_found ?? 18, "usable keywords found"],
      [first.backlink_channels_screened ?? 6, "backlink channels screened"],
      [tasks.filter((task) => task.status === "completed").length, "tasks logged"],
    ];
  }, [goals, tasks]);

  if (loading) return <main className="loading-screen">{t("Loading StayThread...")}</main>;

  return (
    <I18nContext.Provider value={i18n}>
    <div className="app-shell">
      {!publicMode ? (
        <aside className="sidebar" data-app-chrome>
          <button className="brand button-link" onClick={() => navigate("landing")} aria-label="StayThread home">
            <span className="brand-mark" />
            <span>StayThread</span>
          </button>
          <LanguageSwitch />
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
                {t(label)}
              </button>
            ))}
          </nav>
          <section className="sidebar-card">
            <span className="label">{t("Current thread")}</span>
            <strong>{t(assessmentResult?.stage ?? "L2 Starter")}</strong>
            <p>{t(assessmentResult?.depth ?? "D1 Recovery")} {t("depth")} · {t(subscription?.plan ?? "Starter")}</p>
          </section>
        </aside>
      ) : null}

      <main className="main">
        {route === "landing" ? <Landing onNavigate={navigate} authUser={authUser} profile={profile} /> : null}
        {route === "auth" ? <Auth onNavigate={navigate} onAuthenticate={authenticate} onProviderAuth={authenticateWithProvider} /> : null}
        {route === "onboarding" ? <Onboarding profile={profile} taskCategories={taskCategories} onSave={saveProfile} onNavigate={navigate} /> : null}
        {route === "assessment" ? (
          <section className="view active" id="view-assessment" aria-labelledby="assessment-title">
            <div className="page-head">
              <div>
                <span className="label">{t("Action profile")}</span>
                <h1 id="assessment-title">{t("Find the bottleneck behind the stalled goal.")}</h1>
                <p>{t("Answer 30 short prompts. StayThread turns scores into a stage, depth, and 7-day prescription.")}</p>
              </div>
              <span className="badge badge-blue">{questionIndex + 1} / {assessmentQuestions.length}</span>
            </div>
            <div className="progress"><span style={{ width: `${((questionIndex + 1) / assessmentQuestions.length) * 100}%` }} /></div>
            {assessmentResult && questionIndex === assessmentQuestions.length ? (
              <AssessmentResultView result={assessmentResult} authUser={authUser} profile={profile} onNavigate={navigate} onRetake={() => setQuestionIndex(0)} />
            ) : (
              <section className="panel assessment-card">
                <span className="badge badge-blue">{t(currentQuestion.dimension)}</span>
                <h2 className="question-title">{t(currentQuestion.text)}</h2>
                <p>{t("1 means strongly disagree. 5 means strongly agree.")}</p>
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
                  <button className="btn btn-secondary" disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}>{t("Back")}</button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (questionIndex < assessmentQuestions.length - 1) setQuestionIndex((index) => index + 1);
                      else submitAssessment().then(() => setQuestionIndex(assessmentQuestions.length));
                    }}
                  >
                    {questionIndex === assessmentQuestions.length - 1 ? t("Show result") : t("Next")}
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
            seoWorkInput={seoWorkInput}
            setSeoWorkInput={setSeoWorkInput}
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
        {error ? <div className="setup-error">{t(error)}</div> : null}
      </main>

      {toast ? <div className="toast active" role="status">{t(toast)}</div> : null}
    </div>
    </I18nContext.Provider>
  );
}

function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="language-switch" aria-label={t("Language")}>
      {locales.map((item) => (
        <button key={item.code} className={locale === item.code ? "active" : ""} type="button" onClick={() => setLocale(item.code)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

function Landing({ onNavigate, authUser, profile }: { onNavigate: (route: RouteId) => void; authUser: AuthUser | null; profile: Profile | null }) {
  const { t } = useI18n();
  const signedInRoute = appEntryRoute(profile);
  return (
    <section className="view public-view active" id="view-landing" aria-labelledby="landing-title">
      <header className="public-nav">
        <button className="brand button-link" onClick={() => onNavigate("landing")} aria-label="StayThread home">
          <span className="brand-mark" />
          <span>StayThread</span>
        </button>
        <LanguageSwitch />
        <nav aria-label="Public">
          <button className="btn btn-secondary" onClick={() => onNavigate("assessment")}>{t("Try assessment")}</button>
          <button className="btn btn-primary" onClick={() => onNavigate(authUser ? signedInRoute : "auth")}>{authUser ? t("Open app") : t("Sign in")}</button>
        </nav>
      </header>
      <section className="landing-hero">
        <div className="hero-copy">
          <span className="label">{t("AI-assisted goal training")}</span>
          <h1 id="landing-title">{t("Stay with long-term goals when feedback is slow.")}</h1>
          <p>{t("StayThread diagnoses your execution pattern and gives you daily actions: standard when you have energy, easy when life is busy, keep-alive when the only goal is not breaking the line.")}</p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => onNavigate("assessment")}>{t("Get my action profile")}</button>
            <a className="btn btn-secondary" href="#product-loop">{t("See how it works")}</a>
          </div>
        </div>
        <aside className="hero-preview panel">
          <div className="preview-top"><span className="label">{t("Today")}</span><span className="badge badge-green">{t("Line intact · 6 days")}</span></div>
          <div className="preview-list">
            <div className="preview-task"><div><strong>{t("Focused block")}</strong><span>{t("Do one clear action and record visible process evidence.")}</span></div><em>{t("Standard")}</em></div>
            <div className="preview-task"><div><strong>{t("Low-friction version")}</strong><span>{t("Reduce scope without breaking the daily line.")}</span></div><em>{t("Easy")}</em></div>
            <div className="preview-task"><div><strong>{t("Recovery rule")}</strong><span>{t("If missed, do the smallest valid action and return tomorrow.")}</span></div><em>{t("Keep-alive")}</em></div>
          </div>
        </aside>
      </section>
      <LandingInfo onNavigate={onNavigate} />
    </section>
  );
}

function LandingInfo({ onNavigate }: { onNavigate: (route: RouteId) => void }) {
  const { t } = useI18n();
  return (
    <>
      <section className="saas-proof">
        {[
          ["30", "assessment prompts"],
          ["7", "action dimensions"],
          ["3", "task levels every day"],
          ["14d", "private beta loop"],
        ].map(([value, label]) => (
          <div className="proof-metric" key={label}><strong>{value}</strong><span>{t(label)}</span></div>
        ))}
      </section>
      <section className="landing-section">
        <div className="landing-section-head">
          <div><span className="label">{t("The real problem")}</span><h2>{t("It is not only discipline. It is feedback design.")}</h2></div>
          <p>{t("Long goals lose against short-form feeds because they pay off slowly. StayThread manufactures process feedback before the external result arrives.")}</p>
        </div>
        <div className="problem-grid">
          {[
            ["Slow feedback", "You doubt the direction too early.", "Process evidence makes invisible progress visible before external results arrive."],
            ["High stimulus", "Your attention gets bought cheaply.", "The assessment identifies temptation patterns and starts with low-stimulation training, not motivational slogans."],
            ["Start friction", "You know the task, but cannot begin.", "Every plan includes a keep-alive action so starting is measured in minutes, not perfect conditions."],
            ["Break collapse", "One missed day becomes the end.", "Recovery is designed into the system. A missed day triggers a lower tier, not shame."],
          ].map(([badge, title, copy]) => (
            <article className="problem-card" key={badge}><span className="badge">{t(badge)}</span><h3>{t(title)}</h3><p>{t(copy)}</p></article>
          ))}
        </div>
      </section>
      <section className="landing-section">
        <div className="landing-section-head">
          <div><span className="label">{t("AI SaaS engine")}</span><h2>{t("Structured AI, not a motivational chatbot.")}</h2></div>
          <p>{t("StayThread uses deterministic scoring and structured templates first, then uses AI to explain, encourage, and summarize. The coach stays bounded by the chosen workflow.")}</p>
        </div>
        <div className="ai-grid">
          {aiCapabilities.map((capability) => (
            <article className="ai-card" key={capability.title}>
              <span className="badge badge-blue">{t(capability.detail)}</span>
              <h3>{t(capability.title)}</h3>
              <p>{t(capability.copy)}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="landing-section" id="product-loop">
        <div className="landing-section-head">
          <div><span className="label">{t("Product loop")}</span><h2>{t("Assessment, prescription, practice, coaching, review.")}</h2></div>
          <p>{t("StayThread is not a generic to-do list. It is a training loop for the ability underneath long-term execution.")}</p>
        </div>
        <div className="loop-grid">
          {["Assess", "Prescribe", "Train", "Coach", "Adjust"].map((title, index) => (
            <article className="loop-step" key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{t(title)}</h3><p>{t(["7 dimensions: clarity, start, continuity, resistance, recovery, energy, planning.", "Stage, bottleneck, depth, and a realistic 7-day plan.", "Standard, easy, and keep-alive actions turn intent into daily practice.", "Daily logging keeps progress visible without turning the product into a generic to-do list.", "Weekly AI review changes difficulty using completion, state, and work evidence."][index])}</p></article>
          ))}
        </div>
      </section>
      <section className="landing-section">
        <div className="landing-section-head">
          <div><span className="label">{t("Trust architecture")}</span><h2>{t("Built like a serious SaaS, even in MVP.")}</h2></div>
          <p>{t("User-owned action data needs boring, reliable trust basics: scoped keys, RLS-ready tables, export/delete controls, and clear AI boundaries.")}</p>
        </div>
        <div className="trust-grid">
          <article><strong>{t("RLS-ready Postgres")}</strong><span>{t("Supabase tables include user ownership fields and Row Level Security for production auth.")}</span></article>
          <article><strong>{t("Server-only secrets")}</strong><span>{t("Service role access stays inside Next.js API routes, never in browser code.")}</span></article>
          <article><strong>{t("Safety guardrails")}</strong><span>{t("Coaching copy avoids diagnosis, punishment, and unsafe intensity jumps.")}</span></article>
          <article><strong>{t("Data controls")}</strong><span>{t("Settings include export/delete surfaces for profile and progress data.")}</span></article>
        </div>
      </section>
      <section className="landing-section" id="who">
        <div className="landing-section-head">
          <div><span className="label">{t("Current beta focus")}</span><h2>{t("Starting with solo international site owners.")}</h2></div>
          <p>{t("The product category stays broader than SEO. The current beta focuses on one slow-feedback workflow where daily execution is easy to lose: keyword analysis and backlink work.")}</p>
        </div>
        <div className="audience-grid">
          {[
            ["New site owners", "Start with keyword discovery.", "Open Semrush, Ahrefs, or Trends and log how many sites, seed terms, and keyword rows you actually analyzed."],
            ["Low-content sites", "Move from ideas to content evidence.", "Track usable keyword count and page ideas without storing the actual private keyword list."],
            ["Low-traffic sites", "Add backlink work steadily.", "Screen channels and normal sites while avoiding spammy outbound-link farms."],
            ["Solo SaaS sites", "Keep SEO moving without a team.", "Use keep-alive work when product, support, and SEO all compete for the same day."],
          ].map(([badge, title, copy]) => (
            <article key={badge}><span className="badge">{t(badge)}</span><h3>{t(title)}</h3><p>{t(copy)}</p></article>
          ))}
        </div>
      </section>
      <section className="landing-section">
        <div className="landing-section-head">
          <div><span className="label">{t("Connected workflow")}</span><h2>{t("Designed to become the action layer across your tools.")}</h2></div>
          <p>{t("The MVP starts with manual logging and privacy-first process evidence. In the current site-owner beta, users keep real keywords and backlink URLs in their own tools while StayThread tracks work counts.")}</p>
        </div>
        <div className="integration-rail">
          {integrations.map((integration) => <span key={integration}>{t(integration)}</span>)}
        </div>
      </section>
      <section className="landing-section">
        <div className="landing-section-head">
          <div><span className="label">{t("Pricing direction")}</span><h2>{t("Simple enough for beta, credible enough for SaaS.")}</h2></div>
          <p>{t("Pricing is staged around value depth: assessment, individual continuity, and managed templates for teams or coaches.")}</p>
        </div>
        <div className="pricing-grid">
          {planCards.map((plan) => (
            <article className="pricing-card" key={plan.name}>
              <span className="badge">{t(plan.name)}</span>
              <strong>{t(plan.price)}</strong>
              <p>{t(plan.copy)}</p>
              <ul>
                {plan.features.map((feature) => <li key={feature}>{t(feature)}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <section className="landing-cta panel">
        <div>
          <span className="label">{t("Start here")}</span>
          <h2>{t("Run the 5-minute diagnostic before you plan another goal.")}</h2>
          <p>{t("Get a stage, two bottlenecks, one advantage, and a first 7-day training prescription.")}</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate("assessment")}>{t("Start free assessment")}</button>
      </section>
      <footer className="landing-footer">
        <div>
          <button className="brand button-link" onClick={() => onNavigate("landing")} aria-label="StayThread home">
            <span className="brand-mark" />
            <span>StayThread</span>
          </button>
          <p>{t("AI-assisted goal training for people who keep starting over. Diagnose the pattern, protect the line, and turn long goals into daily evidence.")}</p>
        </div>
        <div>
          <h3>{t("Product")}</h3>
          <button type="button" onClick={() => onNavigate("assessment")}>{t("Assessment")}</button>
          <button type="button" onClick={() => onNavigate("today")}>{t("Today dashboard")}</button>
          <button type="button" onClick={() => onNavigate("goals")}>{t("Goal coaching")}</button>
          <button type="button" onClick={() => onNavigate("settings")}>{t("Data controls")}</button>
        </div>
        <div>
          <h3>{t("Current beta")}</h3>
          <a href="#who">{t("New site owners")}</a>
          <a href="#who">{t("Low-content sites")}</a>
          <a href="#who">{t("Low-traffic sites")}</a>
          <a href="#who">{t("Solo SaaS sites")}</a>
        </div>
      </footer>
    </>
  );
}

function Auth({ onNavigate, onAuthenticate, onProviderAuth }: {
  onNavigate: (route: RouteId) => void;
  onAuthenticate: (event: FormEvent<HTMLFormElement>) => void;
  onProviderAuth: (provider: OAuthProviderId) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="view public-view active" id="view-auth" aria-labelledby="auth-title">
      <header className="public-nav">
        <button className="brand button-link" onClick={() => onNavigate("landing")} aria-label="StayThread home">
          <span className="brand-mark" /><span>StayThread</span>
        </button>
        <LanguageSwitch />
        <nav aria-label="Auth"><button className="btn btn-secondary" onClick={() => onNavigate("landing")}>{t("Back")}</button></nav>
      </header>
      <section className="auth-layout">
        <div><span className="label">{t("Account")}</span><h1 id="auth-title">{t("Sign in to continue your workspace.")}</h1><p>{t("Google and GitHub create or restore the account in one step. Email is available for existing password-based accounts.")}</p></div>
        <form className="panel auth-card" onSubmit={onAuthenticate}>
          <div className="oauth-grid">
            {oauthProviderOptions.map((provider) => (
              <button className="btn btn-secondary oauth-button" type="button" onClick={() => onProviderAuth(provider.id)} key={provider.id}>
                <span>{t(provider.label)}</span>
                <small>{t(provider.hint)}</small>
              </button>
            ))}
          </div>
          <div className="auth-divider"><span>{t("Email account")}</span></div>
          <label>{t("Email")}<input name="email" type="email" defaultValue="builder@example.com" autoComplete="email" /></label>
          <label>{t("Password")}<input name="password" type="password" defaultValue="staythread-demo" autoComplete="current-password" /></label>
          <button className="btn btn-primary" type="submit">{t("Sign in")}</button>
          <button className="btn btn-secondary" type="button" onClick={() => onNavigate("assessment")}>{t("Try assessment first")}</button>
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
  const { t } = useI18n();
  return (
    <section className="view active" id="view-onboarding" aria-labelledby="onboarding-title">
      <div className="page-head">
        <div>
          <span className="label">{t("Setup")}</span>
          <h1 id="onboarding-title">{t("Configure the operating system before adding pressure.")}</h1>
          <p>{t("StayThread uses these inputs to size SEO tasks and choose the first count-only workflow. Real keywords and backlink URLs can stay in your private tools.")}</p>
        </div>
        <span className="badge badge-blue">{profile?.onboarding_completed ? t("Configured") : t("New workspace")}</span>
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
          <label>{t("Daily available minutes")}<input name="dailyAvailableMinutes" type="number" min="5" max="180" defaultValue={profile?.daily_available_minutes ?? 35} /></label>
          <label>{t("Preferred time")}<select name="preferredTime" defaultValue={profile?.preferred_time ?? "Afternoon"}><option value="Morning">{t("Morning")}</option><option value="Afternoon">{t("Afternoon")}</option><option value="Evening">{t("Evening")}</option></select></label>
          <label>{t("First module")}<select name="selectedModule" defaultValue={profile?.selected_module ?? "seo"}>{taskCategories.map((category) => <option key={category.code} value={category.code}>{t(category.label)}</option>)}</select></label>
          <label>{t("Coach tone")}<select name="tone" defaultValue={String(profile?.ai_preferences?.tone ?? "Calm")}><option value="Calm">{t("Calm")}</option><option value="Direct">{t("Direct")}</option><option value="Analytical">{t("Analytical")}</option></select></label>
        </div>
        <label>{t("Primary goal context")}<textarea name="goalContext" defaultValue={profile?.goal_context ?? t("Solo international site owner doing keyword analysis and SEO backlink work")} /></label>
        <label>{t("Pressure mode")}<select name="pressureMode" defaultValue={String(profile?.ai_preferences?.pressureMode ?? "Recovery-first")}><option value="Recovery-first">{t("Recovery-first")}</option><option value="Balanced">{t("Balanced")}</option><option value="Growth">{t("Growth")}</option></select></label>
        <div className="controls">
          <button className="btn btn-primary" type="submit">{t("Save and enter Today")}</button>
          <button className="btn btn-secondary" type="button" onClick={() => onNavigate("assessment")}>{t("Run assessment first")}</button>
        </div>
      </form>
    </section>
  );
}

function AssessmentResultView({ result, authUser, profile, onNavigate, onRetake }: { result: AssessmentResult; authUser: AuthUser | null; profile: Profile | null; onNavigate: (route: RouteId) => void; onRetake: () => void }) {
  const { t } = useI18n();
  const signedInRoute = appEntryRoute(profile);
  return (
    <section className="panel result-card">
      <span className="label">{t("Your result")}</span>
      <h2 className="question-title">{t(result.stage)}</h2>
      <p>{t("Your primary bottleneck is")} <strong>{t(result.primaryBottleneck)}</strong>. {t("Recommended starting depth is")} <strong>{t(result.depth)}</strong>.</p>
      <div className="score-grid" style={{ margin: "24px 0" }}>
        {dimensions.map((dimension) => (
          <div className="score-row" key={dimension}>
            <strong>{t(dimension)}</strong>
            <div className="progress"><span style={{ width: `${result.scores[dimension]}%` }} /></div>
            <span>{result.scores[dimension]}</span>
          </div>
        ))}
      </div>
      <div className="plan-grid">
        <article className="plan-card"><span className="badge badge-blue">{t("Main focus")}</span><h3>{t(result.primaryBottleneck)}</h3><p>{t("Protect the weakest dimension before increasing task volume.")}</p></article>
        <article className="plan-card"><span className="badge badge-green">{t("Support focus")}</span><h3>{t(result.secondaryBottleneck)}</h3><p>{t("Use this as the secondary lens for task sizing.")}</p></article>
        <article className="plan-card"><span className="badge">{t("7-day plan")}</span><h3>{t("No intensity jump")}</h3><p>{t("Complete one valid action each day and review after day seven.")}</p></article>
      </div>
      <div className="controls">
        <button className="btn btn-primary" onClick={() => onNavigate(authUser ? signedInRoute : "auth")}>{authUser ? t("Open app") : t("Sign in to save")}</button>
        <button className="btn btn-secondary" onClick={() => onNavigate("today")}>{t("Preview Today page")}</button>
        <button className="btn btn-secondary" onClick={onRetake}>{t("Retake")}</button>
      </div>
    </section>
  );
}

function Today({ tasks, assetRows, seoWorkInput, setSeoWorkInput, taskMode, setTaskMode, onLogTask, onGenerateTasks, onNavigate }: {
  tasks: DailyTask[];
  assetRows: Array<Array<string | number>>;
  seoWorkInput: SeoWorkInput;
  setSeoWorkInput: (input: SeoWorkInput) => void;
  taskMode: 0 | 1 | 2;
  setTaskMode: (mode: 0 | 1 | 2) => void;
  onLogTask: (task: DailyTask, level: "standard" | "easy" | "minimum", mode: 0 | 1 | 2) => void;
  onGenerateTasks: () => void;
  onNavigate: (route: RouteId) => void;
}) {
  const { t, label } = useI18n();
  const states: Array<[string, string, 0 | 1 | 2]> = [["Ready", "standard tasks", 0], ["Busy", "easy tasks", 1], ["Tired", "keep-alive line", 2], ["Recovering", "restart only", 2]];
  const levels: Array<["Standard" | "Easy" | "Keep-alive", "standard" | "easy" | "minimum", keyof DailyTask, 0 | 1 | 2]> = [
    ["Standard", "standard", "standard_task", 0],
    ["Easy", "easy", "easy_task", 1],
    ["Keep-alive", "minimum", "minimum_task", 2],
  ];

  return (
    <section className="view active" id="view-today" aria-labelledby="today-title">
      <div className="page-head">
        <div><span className="label">{t("Today")}</span><h1 id="today-title">{t("Keep SEO work moving.")}</h1><p>{t("The day is successful when one count-only SEO action gets logged.")}</p></div>
        <button className="btn btn-secondary" onClick={() => onNavigate("assessment")}>{t("Retake assessment")}</button>
      </div>
      <div className="today-grid">
        <section className="panel ai-command">
          <div>
            <span className="label">{t("AI command center")}</span>
            <h2>{t("Today's plan tracks work evidence, not private SEO outputs.")}</h2>
            <p>{t("Open Semrush, Ahrefs, Trends, or a backlink source. Log counts here; keep real keywords and URLs in your private workspace.")}</p>
          </div>
          <div className="ai-command-actions">
            <button className="btn btn-primary" onClick={onGenerateTasks}>{t("Regenerate plan")}</button>
            <button className="btn btn-primary" onClick={() => onNavigate("review")}>{t("Generate review")}</button>
            <button className="btn btn-secondary" onClick={() => onNavigate("goals")}>{t("Inspect goal template")}</button>
          </div>
        </section>
        <section className="panel">
          <div className="section-head"><div><span className="label">{t("Daily state")}</span><h2>{t("How much depth can today hold?")}</h2></div><span className="badge">{t(["Standard", "Easy", "Keep-alive"][taskMode])} {t("recommended")}</span></div>
          <div className="state-grid">
            {states.map(([name, detail, mode]) => <button key={name} className={`state-card ${taskMode === mode ? "active" : ""}`} onClick={() => setTaskMode(mode)}><strong>{t(name)}</strong><span>{t(detail)}</span></button>)}
          </div>
        </section>
        <SeoWorkEvidence input={seoWorkInput} onChange={setSeoWorkInput} />
        <section className="panel task-panel">
          <div className="section-head"><div><span className="label">{t("Three-tier task set")}</span><h2>{t("Choose the line that fits today.")}</h2></div><span className="badge badge-blue">{t("Backend connected")}</span></div>
          <div className="task-stack">
            {tasks.map((task) => (
              <article className="task-card" key={task.id}>
                <header><div><h3>{t(task.title)}</h3><p>{t(task.meta)}</p></div><span className="badge">{task.status === "completed" ? t("Logged") : t("Open")}</span></header>
                <div className="tiers">
                  {levels.map(([label, level, field, mode]) => (
                    <button key={level} className={`tier ${taskMode === mode || task.selected_level === level ? "active" : ""}`} onClick={() => onLogTask(task, level, mode)}>
                      <strong>{t(label)}</strong><span>{t(String(task[field]))}</span>
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
        <aside className="right-rail">
          <section className="panel compact"><span className="label">{t("Line status")}</span><div className="metric-row"><strong>6</strong><span>{t("valid days this week")}</span></div><div className="week-line">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span className={`week-day ${index < 6 ? "done" : "today"}`} key={`${day}-${index}`}>{day}</span>)}</div></section>
          <section className="panel compact coach-panel"><span className="label">{t("AI coach")}</span><h3>{t("Encourage the work, never invent targets.")}</h3><p>{t("AI reviews your counts and keeps the next action small. It does not output keywords, domains, backlink URLs, or outreach recipients.")}</p><div className="coach-signal"><span>{t("Privacy")}</span><strong>{t("Count-only")}</strong></div><div className="coach-signal"><span>{t("Next adjustment")}</span><strong>{t("D1 → D2 after 5 valid days")}</strong></div></section>
          <section className="panel compact"><span className="label">{t("Work evidence")}</span><div className="asset-grid">{assetRows.map(([value, assetLabel]) => <div className="asset" key={assetLabel}><strong>{value}</strong><span>{label(String(assetLabel))}</span></div>)}</div></section>
        </aside>
      </div>
    </section>
  );
}

function SeoWorkEvidence({ input, onChange }: { input: SeoWorkInput; onChange: (input: SeoWorkInput) => void }) {
  const { t } = useI18n();
  const fields: Array<[keyof Omit<SeoWorkInput, "privacy_mode">, string, string]> = [
    ["tools_opened", "Tools opened", "Semrush / Ahrefs / Trends"],
    ["competitor_sites_analyzed", "Sites analyzed", "Competitors or SERP pages"],
    ["seed_terms_analyzed", "Seed terms", "Root topics checked"],
    ["keywords_analyzed", "Keyword rows", "Rows reviewed externally"],
    ["usable_keywords_found", "Usable count", "Count only, no real terms"],
    ["backlink_channels_screened", "Backlink channels", "Application/source paths"],
    ["normal_site_prospects_counted", "Normal prospects", "Non-spam content sites"],
    ["outreach_attempts_logged", "Outreach attempts", "Manual count"],
    ["followups_logged", "Follow-ups", "Manual count"],
  ];

  function updateField(key: keyof Omit<SeoWorkInput, "privacy_mode">, value: string) {
    onChange({ ...input, [key]: Math.max(0, Number(value) || 0) });
  }

  return (
    <section className="panel settings-card seo-evidence-panel">
      <div className="section-head">
        <div>
          <span className="label">{t("SEO work evidence")}</span>
          <h2>{t("Log counts, not private outputs.")}</h2>
          <p>{t("Real keywords and backlink URLs stay in your own tools. StayThread only records workload evidence for continuity.")}</p>
        </div>
        <span className="badge badge-green">{t("count-only")}</span>
      </div>
      <div className="settings-grid compact-grid">
        {fields.map(([key, label, hint]) => (
          <label key={key}>
            {t(label)}
            <input type="number" min="0" value={input[key]} onChange={(event) => updateField(key, event.target.value)} />
            <span className="field-hint">{t(hint)}</span>
          </label>
        ))}
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
  const { t, label } = useI18n();
  return (
    <section className="view active" id="view-goals" aria-labelledby="goals-title">
      <div className="page-head"><div><span className="label">{t("SEO/Growth companion")}</span><h1 id="goals-title">{t("Site growth becomes countable work evidence.")}</h1><p>{t("Templates guide keyword analysis and backlink screening without asking for private keywords or URLs.")}</p></div><button className="btn btn-primary" onClick={() => onGenerateTasks(selectedGoal?.id)}>{t("Generate Today tasks")}</button></div>
      <div className="goal-layout">
        <section className="goal-list">{goals.map((goal, index) => <button className={`goal-item ${index === activeGoal ? "active" : ""}`} key={goal.id} onClick={() => setActiveGoal(index)}><span className="badge">{label(goal.category_code)}</span><h3 style={{ margin: "12px 0 8px" }}>{t(goal.title)}</h3><p>{t(goal.description)}</p><div className="progress" style={{ marginTop: 14 }}><span style={{ width: `${goal.progress}%` }} /></div></button>)}</section>
        <section className="panel goal-detail">{selectedGoal ? <><span className="badge badge-blue">{label(selectedGoal.category_code)} {t("template")}</span><h2>{t(selectedGoal.title)}</h2><p>{t(selectedGoal.description)}</p><div className="score-grid" style={{ marginTop: 18 }}>{Object.entries(selectedGoal.process_assets ?? {}).slice(0, 2).map(([assetLabel, value]) => <div className="asset" key={assetLabel}><strong>{value}</strong><span>{label(assetLabel)}</span></div>)}</div><button className="btn btn-secondary" onClick={() => onGenerateTasks(selectedGoal.id)}>{t("Use this template today")}</button></> : <p>{t("No goals yet.")}</p>}</section>
        <form className="panel settings-card goal-create" onSubmit={onCreateGoal}>
          <span className="label">{t("Create goal")}</span>
          <h2>{t("Start with an SEO workflow so tasks stay concrete.")}</h2>
          <label>{t("Goal title")}<input name="title" required placeholder={t("Grow an English niche site")} /></label>
          <label>{t("Category")}<select name="categoryCode" defaultValue="seo">{taskCategories.map((category) => <option key={category.code} value={category.code}>{t(category.label)}</option>)}</select></label>
          <label>{t("Description")}<textarea name="description" placeholder={t("Site stage, SEO bottleneck, tools used, and daily available time.")} /></label>
          <button className="btn btn-primary" type="submit">{t("Create goal")}</button>
        </form>
      </div>
    </section>
  );
}

function Training() {
  const { t } = useI18n();
  return (
    <section className="view active" id="view-training">
      <div className="page-head">
        <div>
          <span className="label">{t("SEO/Growth workflows")}</span>
          <h1>{t("Keep site growth moving while external feedback is slow.")}</h1>
          <p>{t("Keyword analysis, backlink screening, content pipeline, and daily review are sized into standard, easy, and keep-alive actions.")}</p>
        </div>
      </div>
      <div className="module-grid">
        {modules.map((module) => (
          <article className="module-card" key={module.name}>
            <span className="badge badge-blue">{module.depth}</span>
            <h2>{t(module.name)}</h2>
            <p>{t(module.copy)}</p>
            <div className="milestone-list">
              <div className="milestone"><strong>{t("Standard")}</strong><span>{t(module.standard)}</span></div>
              <div className="milestone"><strong>{t("Easy")}</strong><span>{t(module.easy)}</span></div>
              <div className="milestone"><strong>{t("Keep-alive")}</strong><span>{t(module.minimum)}</span></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Review({ feedback, onSubmit }: { feedback: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const { t } = useI18n();
  return <section className="view active" id="view-review"><div className="page-head"><div><span className="label">{t("Daily review")}</span><h1>{t("Close the day without exposing private SEO outputs.")}</h1><p>{t("Two minutes is enough. Capture work counts, interruption, and tomorrow's keep-alive action.")}</p></div></div><form className="panel review-form" onSubmit={onSubmit}><label>{t("What moved forward today?")}<textarea name="movedForward" defaultValue={t("Opened Ahrefs, analyzed 2 competitor sites, reviewed 40 keyword rows, and found 4 usable candidates without storing the terms.")} /></label><label>{t("What interrupted or reduced progress?")}<textarea name="interruption" defaultValue={t("Avoided outreach because backlink replies take too long.")} /></label><label>{t("What is tomorrow's keep-alive action?")}<textarea name="tomorrowMinimum" defaultValue={t("Screen one backlink channel and log whether it has a normal application path.")} /></label><button className="btn btn-primary">{t("Generate review")}</button></form><section className="panel compact review-output"><span className="label">{t("Coach feedback")}</span><p>{t(feedback)}</p></section></section>;
}

function Insights({ weeklyReview, onGenerate }: { weeklyReview: WeeklyReview | null; onGenerate: () => void }) {
  const { t, label } = useI18n();
  const assetGrowth = weeklyReview?.asset_growth ?? {};
  return (
    <section className="view active" id="view-insights">
      <div className="page-head">
        <div><span className="label">{t("Weekly AI review")}</span><h1>{t("Turn SEO work counts into the next operating decision.")}</h1><p>{t("Weekly review summarizes count-only work evidence, bottlenecks, and the next plan from task and review data.")}</p></div>
        <button className="btn btn-primary" onClick={onGenerate}>{t("Generate weekly review")}</button>
      </div>
      <div className="insight-grid">
        <section className="panel insight-summary">
          <span className="badge badge-blue">{weeklyReview ? `${weeklyReview.week_start} ${t("to")} ${weeklyReview.week_end}` : t("Not generated")}</span>
          <h2>{weeklyReview ? t("Current week summary") : t("Generate the first weekly review")}</h2>
          <p>{t(weeklyReview?.summary ?? "StayThread will read task completion, daily reviews, and count-only SEO work evidence, then produce a constrained plan for next week.")}</p>
        </section>
        <section className="panel compact">
          <span className="label">{t("Asset growth")}</span>
          <div className="asset-grid">
            {Object.entries(assetGrowth).length ? Object.entries(assetGrowth).map(([assetLabel, value]) => <div className="asset" key={assetLabel}><strong>{value}</strong><span>{label(assetLabel)}</span></div>) : <div className="asset"><strong>0</strong><span>{t("review data")}</span></div>}
          </div>
        </section>
        <section className="panel settings-card">
          <h2>{t("Bottlenecks")}</h2>
          {(weeklyReview?.bottlenecks ?? ["No weekly review yet."]).map((item) => <p key={item}>{t(item)}</p>)}
        </section>
        <section className="panel settings-card">
          <h2>{t("Next week plan")}</h2>
          {(weeklyReview?.next_week_plan ?? ["Generate a review after logging tasks."]).map((item) => <p key={item}>{t(item)}</p>)}
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
  const { t } = useI18n();
  const trialMonths = subscription?.trial_months === 2 ? 2 : 1;
  return (
    <section className="view active" id="view-billing">
      <div className="page-head">
        <div><span className="label">{t("Billing")}</span><h1>{t("Start with a controlled trial.")}</h1><p>{t("StayThread is in trial-first mode. Paid checkout can attach later to the same subscription record without changing this product surface.")}</p></div>
        <span className="badge badge-green">{t(subscription?.plan ?? "Starter")} · {trialDaysRemaining} {t("days left")}</span>
      </div>
      <section className="panel trial-panel">
        <div>
          <span className="label">{t("Trial control")}</span>
          <h2>{trialMonths} {t("month trial")}</h2>
          <p>{t("Trial ends on")} {subscription?.current_period_end ?? t("not set")}. {t("Status stays trialing while payment is not connected.")}</p>
        </div>
        <div className="trial-toggle" aria-label="Trial length">
          <button className={trialMonths === 1 ? "active" : ""} onClick={() => onSelectPlan(undefined, 1)}>{t("1 month")}</button>
          <button className={trialMonths === 2 ? "active" : ""} onClick={() => onSelectPlan(undefined, 2)}>{t("2 months")}</button>
        </div>
      </section>
      <div className="pricing-grid app-pricing">
        {planCards.map((plan) => (
          <article className={`pricing-card ${subscription?.plan === plan.name ? "active" : ""}`} key={plan.name}>
            <span className="badge">{t(plan.name)}</span>
            <strong>{t(plan.price)}</strong>
            <p>{t(plan.copy)}</p>
            <ul>{plan.features.map((feature) => <li key={feature}>{t(feature)}</li>)}</ul>
            <button className="btn btn-primary" onClick={() => onSelectPlan(plan.name)}>{subscription?.plan === plan.name ? t("Current trial plan") : t("Use during trial")}</button>
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
  const { t } = useI18n();
  return (
    <section className="view active" id="view-settings">
      <div className="page-head">
        <div>
          <span className="label">{t("Trust and control")}</span>
          <h1>{t("Profile data stays editable.")}</h1>
          <p>{t("StayThread records SEO workload evidence, not your private keyword list or backlink URL list.")}</p>
        </div>
      </div>
      <div className="settings-grid">
        <form
          className="panel settings-card"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            onSave({
              dailyAvailableMinutes: Number(form.get("dailyAvailableMinutes") ?? 35),
              preferredTime: String(form.get("preferredTime") ?? "Afternoon"),
              goalContext: String(form.get("goalContext") ?? ""),
              onboardingCompleted: true,
            });
          }}
        >
          <h2>{t("Profile")}</h2>
          <label>{t("Daily available minutes")}<input name="dailyAvailableMinutes" type="number" defaultValue={profile?.daily_available_minutes ?? 35} /></label>
          <label>{t("Preferred time")}<select name="preferredTime" defaultValue={profile?.preferred_time ?? "Afternoon"}><option value="Morning">{t("Morning")}</option><option value="Afternoon">{t("Afternoon")}</option><option value="Evening">{t("Evening")}</option></select></label>
          <label>{t("Primary goal context")}<input name="goalContext" defaultValue={profile?.goal_context ?? t("Solo international site owner doing keyword analysis and SEO backlink work")} /></label>
          <button className="btn btn-primary" type="submit">{t("Save profile")}</button>
        </form>
        <section className="panel settings-card">
          <h2>{t("Account")}</h2>
          <p>{authUser ? `${t("Signed in as")} ${authUser.email ?? authUser.id} ${t("with")} ${authUser.provider ?? "email"}. ${t("Your workspace is linked to Supabase Auth.")}` : t("You are using prototype preview mode. Create an account to bind this workspace to Supabase Auth.")}</p>
          {authUser ? <button className="btn btn-secondary" onClick={onLogout}>{t("Sign out")}</button> : null}
        </section>
        <section className="panel settings-card">
          <h2>{t("AI interface")}</h2>
          <p>{t("AI is configured server-side with only an endpoint and key: `AI_API_ENDPOINT` and `AI_API_KEY`. StayThread does not ask users to choose a provider here.")}</p>
          <p>{t("Supported interface modes are Chat-completions JSON or a custom JSON adapter endpoint. The key never belongs in browser state or profile preferences.")}</p>
        </section>
        <section className="panel settings-card">
          <h2>{t("Privacy controls")}</h2>
          <p>{t("Export is a full JSON snapshot. Reset removes progress and reviews while keeping profile and goals. Delete account removes the prototype profile and cascaded data. Real keywords and backlink URLs are not required for the beta loop.")}</p>
          <button className="btn btn-secondary" onClick={onExportData}>{t("Export profile data")}</button>
          <button className="btn btn-secondary" onClick={onResetProgress}>{t("Reset progress data")}</button>
          <button className="btn btn-danger" onClick={onDeleteAccount}>{t("Delete account")}</button>
        </section>
      </div>
    </section>
  );
}
