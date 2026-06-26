import type { Locale } from "@/lib/i18n";

export const dimensions = [
  "Goal clarity",
  "Startup ability",
  "Consistency",
  "Anti-distraction",
  "Recovery ability",
  "Foundational energy",
  "Planning ability",
] as const;

export type Dimension = (typeof dimensions)[number];

export const assessmentQuestions: Array<{ dimension: Dimension; text: string }> = [
  { dimension: "Goal clarity", text: "I can clearly state the one long-term goal I should focus on this week." },
  { dimension: "Goal clarity", text: "My current goal has a visible next milestone." },
  { dimension: "Goal clarity", text: "I know what success would look like in the next seven days." },
  { dimension: "Goal clarity", text: "I am not trying to pursue too many important goals at once." },
  { dimension: "Startup ability", text: "When I know what to do, I can begin within five minutes." },
  { dimension: "Startup ability", text: "I can start before I feel fully motivated." },
  { dimension: "Startup ability", text: "A tiny first action usually helps me enter the task." },
  { dimension: "Startup ability", text: "I rarely delay the first step after choosing a task." },
  { dimension: "Consistency", text: "I can keep a small daily action going for at least seven days." },
  { dimension: "Consistency", text: "Busy days do not usually make me abandon the plan." },
  { dimension: "Consistency", text: "I can repeat a useful action even when it feels ordinary." },
  { dimension: "Consistency", text: "I track progress without needing dramatic results every day." },
  { dimension: "Anti-distraction", text: "Short videos, feeds, games, or entertainment rarely pull me away from important work." },
  { dimension: "Anti-distraction", text: "I can notice when I am drifting into instant-reward loops." },
  { dimension: "Anti-distraction", text: "I can return to a meaningful task after a short distraction." },
  { dimension: "Anti-distraction", text: "Low-stimulation work such as reading or writing still feels tolerable." },
  { dimension: "Recovery ability", text: "If I miss one day, I can return the next day without restarting the entire plan." },
  { dimension: "Recovery ability", text: "I can choose a smaller task instead of dropping the goal." },
  { dimension: "Recovery ability", text: "A missed day does not usually become a missed week." },
  { dimension: "Recovery ability", text: "I can recover without blaming myself." },
  { dimension: "Foundational energy", text: "My current sleep, body, and energy support focused work or training." },
  { dimension: "Foundational energy", text: "My daily schedule has enough room for a small action." },
  { dimension: "Foundational energy", text: "My body feels ready for light movement or focused work most days." },
  { dimension: "Foundational energy", text: "I can lower intensity when energy is low." },
  { dimension: "Planning ability", text: "I can break a large goal into a realistic task for today." },
  { dimension: "Planning ability", text: "I know which process metrics matter for my current goal." },
  { dimension: "Planning ability", text: "I can tell the difference between planning and actually moving forward." },
  { dimension: "Planning ability", text: "I can choose the next action without redesigning the whole plan." },
  { dimension: "Consistency", text: "I can accept slow progress if the process is clearly accumulating." },
  { dimension: "Recovery ability", text: "A keep-alive action still feels like a valid way to keep the goal alive." },
];

export type AssessmentResult = {
  scores: Record<Dimension, number>;
  stage: string;
  depth: string;
  primaryBottleneck: Dimension;
  secondaryBottleneck: Dimension;
  overallScore: number;
  summary: string;
};

