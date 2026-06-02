# StayThread 产品规划

## 产品意图

StayThread 是一个面向长期行动的 AI-guided companion。它服务于“知道自己有重要目标，但很难持续推进 slow-feedback work”的用户。产品先评估用户当前的 action profile，再给出合适的 training depth，并把长期目标拆成每天可以执行的 standard、easy、minimum 三档任务。

MVP 要验证的核心判断是：用户不需要每天完美，产品应该帮助用户在低能量、忙碌或分心时保持 continuity，而不是因为一天没做好就重新开始。

## MVP Thesis

如果用户完成一个短 Assessment，得到清晰的 Long-Term Action Profile，选择一个 foundational training module，并收到 category-specific daily tasks，那么用户更可能在 7 天内至少完成 5 天有效行动。

## 首批 Beta 用户

优先用户：

- Independent builders 和 site owners：正在做 product、SEO、writing、side project。
- Readers 和 knowledge workers：想重建低刺激阅读和输出能力。
- 正在恢复 gentle movement habit 的用户。

次优先用户：

- Writers / creators：需要稳定创作和发布节奏。
- Learners：需要简单的每日学习结构。

首轮 private beta 建议控制在 5 到 10 人，周期 14 天，在 Day 1、Day 7、Day 14 做访谈。

## Positioning

StayThread 不是普通 to-do list、habit tracker、blocker、dopamine detox app，也不是自由聊天型 motivational chatbot。它是一个结构化 long-term action system：用 Assessment、constraints、category templates 和 completion history 生成可执行的 daily actions。

## 产品原则

- Never break the chain：每天任务必须有 standard、easy、minimum 三档。
- Assessment must lead to action：分数必须生成 stage、depth、training focus 和 7-day plan。
- Recovery over punishment：missed day 应触发 recovery path，而不是羞耻或惩罚。
- Personalization over generic advice：只收集会影响所选 module 或 category 的信息。
- Process feedback over instant reward：展示 pages、notes、words、walks、keywords、shipped units 等 process assets。
- AI as structured assistant：AI 负责解释、表达和总结；核心规则和 templates 保持 deterministic，方便测试。

## MVP 信息架构

- Landing：未登录入口，解释产品价值，引导用户先测试 Assessment。
- Assessment：公开可测试的 30 题 long-term action profile。
- Result：展示 stage、bottlenecks、recommended depth、7-day starting plan，并引导注册保存。
- Auth / Register：在用户看到评估价值后再要求创建账号。
- Today：登录后每日首页，包含 daily state、one main goal、training task、category task、daily review task 和 three-tier tasks。
- Goals：category templates、active goals、process assets、task history。
- Training：Reading、Movement、Writing、Daily Review modules。
- Review：daily three-question reflection 和 weekly summary。
- Settings：privacy controls、profile data、export/delete、AI preferences。

## MVP 核心流程

1. 用户从 Landing 进入公开 Assessment。
2. 用户回答七个 dimensions 的 Likert questions。
3. 系统计算 dimension scores、stage、recommended depth 和 bottlenecks。
4. 结果页解释处方，并提示用户注册保存。
5. 用户注册或登录后进入 Today。
6. 用户选择一个 foundational module，并创建一个 category-based goal。
7. 系统生成 standard、easy、minimum tasks。
8. 用户记录 daily state 和 completion level。
9. 系统给出 concise daily review。
10. Weekly review 总结 completed days、assets、bottlenecks 和 next-week depth。

## P0 Scope

- 未登录 Landing、公开 Assessment、Result-to-Register flow。
- Assessment questions、scoring、stage logic、prescription logic。
- Basic profile 和 constraint capture。
- Foundational modules：Reading、Movement、Writing、Daily Review。
- Category templates：Project Building、SEO/Growth、Writing、Learning、Movement。
- Three-tier daily tasks。
- Daily state 和 completion logging。
- Basic dashboard：chain status 和 asset accumulation。
- Daily review form 和 deterministic coach feedback。
- Settings / privacy screen：可编辑 profile data。

## P1 Scope

- Controlled AI prompts 生成 daily review 和 weekly review copy。
- 更完整的 category templates 和 task generation rules。
- Weekly review trends 和 bottleneck interpretation。
- 基于 recent completion history 的 profile-based adaptation。
- Basic analytics events 和 cohort dashboard。

## P2 Scope

- Chrome extension distraction recovery。
- Entertainment boundary features。
- Google Search Console、GitHub、Docs/Notion、wearable integrations。
- Social accountability、groups、commitment products。
- Native mobile app。

## Success Metrics

- Assessment completion rate。
- Result-to-register conversion。
- Prescription acceptance rate。
- Day-1 task completion。
- Minimum task completion rate。
- Seven-day chain rate：7 天内至少 5 天完成一个 valid action。
- Recovery rate：missed day 后 48 小时内返回。
- Weekly review completion。
- 14-day beta retention 和 interview sentiment。

## Open Product Decisions

- Public MVP 是优先服务 independent builders，还是面向更广泛 personal growth users。
- 用户端是否把 `minimum` 改名为 `keep-alive`。
- `SEO/Growth` 是作为公开 template，还是先用于内部验证。
- deterministic templates 验证前，AI generation 的自由度应有多大。
- 首轮 beta 保持 14 天，还是在第一批后扩展到 30 天。
