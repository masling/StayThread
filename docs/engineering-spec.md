# StayThread Engineering Spec

## Production Direction

- App: Next.js App Router + TypeScript.
- Styling: extracted token layer from `staythread-mvp/styles.css`, imported through `app/globals.css`.
- Auth/database: Supabase Auth + PostgreSQL.
- AI: provider-neutral server-side interface later; current MVP uses deterministic templates and review helpers.
- Analytics: PostgreSQL `events` table first; dedicated analytics can be evaluated after beta.

The active application is `app/`. The `staythread-mvp/` folder remains a legacy static reference for flow, UI direction, and copy comparison.

## Product Boundary

StayThread's main product category is broader than SEO: long-term action training for slow-feedback goals.

The current beta wedge is narrower:

- Beginner/intermediate solo international site owners.
- Keyword analysis/discovery work using Semrush, Ahrefs, Google Trends, competitor pages, seed terms, and keyword rows.
- SEO backlink work through manual channel screening, normal-site prospecting, and outreach/follow-up counts.
- Count-only privacy: users are not expected to store real keywords, backlink URLs, domains, or outreach recipients in StayThread.

## Implemented User Flow

1. Public Landing explains the broad StayThread value.
2. Public Assessment allows users to answer 30 questions before signup.
3. Result shows stage, depth, primary/secondary bottlenecks, and starting prescription.
4. Auth/register/login can bind the prototype workspace to Supabase Auth.
5. Today shows current beta SEO/Growth tasks and count-only work evidence inputs.
6. Goals exposes SEO/Growth templates and process assets.
7. Training shows current workflow modules: keyword analysis, backlink screening, content pipeline, and daily review.
8. Review stores daily reflection and deterministic coach feedback.
9. Weekly review aggregates completion and SEO work evidence.
10. Settings supports profile edit, export, progress reset, sign out, and account delete.

## Domain Model

Implemented tables used by the app:

- `user_profiles`: prototype/auth ownership, preferences, available minutes, selected module.
- `assessment_results`: dimension scores, stage, depth, bottlenecks, summary.
- `task_categories`: category template metadata. The app ensures current SEO/Growth categories exist before seed goals.
- `goals`: category-based goals and process assets.
- `daily_tasks`: standard/easy/minimum task set; user-facing copy says keep-alive.
- `progress_logs`: completion level, count-only work evidence, notes.
- `daily_reviews`: daily moved-forward/interruption/tomorrow keep-alive review.
- `weekly_reviews`: completion summary, work evidence aggregation, bottlenecks, next plan.
- `subscriptions`: trial state and feature flags.
- `events`: product analytics events.
- `ai_generation_logs`: deterministic generation audit trail and guardrails.

Planned or PRD-level entities not yet implemented as separate tables:

- `training_modules`.
- `user_training_plans`.
- `goal_profiles`.
- `seo_work_logs` as a dedicated table. Current implementation stores count-only evidence in `progress_logs.value_data`.

## Assessment Logic

Dimensions:

- Goal clarity.
- Startup ability.
- Consistency.
- Anti-distraction.
- Recovery ability.
- Foundational energy.
- Planning ability.

MVP scoring:

- 1-5 Likert answers.
- Each dimension normalizes to 0-100.
- Overall score is the average dimension score.
- Bottlenecks are the lowest two dimensions.
- Recommended depth is primarily determined by the lowest dimension.

Depth mapping:

- 0-39: D1 Recovery.
- 40-59: D2 Stability.
- 60-79: D3 Growth.
- 80-100: D4 Challenge.

Stage mapping:

- L1 Overloaded: goal clarity or foundational energy is very low, or overall is under 45.
- L2 Starter: startup ability is low, or overall is under 60.
- L3 Chain Builder: action is possible, but consistency or recovery is under 70.
- L4 Stable Builder: overall 70-84 with no severe bottleneck.
- L5 Compounder: overall 85+ and no dimension under 70.

## Task and Evidence Rules

- Every task has `standard_task`, `easy_task`, and `minimum_task`.
- The UI labels `minimum_task` as keep-alive.
- `SEO/Growth` is the current beta P0 template.
- Keyword work tracks counts only: tools opened, competitor/site count, seed terms, keyword rows, usable keyword count.
- Backlink work tracks counts only: backlink channels screened, normal-site prospects, outreach attempts, follow-ups.
- `sanitizeSeoWorkEvidence` whitelists numeric fields and forces `privacy_mode: "count_only"`.
- Real keywords, backlink URLs, domains, and outreach recipients should stay in the user's private tools.

## API Surface

Implemented routes:

- `GET /api/bootstrap`: profile/session bootstrap, seed goals, today tasks, subscription, categories, latest assessment, recent reviews, weekly review.
- `POST /api/assessment/submit`: score 30 answers, store assessment, ensure seed goals/tasks.
- `POST /api/auth/register`: create Supabase Auth user and bind profile.
- `POST /api/auth/login`: verify password login and restore profile.
- `POST /api/auth/session`: bridge OAuth Supabase session into app session.
- `POST /api/auth/logout`: clear auth session.
- `GET /api/auth/me`: load current signed auth user.
- `GET /api/categories`: return deterministic category templates.
- `GET /api/goals`: ensure/load seed goals.
- `POST /api/goals`: create category goal with default process assets.
- `GET/PATCH /api/profile`: load/update profile.
- `GET/PATCH /api/billing`: load/update trial and plan state.
- `POST /api/tasks/generate`: regenerate today's deterministic task prescription.
- `POST /api/tasks/log`: complete task and insert sanitized progress log.
- `POST /api/reviews/daily`: store daily review and deterministic feedback.
- `GET /api/reviews/weekly`: load current weekly review.
- `POST /api/reviews/weekly`: aggregate tasks, reviews, and SEO work evidence.
- `GET /api/data/export`: export profile-owned data.
- `DELETE /api/data/progress`: reset progress/reviews/tasks while preserving profile and goals.
- `DELETE /api/account`: delete prototype profile and cascade data.
- `POST /api/events`: store product event.

Not implemented:

- `POST /api/assessment/start`.
- `POST /api/prescriptions/generate`.
- `GET /api/reviews/daily`.
- Separate `/api/settings/*` namespace; current implementation uses `/api/profile`, `/api/data/*`, and `/api/account`.

## AI Guardrails

Current implementation is deterministic and logs guardrails in `ai_generation_logs`.

## AI Interface Contract

StayThread should not configure AI by vendor/provider name. The runtime AI configuration has only two required server-side values:

- `AI_API_ENDPOINT`: the URL to call.
- `AI_API_KEY`: the server-side secret used to authorize the call.

Optional:

- `AI_API_MODE`: `chat_completions` or `custom_json`.

Supported interface modes:

- `chat_completions`: default Chat Completions-style JSON endpoint. This can point at any provider, gateway, proxy, or self-hosted endpoint that implements a compatible request/response shape.
- `custom_json`: a project-owned adapter endpoint. StayThread sends structured task JSON and expects structured JSON back.

Rules:

- Do not add provider selectors to product settings.
- Do not store `AI_API_KEY` in browser state, `user_profiles.ai_preferences`, local storage, screenshots, or docs.
- If the endpoint is not configured or fails, StayThread must fall back to deterministic templates.
- Prompt/model/version observability can be recorded in `ai_generation_logs`, but vendor identity is not required for product configuration.

Future AI calls must follow:

- Concise, concrete, action-oriented output.
- Use structured templates for task skeletons.
- AI may explain, encourage, rephrase, and summarize.
- AI must not diagnose, treat, or make medical claims.
- AI must not use shame-based language.
- AI must not encourage extreme exercise, sleep deprivation, or punishment.
- For site-owner beta, AI must not output keywords, keyword clusters, domains, backlink URLs, outreach targets, or email recipients.
- AI must not promise ranking, traffic, income, or backlink success.

## Verification Strategy

Required before each functional commit:

```bash
npm run typecheck
npm run build
```

Minimal E2E smoke test:

```bash
npm run start -- -p 3010
STAYTHREAD_BASE_URL=http://localhost:3010 npm run test:e2e
```

The smoke test covers the core beta loop:

- Landing reachable.
- Bootstrap creates session.
- Assessment submit succeeds.
- Task generation succeeds.
- Count-only SEO task logging succeeds and private fields are not persisted.
- Daily review succeeds.
- Weekly review succeeds and aggregates SEO evidence.

Browser smoke tests should still be used after significant visual changes.

## Release Milestones

Completed:

- M1 Product skeleton: Landing, app shell, navigation, Supabase-backed API routes, logo/favicon.
- M2 Assessment: 30-question questionnaire, scoring, result, registration prompt.
- M4 Goal companion baseline: seed goals, category templates, task generation, progress logging.
- M5 Reviews baseline: daily review and weekly review deterministic summaries.
- Privacy baseline: count-only SEO work evidence and data export/reset/delete surfaces.

Partially complete:

- M3 Training modules: current UI reflects SEO/Growth beta workflows; broader foundational modules remain PRD-level, not current beta validation target.
- M6 Beta readiness: beta plan exists; analytics/events exist; cohort dashboard and systematic research logging still need operating discipline.

Not complete:

- Controlled server-side AI generation.
- SEO tutorial membership content.
- GSC/Ahrefs/Semrush integrations.
- Payment/checkout production flow.
- Cohort analytics dashboard.
- Full browser E2E suite.