export function scoreAssessment(answers: number[]): AssessmentResult {
  if (answers.length !== assessmentQuestions.length) {
    throw new Error(`Expected ${assessmentQuestions.length} answers.`);
  }

  const grouped = Object.fromEntries(dimensions.map((dimension) => [dimension, [] as number[]])) as Record<Dimension, number[]>;
  assessmentQuestions.forEach((question, index) => {
    const value = answers[index];
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error("Each assessment answer must be an integer from 1 to 5.");
    }
    grouped[question.dimension].push(value);
  });

  const scores = Object.fromEntries(
    dimensions.map((dimension) => {
      const values = grouped[dimension];
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      return [dimension, Math.round((average / 5) * 100)];
    }),
  ) as Record<Dimension, number>;

  const sorted = [...dimensions].sort((a, b) => scores[a] - scores[b]);
  const primaryBottleneck = sorted[0];
  const secondaryBottleneck = sorted[1];
  const lowestScore = scores[primaryBottleneck];
  const overallScore = Math.round(dimensions.reduce((sum, dimension) => sum + scores[dimension], 0) / dimensions.length);

  let depth = "D4 Challenge";
  if (lowestScore < 40) depth = "D1 Recovery";
  else if (lowestScore < 60) depth = "D2 Stability";
  else if (lowestScore < 80) depth = "D3 Growth";

  let stage = "L5 Compounder";
  if (overallScore < 45 || scores["Goal clarity"] < 45 || scores["Foundational energy"] < 45) stage = "L1 Overloaded";
  else if (overallScore < 60 || scores["Startup ability"] < 55) stage = "L2 Starter";
  else if (scores.Consistency < 70 || scores["Recovery ability"] < 70) stage = "L3 Chain Builder";
  else if (overallScore < 85) stage = "L4 Stable Builder";

  return {
    scores,
    stage,
    depth,
    primaryBottleneck,
    secondaryBottleneck,
    overallScore,
    summary: `Your current starting point is ${stage}. The main bottleneck is ${primaryBottleneck}, so StayThread recommends ${depth} and a 7-day plan that protects continuity before increasing volume.`,
  };
}

export const seedGoals = [
  {
    category_code: "seo",
    title: "Grow an English independent site",
    description: "Keep keyword analysis and SEO backlink work moving without storing private keywords or URLs.",
    progress: 42,
    process_assets: { tools_opened: 5, keywords_analyzed: 240, usable_keywords_found: 18, backlink_channels_screened: 6 },
  },
  {
    category_code: "keyword_research",
    title: "Build a keyword discovery routine",
    description: "Use Semrush, Ahrefs, or Google Trends to analyze sites, seed terms, and keyword rows.",
    progress: 35,
    process_assets: { competitor_sites_analyzed: 12, seed_terms_analyzed: 8, keywords_analyzed: 240, usable_keywords_found: 18 },
  },
  {
    category_code: "backlink_work",
    title: "Screen normal backlink opportunities",
    description: "Find application channels and normal content sites while avoiding spam link farms.",
    progress: 28,
    process_assets: { backlink_channels_screened: 6, normal_site_prospects_counted: 4, outreach_attempts_logged: 1 },
  },
];

export const seoWorkMetricKeys = [
  "tools_opened",
  "competitor_sites_analyzed",
  "seed_terms_analyzed",
  "keywords_analyzed",
  "usable_keywords_found",
  "backlink_channels_screened",
  "normal_site_prospects_counted",
  "outreach_attempts_logged",
  "followups_logged",
] as const;

export type SeoWorkMetricKey = (typeof seoWorkMetricKeys)[number];
export type SeoWorkEvidence = Record<SeoWorkMetricKey, number> & { privacy_mode: "count_only" };

export function sanitizeSeoWorkEvidence(input: Record<string, unknown> | null | undefined): SeoWorkEvidence {
  const evidence = Object.fromEntries(
    seoWorkMetricKeys.map((key) => {
      const rawValue = input?.[key];
      const value = typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0);
      return [key, Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0];
    }),
  ) as Record<SeoWorkMetricKey, number>;

  return { ...evidence, privacy_mode: "count_only" };
}

export function defaultProcessAssetsForCategory(categoryCode: string): Record<string, number> {
  if (categoryCode === "keyword_research") {
    return { competitor_sites_analyzed: 0, seed_terms_analyzed: 0, keywords_analyzed: 0, usable_keywords_found: 0 };
  }
  if (categoryCode === "backlink_work") {
    return { backlink_channels_screened: 0, normal_site_prospects_counted: 0, outreach_attempts_logged: 0, followups_logged: 0 };
  }
  if (categoryCode === "content_pipeline") {
    return { page_ideas_created: 0, briefs_created: 0, internal_link_ideas: 0 };
  }
  return { tools_opened: 0, keywords_analyzed: 0, usable_keywords_found: 0, backlink_channels_screened: 0 };
}

