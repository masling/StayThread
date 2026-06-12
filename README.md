# StayThread

StayThread is an AI-guided long-term action training product for people who struggle to keep moving when feedback is slow. The product positioning stays broader than SEO: it is a structured system for assessment, daily action sizing, recovery, and review.

The current private beta wedge is narrower: beginner/intermediate solo international site owners who need to keep keyword analysis, content pipeline, and SEO backlink work moving without storing private keywords or backlink URLs in the app.

## Current Status

- Latest checkpoint commit: `e317cb6 Focus beta validation on site-owner continuity`.
- Main app: Next.js App Router + TypeScript + Supabase.
- Legacy reference prototype: `staythread-mvp/`.
- PRD and beta documents are under `docs/`.
- Worktree should be committed after each functional change so regressions can be rolled back cleanly.

## Source Materials

- `docs/StayThread_PRD_Requirements_v0.4_American_English.docx`: original PRD.
- `docs/StayThread_PRD_Requirements_v0.5_American_English.md`: current PRD source.
- `docs/StayThread_PRD_Requirements_v0.5_American_English.docx`: current Word artifact.
- `docs/StayThread.zip`: original English static interface prototype.
- `reference-ui/`: extracted reference UI.

## Key Deliverables

- `docs/product-plan.md`: product plan, scope, IA, metrics, confirmed decisions.
- `docs/engineering-spec.md`: implementation architecture, domain model, API surface, guardrails, milestones.
- `docs/beta-test-plan.md`: 14-day private beta script and exit criteria.
- `docs/beta-usability-loop.md`: Day 0 / Day 1 / Day 7 / Day 14 research loop and logging template.
- `app/`: current Next.js + Supabase MVP.
- `staythread-mvp/`: legacy dependency-free static prototype for visual/reference comparison.
- `public/mark.svg`, `public/logo.svg`, `public/favicon.svg`, `app/icon.svg`: current brand assets.

## Product Coverage

Current Next.js MVP covers:

- Public Landing with broad StayThread positioning.
- Public 30-question Assessment.
- Seven-dimension scoring.
- Stage, depth, bottleneck, and prescription result.
- Auth/register/login/session routes.
- Prototype cookie session plus Supabase Auth bridge.
- Today dashboard with current beta SEO/Growth task set.
- Count-only SEO work evidence logging.
- Goals and category templates.
- Training view for keyword analysis, backlink screening, content pipeline, and daily review.
- Daily review deterministic coaching.
- Weekly review deterministic summary.
- Settings, profile edit, progress reset, data export, and account delete.
- Logo/favicon assets.

AI generation is still deterministic/template-governed. Future controlled server-side AI should only improve wording, explanation, review tone, and summarization. It must not generate keyword targets, backlink URLs, domains, or outreach recipients for the site-owner beta.

AI interface configuration is provider-neutral. When controlled AI is enabled, the app should read only a server-side endpoint and key, then call that endpoint directly. Do not branch product configuration by a specific provider name.

## Run Next.js App

Install dependencies if needed:

```bash
npm install
```

Create local env:

```bash
cp .env.example .env.local
```

Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://jynkglmuzdounpavahko.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AI_API_ENDPOINT=...
AI_API_KEY=...
AI_API_MODE=chat_completions
```

Key safety:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public / browser-safe, but database access still depends on correct RLS policies.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and high privilege. Never expose it in browser code, screenshots, docs, or git.
- `AI_API_ENDPOINT` and `AI_API_KEY` are the only required AI interface settings when controlled AI is enabled.
- Do not configure AI by provider name. The app should call the endpoint supplied in `AI_API_ENDPOINT`.
- `AI_API_KEY` is server-only. Never store it in `user_profiles.ai_preferences`, browser local storage, screenshots, docs, or git.

AI interface modes:

- `chat_completions`: default Chat Completions-style JSON endpoint.
- `custom_json`: a project-owned adapter endpoint that accepts StayThread task JSON and returns structured JSON.

Start local dev:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Verification

Static checks:

```bash
npm run typecheck
npm run build
```

Minimal HTTP E2E smoke test:

```bash
npm run start -- -p 3010
STAYTHREAD_BASE_URL=http://localhost:3010 npm run test:e2e
```

The smoke test covers:

1. Landing loads.
2. `GET /api/bootstrap` creates/loads prototype session.
3. `POST /api/assessment/submit` stores assessment and returns tasks.
4. `POST /api/tasks/generate` returns current task set.
5. `POST /api/tasks/log` logs count-only SEO evidence and sanitizes private fields.
6. `POST /api/reviews/daily` stores daily review.
7. `POST /api/reviews/weekly` summarizes weekly evidence.

## Main API Routes

- `GET /api/bootstrap`
- `POST /api/assessment/submit`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/session`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/categories`
- `GET /api/goals`
- `POST /api/goals`
- `POST /api/tasks/generate`
- `POST /api/tasks/log`
- `POST /api/reviews/daily`
- `GET /api/reviews/weekly`
- `POST /api/reviews/weekly`
- `GET /api/data/export`
- `DELETE /api/data/progress`
- `GET/PATCH /api/profile`
- `GET/PATCH /api/billing`
- `DELETE /api/account`

## Current Beta Flow

1. Day 0: user opens Landing, completes public Assessment, sees stage/depth/bottlenecks, records site stage and SEO bottleneck, then decides whether to register/save.
2. Day 1: user opens Today, chooses state, fills count-only SEO work evidence, completes one standard/easy/keep-alive task.
3. Days 1-7: user repeats keyword analysis, content pipeline, backlink screening, and daily review actions.
4. Day 7: user generates weekly review and joins interview about task realism, keyword quality, backlink action clarity, and privacy fit.
5. Days 8-14: observe recovery after missed days and whether keep-alive tasks restart the line.
6. Day 14: interview willingness to keep using, pay for continuity system, or pay for Semrush/Ahrefs/Trends and backlink tutorial membership content.

## Current Non-Goals

- No GSC, Ahrefs, Semrush, or Google Trends API integration.
- No automatic keyword generation.
- No automatic backlink building.
- No email automation.
- No ranking, traffic, or revenue promises.
- No broad personal growth beta validation until the site-owner wedge is evaluated.

## Legacy Static Prototype

If needed:

```bash
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173/staythread-mvp/
```
