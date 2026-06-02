# StayThread 工程规格

## 推荐 Production Stack

- App：Next.js App Router + TypeScript。
- Styling：Tailwind CSS，并保留从静态界面原型提取的 token layer。
- Auth / database：Supabase Auth + PostgreSQL。
- AI：server-side structured calls，用于 interpretation、task phrasing、daily review、weekly review。
- Analytics：先用 PostgreSQL event table，beta 后再决定是否接入专门 analytics tool。

当前 `staythread-mvp/` 是 dependency-free static prototype，用来验证 flow、copy、scoring、registration timing 和 UI direction。它不是最终生产架构。

## 未登录到注册流程

默认入口必须是 public Landing，而不是登录后的 Today dashboard。

推荐顺序：

1. Landing 展示产品价值和 `Start free assessment`。
2. Assessment 允许未登录用户完整测试。
3. Result 展示 stage、depth、bottlenecks 和 7-day plan。
4. Result 页提示 `Create account to save`。
5. Auth / Register 完成后进入 Today。
6. 用户仍可使用 `Preview Today page` 预览登录后体验，方便 demo 和测试。

这样可以避免用户在理解价值前被账号系统打断。

## Domain Model

核心实体：

- `user_profiles`：基础背景和可编辑 preferences。
- `assessment_results`：七个 dimension scores、stage、depth、summary。
- `training_modules`：Reading、Movement、Writing、Daily Review。
- `user_training_plans`：用户选择的 module、depth、three-tier tasks。
- `task_categories`：goal templates 和 required profile fields。
- `goals`：用户的 long-term goals。
- `goal_profiles`：category-specific constraints、baseline、preferences。
- `daily_states`：energy、mood、sleep、body、available minutes、distraction urge。
- `daily_tasks`：standard、easy、minimum task set。
- `progress_logs`：completion level、quantitative assets、notes。
- `daily_reviews`：三个 reflection answers 和 coach feedback。
- `weekly_reviews`：asset summary、bottlenecks、next-week plan。

## Assessment Logic

Dimensions：

- Goal clarity。
- Startup ability。
- Consistency。
- Anti-distraction。
- Recovery ability。
- Foundational energy。
- Planning ability。

MVP scoring：

- 使用 1-5 Likert answers。
- 每个 dimension 归一化为 0-100。
- overall score 是所有 dimension scores 的平均值。
- bottlenecks 是最低的两个 dimensions。
- recommended depth 主要由最低 dimension 决定。

Depth mapping：

- 0-39：D1 Recovery。
- 40-59：D2 Stability。
- 60-79：D3 Growth。
- 80-100：D4 Challenge。

Stage mapping：

- L1 Overloaded：goal clarity 或 foundational energy 很低，或 overall 低于 45。
- L2 Starter：startup ability 低，或 overall 低于 60。
- L3 Chain Builder：能行动，但 consistency / recovery 低于 70。
- L4 Stable Builder：overall 70-84，且没有严重 bottleneck。
- L5 Compounder：overall 85+，且没有 dimension 低于 70。

## Prescription Rules

- Goal clarity bottleneck：先收窄到 one primary goal，再生成重执行计划。
- Startup ability bottleneck：优先 five-minute starts 和 minimum tasks。
- Consistency bottleneck：优先 seven-day chain protection。
- Anti-distraction bottleneck：加入 low-stimulation training 和 distraction notes。
- Recovery ability bottleneck：missed day 后快速 downgrade，避免 streak-loss language。
- Foundational energy bottleneck：降低 cognitive 和 physical load。
- Planning ability bottleneck：使用 category templates 和 concrete process metrics。

Adaptive adjustment：

- Standard completion >= 70% over 7 days：轻微提高 challenge。
- Easy completion >= 70%：保持当前 depth。
- Minimum completion >= 70%，但 standard completion 低：保持 D1/D2。
- Two consecutive missed days：自动 downgrade depth。
- Four missed days in seven days：触发 reset 或 reassessment。
- Low energy for three days：减少 task load。

## API Shape

- `POST /api/assessment/start`
- `POST /api/assessment/submit`
- `POST /api/prescriptions/generate`
- `GET /api/categories`
- `POST /api/goals`
- `GET /api/goals`
- `POST /api/tasks/generate`
- `POST /api/tasks/log`
- `POST /api/reviews/daily`
- `GET /api/reviews/daily`
- `POST /api/reviews/weekly`
- `GET /api/reviews/weekly`
- `GET /api/settings/profile`
- `PATCH /api/settings/profile`
- `POST /api/settings/export`
- `DELETE /api/settings/account`

## AI Guardrails

- AI output 必须 concise、concrete、action-oriented。
- AI 必须包含 task level、task description、metric、reason。
- AI 不能诊断、治疗或做 medical claims。
- AI 不能使用 shame-based language。
- AI 不能鼓励 extreme exercise、sleep deprivation 或补偿式惩罚。
- Movement suggestions 遇到 pain、injury、restrictions 时必须 downgrade intensity。
- Structured templates 生成 task skeleton；AI 只优化 wording 和 explanation。

## Release Milestones

M1 Product skeleton：

- Public Landing、Auth/Register、App shell、navigation、style tokens、database schema。

M2 Assessment：

- Questionnaire、scoring、result page、registration prompt、prescription rules。

M3 Training modules：

- Reading、Movement、Writing、Daily Review setup 和 daily tasks。

M4 Goal companion：

- Goal creation、category templates、task generation、progress logging。

M5 Reviews：

- Daily review、weekly review、controlled AI summaries。

M6 Beta readiness：

- Analytics、privacy checks、QA、onboarding copy、seed templates。