export type TaskPrescription = {
  goal_id: string | null;
  title: string;
  meta: string;
  standard_task: string;
  easy_task: string;
  minimum_task: string;
  recommended_level: "standard" | "easy" | "minimum";
  reason: string;
};

export type GoalLike = {
  id?: string;
  title?: string;
  category_code?: string;
};

export const categoryTemplates = [
  { code: "seo", label: "SEO/Growth", metric: "tools opened, keywords analyzed, backlink channels screened" },
  { code: "keyword_research", label: "Keyword analysis", metric: "sites, seed terms, keyword rows, usable count" },
  { code: "backlink_work", label: "Backlink work", metric: "channels screened, normal prospects, follow-ups" },
  { code: "content_pipeline", label: "Content pipeline", metric: "page ideas, briefs, internal link ideas" },
] as const;

const taskTemplates: Record<string, Omit<TaskPrescription, "goal_id">> = {
  seo: {
    title: "SEO work evidence block",
    meta: "Count-only independent site owner template",
    standard_task: "Open Semrush, Ahrefs, or Trends. Analyze 3 competitor sites, 3 seed terms, and at least 30 keyword rows. Log only counts and optional metadata.",
    easy_task: "Open one SEO tool. Analyze 1 competitor site or 1 seed term, then log keyword rows analyzed and usable keyword count.",
    minimum_task: "Keep-alive: open one SEO tool or screen one backlink channel, then log the work count only.",
    recommended_level: "easy",
    reason: "StayThread tracks work evidence without asking you to store private keywords or backlink URLs.",
  },
  keyword_research: {
    title: "Keyword analysis block",
    meta: "Semrush / Ahrefs / Trends workflow",
    standard_task: "Analyze 5 competitor pages and 5 seed terms. Record total keyword rows reviewed, usable keyword count, and optional volume/result-count metadata.",
    easy_task: "Analyze 2 seed terms and record how many keyword rows you reviewed.",
    minimum_task: "Keep-alive: open one keyword tool and review one seed term.",
    recommended_level: "easy",
    reason: "New and early-stage sites need repeated keyword analysis before content direction is clear.",
  },
  backlink_work: {
    title: "Backlink screening block",
    meta: "Normal-site prospecting workflow",
    standard_task: "Screen 10 potential sites. Count how many have an application channel, normal content, and low spam/outbound-link risk.",
    easy_task: "Screen 3 sites or one backlink channel and record passable prospects count.",
    minimum_task: "Keep-alive: screen one backlink channel or one site for application path and spam risk.",
    recommended_level: "minimum",
    reason: "Existing low-content or low-traffic sites need steady backlink work, but the platform should not store private URLs.",
  },
  content_pipeline: {
    title: "Content pipeline block",
    meta: "From keyword work to page assets",
    standard_task: "Turn usable keyword counts into 3 page ideas and 1 brief outline in your private workspace. Log counts only.",
    easy_task: "Create 1 page idea from yesterday's keyword analysis and log it.",
    minimum_task: "Keep-alive: write one page idea ID or brief placeholder.",
    recommended_level: "easy",
    reason: "Content planning can stay private while StayThread tracks whether the process keeps moving.",
  },
};

export function tasksForGoal(goal?: GoalLike | null): TaskPrescription[] {
  const code = goal?.category_code && taskTemplates[goal.category_code] ? goal.category_code : "seo";
  if (code === "seo") {
    return [
      { goal_id: goal?.id ?? null, ...taskTemplates.keyword_research },
      { goal_id: goal?.id ?? null, ...taskTemplates.backlink_work },
      {
        goal_id: goal?.id ?? null,
        title: "Daily SEO review",
        meta: "Count-only recovery loop",
        standard_task: "Summarize tools opened, rows analyzed, usable count, channels screened, and tomorrow's keep-alive action.",
        easy_task: "Answer the 3 review prompts with counts only.",
        minimum_task: "Keep-alive: choose tomorrow's smallest SEO action.",
        recommended_level: "minimum",
        reason: "Review keeps the next action visible without exposing your private keywords or URLs.",
      },
    ];
  }
  return [
    { goal_id: goal?.id ?? null, ...taskTemplates.seo },
    { goal_id: goal?.id ?? null, ...taskTemplates[code] },
    {
      goal_id: null,
      title: "Daily SEO review",
      meta: "Recovery capacity",
      standard_task: "Write a count-only review with blocker and next action.",
      easy_task: "Answer the 3 review prompts.",
      minimum_task: "Keep-alive: mark state and choose tomorrow's smallest action.",
      recommended_level: "minimum",
      reason: "Review keeps the next action visible and makes recovery easier.",
    },
  ];
}

