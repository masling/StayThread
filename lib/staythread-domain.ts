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
  { dimension: "Recovery ability", text: "A minimum action still feels like a valid way to keep the goal alive." },
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
    title: "Grow an independent site",
    description: "Build search demand with focused keyword clusters and publishing loops.",
    progress: 42,
    process_assets: { keywords: 12, briefs: 2, internal_links: 4 },
  },
  {
    category_code: "writing",
    title: "Publish a weekly essay",
    description: "Turn notes into shipped public writing.",
    progress: 55,
    process_assets: { drafts: 2, outlines: 4, shipped_posts: 2 },
  },
  {
    category_code: "movement",
    title: "Rebuild walking habit",
    description: "Rebuild gentle movement capacity without punishment.",
    progress: 70,
    process_assets: { walks: 6, minutes: 105, comfort_notes: 3 },
  },
];

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
  { code: "seo", label: "SEO Growth", metric: "keywords, briefs, internal links" },
  { code: "writing", label: "Writing", metric: "outlines, drafts, shipped posts" },
  { code: "movement", label: "Movement", metric: "walks, minutes, comfort notes" },
  { code: "reading", label: "Reading", metric: "pages, notes, attention minutes" },
  { code: "project", label: "Project Shipping", metric: "tickets, commits, user feedback" },
] as const;

const taskTemplates: Record<string, Omit<TaskPrescription, "goal_id">> = {
  seo: {
    title: "SEO growth block",
    meta: "Independent builder template",
    standard_task: "Cluster 20 keywords around one search intent and draft the next brief.",
    easy_task: "Review 5 keywords and mark intent, difficulty, and next action.",
    minimum_task: "Write down one keyword opportunity and one question it should answer.",
    recommended_level: "easy",
    reason: "Process assets make slow SEO progress visible before traffic changes.",
  },
  writing: {
    title: "Writing shipment block",
    meta: "Visible output template",
    standard_task: "Draft 800 words or complete one full section.",
    easy_task: "Write 200 rough words from existing notes.",
    minimum_task: "Write 3 useful bullets without editing.",
    recommended_level: "easy",
    reason: "Writing improves when output volume is protected from perfection pressure.",
  },
  movement: {
    title: "Movement capacity block",
    meta: "Energy support template",
    standard_task: "Walk or train for 30 minutes at comfortable effort.",
    easy_task: "Walk 15 minutes and record energy before and after.",
    minimum_task: "Stand up, breathe, and walk for 5 minutes.",
    recommended_level: "minimum",
    reason: "Movement should preserve recovery and never become punishment for missed days.",
  },
  reading: {
    title: "Reading base training",
    meta: "Low-stimulation focus",
    standard_task: "Read 30 minutes and capture 3 notes.",
    easy_task: "Read 10 minutes and mark one useful passage.",
    minimum_task: "Open the book and read 2 pages.",
    recommended_level: "easy",
    reason: "Reading builds tolerance for slow feedback without raising pressure.",
  },
  project: {
    title: "Project shipping block",
    meta: "Execution template",
    standard_task: "Ship one small user-visible improvement and write the release note.",
    easy_task: "Finish one scoped implementation step or test.",
    minimum_task: "Define the next 10-minute action and remove one blocker.",
    recommended_level: "easy",
    reason: "Shipping goals need visible increments instead of endless redesign.",
  },
};

export function tasksForGoal(goal?: GoalLike | null): TaskPrescription[] {
  const code = goal?.category_code && taskTemplates[goal.category_code] ? goal.category_code : "seo";
  return [
    { goal_id: null, ...taskTemplates.reading },
    { goal_id: goal?.id ?? null, ...taskTemplates[code] },
    {
      goal_id: null,
      title: "Daily review",
      meta: "Recovery capacity",
      standard_task: "Write a 6-line review with blocker and next action.",
      easy_task: "Answer the 3 review prompts.",
      minimum_task: "Mark state and choose tomorrow's minimum action.",
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
}) {
  return `${input.movedForward || "One process asset moved forward."} The interruption is useful data, not a failure. Tomorrow, start with: ${input.tomorrowMinimum || "one minimum action."}`;
}

export function generateWeeklyReview(input: {
  completedCount: number;
  totalCount: number;
  activeGoals: number;
  latestDailyFeedback?: string | null;
}) {
  const completionRate = input.totalCount > 0 ? Math.round((input.completedCount / input.totalCount) * 100) : 0;
  const bottlenecks =
    completionRate >= 70
      ? ["Task volume can rise slightly next week.", "Protect the review habit so progress data stays fresh."]
      : ["Continuity is still fragile.", "The next plan should lower friction before adding volume."];

  return {
    summary: `This week logged ${input.completedCount} of ${input.totalCount} tasks across ${input.activeGoals} active goal threads. The best next move is to keep the line credible and only increase depth after consistency is visible.`,
    assetGrowth: {
      completed_tasks: input.completedCount,
      completion_rate: completionRate,
      active_goals: input.activeGoals,
    },
    bottlenecks,
    nextWeekPlan: [
      "Keep one main goal visible on the Today page.",
      completionRate >= 70 ? "Move one task from easy to standard on high-energy days." : "Default to easy/minimum tasks for the first three days.",
      input.latestDailyFeedback ?? "Close each day with one sentence about what moved forward.",
    ],
  };
}
