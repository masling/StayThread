# StayThread

这个工作区包含 StayThread 的 PRD、原始静态界面参考、产品规划文档，以及一个 dependency-free MVP prototype。

## Source Materials

- `StayThread_PRD_Requirements_v0.4_American_English.docx`：原始产品需求文档。
- `StayThread.zip`：原始 English static interface prototype。
- `reference-ui/`：从 `StayThread.zip` 解压出的参考界面。

## Deliverables

- `docs/product-plan.md`：MVP 产品规划、scope、IA、metrics、open decisions。
- `docs/engineering-spec.md`：工程规格、production stack、domain model、scoring logic、API shape、AI guardrails。
- `docs/beta-test-plan.md`：14-day private beta 测试计划。
- `staythread-mvp/`：可运行的静态 MVP prototype。

## Run The Prototype

当前项目已经有两套入口：

- `staythread-mvp/`：上一版 dependency-free static prototype，方便离线查看。
- `app/`：新的 Next.js + Supabase 前后端对接版本。

### Run Next.js App

先复制环境变量模板：

```bash
cp .env.example .env.local
```

然后在 `.env.local` 里填入 Supabase keys：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://jynkglmuzdounpavahko.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Key safety:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是 public / low privilege key，可以在浏览器端出现；真正的数据安全依赖 Supabase RLS policies。
- `SUPABASE_SERVICE_ROLE_KEY` 是 server-only high privilege secret，会绕过 RLS；只能放在 `.env.local` 或部署平台 secret 里，不能进入前端、不能提交 git、不能分享截图。

启动 Next.js：

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

### Run Static Prototype

如需打开旧版静态 prototype：

```bash
python3 -m http.server 4173
```

然后打开：

```text
http://localhost:4173/staythread-mvp/
```

## Backend Integration

已对接 Supabase 项目：

```text
https://jynkglmuzdounpavahko.supabase.co
```

已应用 migration：

```text
20260529081303_staythread_core_mvp
```

Next.js API routes：

- `GET /api/bootstrap`
- `POST /api/assessment/submit`
- `GET /api/goals`
- `POST /api/goals`
- `POST /api/tasks/log`
- `POST /api/reviews/daily`

这些 routes 使用 `SUPABASE_SERVICE_ROLE_KEY` 在 server side 写入 Supabase，并通过 `staythread_uid` httpOnly cookie 保存 prototype user session。

## Prototype Flow

默认入口现在是未登录体验：

1. Landing：介绍 StayThread，并引导 `Start free assessment`。
2. Assessment：未登录用户可以完整测试 30 题评估。
3. Result：展示 stage、depth、bottlenecks、7-day plan。
4. Auth：提示用户创建账号保存结果。
5. Today：注册或预览后进入登录后 dashboard。

## Prototype Coverage

当前 Next.js app 覆盖：

- Public Landing 和 Auth flow。
- 30-question Assessment。
- Seven-dimension scoring。
- Stage、Depth、Bottleneck calculation。
- Today page with daily state and three-tier tasks。
- Category goal companion。
- Foundational training modules。
- Daily review feedback。
- Settings / privacy placeholders。

现在已经迁移到 Next.js、Supabase/PostgreSQL。AI generation 仍是 deterministic placeholder，下一步可接 controlled server-side AI generation。

## Images

交付物不依赖临时 QA screenshots。若需要视觉验收图，请查看 `docs/assets/` 中重新生成的稳定截图。