export function defaultTasks(goalId?: string | null) {
  return tasksForGoal({ id: goalId ?? undefined, category_code: "seo" });
}

export function generateReviewFeedback(input: {
  movedForward: string;
  interruption: string;
  tomorrowMinimum: string;
}, locale: Locale = "en") {
  if (locale === "zh") {
    return `${input.movedForward || "一个 SEO 工作计数向前推进了。"} 中断是有用数据，不是失败。把真实关键词和 URL 留在你的私有工作区。明天从这里开始：${input.tomorrowMinimum || "一个保线动作。"}`;
  }
  return `${input.movedForward || "One SEO work count moved forward."} The interruption is useful data, not a failure. Keep the actual keywords and URLs in your private workspace. Tomorrow, start with: ${input.tomorrowMinimum || "one keep-alive action."}`;
}

export function generateWeeklyReview(input: {
  completedCount: number;
  totalCount: number;
  activeGoals: number;
  latestDailyFeedback?: string | null;
  seoWorkEvidence?: Record<string, number>;
  locale?: Locale;
}) {
  const locale = input.locale ?? "en";
  const completionRate = input.totalCount > 0 ? Math.round((input.completedCount / input.totalCount) * 100) : 0;
  const seoWorkEvidence = input.seoWorkEvidence ?? {};
  const bottlenecks =
    completionRate >= 70
      ? locale === "zh"
        ? ["下周任务量可以小幅上升。", "继续记录计数，不记录私密关键词或外链 URL。"]
        : ["Task volume can rise slightly next week.", "Keep recording counts, not private keywords or backlink URLs."]
      : locale === "zh"
        ? ["连续性仍然脆弱。", "下一份计划应该先降低摩擦，再增加任务量。"]
        : ["Continuity is still fragile.", "The next plan should lower friction before adding volume."];

  if (locale === "zh") {
    return {
      summary: `本周在 ${input.activeGoals} 条活跃 SEO 主线中完成了 ${input.completedCount}/${input.totalCount} 个任务。StayThread 正在追踪工作证据，而不是你的私密关键词或外链列表。最好的下一步是保持主线可信，只在连续性可见后再提高深度。`,
      assetGrowth: {
        completed_tasks: input.completedCount,
        completion_rate: completionRate,
        active_goals: input.activeGoals,
        ...seoWorkEvidence,
      },
      bottlenecks,
      nextWeekPlan: [
        "让一个主要 SEO/Growth 目标在今日页保持可见。",
        completionRate >= 70 ? "在高能量日把一个任务从轻量提升到标准。" : "前三天默认使用轻量/保线任务。",
        input.latestDailyFeedback ?? "每天用一句话结束：今天推进了什么。",
      ],
    };
  }

  return {
    summary: `This week logged ${input.completedCount} of ${input.totalCount} tasks across ${input.activeGoals} active SEO threads. StayThread is tracking work evidence, not your private keyword or backlink list. The best next move is to keep the line credible and only increase depth after consistency is visible.`,
    assetGrowth: {
      completed_tasks: input.completedCount,
      completion_rate: completionRate,
      active_goals: input.activeGoals,
      ...seoWorkEvidence,
    },
    bottlenecks,
    nextWeekPlan: [
      "Keep one main SEO/Growth goal visible on the Today page.",
      completionRate >= 70 ? "Move one task from easy to standard on high-energy days." : "Default to easy/keep-alive tasks for the first three days.",
      input.latestDailyFeedback ?? "Close each day with one sentence about what moved forward.",
    ],
  };
}
