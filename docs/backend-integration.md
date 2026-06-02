# StayThread Backend Integration

## Supabase Project

- Project name: `StayThread`
- Project ref: `jynkglmuzdounpavahko`
- URL: `https://jynkglmuzdounpavahko.supabase.co`
- Applied migrations:
  - `20260529081303_staythread_core_mvp`
  - `staythread_saas_operating_layer`
  - `staythread_auth_ownership_layer`
  - `staythread_trial_and_oauth_layer`

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Required:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://jynkglmuzdounpavahko.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Key Safety Levels

`NEXT_PUBLIC_SUPABASE_ANON_KEY`

- Safety level: public / low privilege.
- It is designed to be used in browser code and can appear in bundled frontend JavaScript.
- It is not a password and cannot by itself bypass Row Level Security.
- It is only safe when RLS policies are correct and enabled on user data tables.
- It should be used for browser-side Supabase Auth and direct client reads/writes that are protected by RLS.

`SUPABASE_SERVICE_ROLE_KEY`

- Safety level: server-only secret / high privilege.
- It bypasses RLS and can read/write data according to project permissions.
- Never expose it to browser code.
- Never prefix it with `NEXT_PUBLIC_`.
- Never commit a real value to git, issue trackers, docs, screenshots, or client logs.
- Store it only in `.env.local`, deployment secret storage, or trusted server runtime configuration.
- Rotate it immediately in Supabase if it is leaked.

Current implementation note:

- The current MVP API routes use `SUPABASE_SERVICE_ROLE_KEY` only in server-side code through `lib/supabase-admin.ts`.
- The React frontend calls local Next.js API routes and does not directly use Supabase keys.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is used server-side by `/api/auth/login` to verify password sign-in through Supabase Auth.
- Authenticated sessions are stored in a signed, httpOnly `staythread_auth` cookie; prototype preview sessions still use `staythread_uid`.
- Google/GitHub OAuth uses the browser Supabase client to obtain a provider session, then posts the Supabase access token to the server-owned app session bridge.
- Supabase dashboard must enable Google and GitHub providers and allow local/production redirect URLs.

## Database Tables

- `user_profiles`
- `assessment_results`
- `task_categories`
- `goals`
- `daily_states`
- `daily_tasks`
- `progress_logs`
- `daily_reviews`
- `weekly_reviews`
- `subscriptions`
- `events`
- `ai_generation_logs`

RLS is enabled for user-owned data. The current MVP API uses a server-side service role and a `staythread_uid` httpOnly cookie as a prototype session. The schema also includes `auth_user_id` for the later Supabase Auth migration.

## API Routes

- `GET /api/bootstrap`: creates/loads prototype profile, seed goals, today tasks, subscription, categories, latest assessment, reviews, and current weekly review.
- `POST /api/auth/register`: creates a Supabase Auth user, binds the current profile to `auth_user_id`, and sets a signed auth session.
- `POST /api/auth/login`: verifies email/password with Supabase Auth and restores the linked workspace.
- `POST /api/auth/session`: verifies a Supabase OAuth access token, binds/restores the profile, and sets a signed app session.
- `POST /api/auth/logout`: clears the signed auth session.
- `GET /api/auth/me`: returns the current signed auth user.
- `GET/PATCH /api/profile`: loads and updates onboarding/profile inputs.
- `GET /api/categories`: returns supported task categories.
- `POST /api/assessment/submit`: scores answers, stores assessment result, returns prescription.
- `GET /api/goals`: loads user goals.
- `POST /api/goals`: creates a category-based goal.
- `POST /api/tasks/generate`: regenerates today's task prescription from the selected goal template.
- `POST /api/tasks/log`: records selected task tier and writes a progress log.
- `POST /api/reviews/daily`: stores daily review answers and deterministic coach feedback.
- `GET/POST /api/reviews/weekly`: loads or generates the current weekly review.
- `GET/PATCH /api/billing`: loads or updates the persisted plan selection and 1/2 month trial control.
- `POST /api/events`: stores product analytics events for the prototype session.
- `GET /api/data/export`: returns a full user-owned JSON export.
- `DELETE /api/data/progress`: clears task/progress/review data while preserving profile and goals.
- `DELETE /api/account`: deletes the prototype profile and cascaded user data, then clears the local session cookie.

## Verification

Completed:

- Supabase migration applied successfully.
- `npm install` completed.
- `npm run typecheck` passed.
- `npm run build` passed.

Known setup requirement:

- Real runtime API verification requires `.env.local` with `SUPABASE_SERVICE_ROLE_KEY`. The Supabase connector can apply migrations, but it does not expose project API keys to the local app.
