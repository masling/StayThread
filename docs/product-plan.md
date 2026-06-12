# StayThread 产品规划

## 产品意图

StayThread 是一个面向长期行动的 AI-guided companion。它服务于“知道自己有重要目标，但很难持续推进 slow-feedback work”的用户。产品先评估用户当前的 action profile，再给出合适的 training depth，并把长期目标拆成每天可以执行的 standard、easy、keep-alive 三档任务；内部数据结构仍可继续使用 `minimum` 作为最小任务字段名。

MVP 要验证的核心判断是：用户不需要每天完美，产品应该帮助用户在低能量、忙碌或分心时保持 continuity，而不是因为一天没做好就重新开始。

## MVP Thesis

如果个人独立站长完成一个短 Assessment，得到清晰的 Long-Term Action Profile，并收到围绕关键词分析/发现、SEO 外链工作的 SEO/Growth daily tasks，那么用户更可能在 7 天内至少完成 5 天有效增长行动。

## 首批 Beta 用户

优先用户：

- 初级到中级出海个人独立站长：正在做英文独立站、内容站、Affiliate/SEO 小站、niche site 或个人 SaaS 站点。
- 关键词研究断断续续的站长：知道 SEO 重要，但每天不知道该找、筛、记录哪些关键词。
- 外链推广推进困难的站长：外链反馈慢、拒绝率高、任务容易中断。
- 内容资产积累不足的站长：关键词、内容选题、页面计划和外链机会没有形成稳定 process assets。
- 个人 SaaS 站长：只要 SEO/Growth 仍由个人推进，而不是成熟增长团队负责，也属于首批目标用户。

次优先用户：

- 正在做 SEO/Growth 的 independent builders。
- 有英文内容站增长目标的 writers / creators。

首轮 private beta 控制在 5 到 10 人，建议 6 到 8 名为初级/中级出海个人独立站长，其余 1 到 2 名可作为 SEO/Growth 相邻用户对照。周期 14 天，在 Day 0、Day 7、Day 14 做访谈。

## Positioning

StayThread 不是普通 to-do list、habit tracker、blocker、dopamine detox app，也不是自由聊天型 motivational chatbot。它是一个结构化 long-term action system：用 Assessment、constraints、category templates 和 completion history 生成可执行的 daily actions。

## 产品原则

- Never break the chain：每天任务必须有 standard、easy、keep-alive 三档；内部仍可用 `minimum` 表示 keep-alive 层级。
- Assessment must lead to action：分数必须生成 stage、depth、training focus 和 7-day plan。
- Recovery over punishment：missed day 应触发 recovery path，而不是羞耻或惩罚。
- Personalization over generic advice：只收集会影响所选 module 或 category 的信息。
- Process feedback over instant reward：展示已完成的工作量和过程证据，例如打开工具、分析站点数、分析词根数、分析关键词数、可用关键词数量、筛选外链机会数，而不是要求用户保存真实关键词或真实外链地址。
- AI as structured assistant：AI 负责解释、表达和总结；核心规则和 templates 保持 deterministic，方便测试。
- AI interface as endpoint/key：AI 配置不按供应商区分，不要求用户选择具体供应商；服务端只需要通用接口地址和 key，可选接口模式为 Chat-completions JSON 或项目自有 custom JSON adapter。

## MVP 信息架构

- Landing：未登录入口，解释产品价值，引导用户先测试 Assessment。
- Assessment：公开可测试的 30 题 long-term action profile。
- Result：展示 stage、bottlenecks、recommended depth、7-day starting plan，并引导注册保存。
- Auth / Register：在用户看到评估价值后再要求创建账号。
- Today：登录后每日首页，包含 daily state、one main goal、training task、category task、daily review task 和 three-tier tasks。
- Goals：SEO/Growth 主模板、category templates、active goals、process assets、task history。
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
7. 系统生成 standard、easy、keep-alive tasks。
8. 用户记录 daily state 和 completion level。
9. 系统给出 concise daily review。
10. Weekly review 总结 completed days、assets、bottlenecks 和 next-week depth。

## P0 Scope

- 未登录 Landing、公开 Assessment、Result-to-Register flow。
- Assessment questions、scoring、stage logic、prescription logic。
- Basic profile 和 constraint capture。
- Foundational modules：Reading、Movement、Writing、Daily Review。
- SEO/Growth template：Semrush、Ahrefs、Google Trends 等工具中的关键词分析/发现工作量，以及 SEO 外链机会筛选工作量。
- Three-tier daily tasks：standard、easy、keep-alive。
- Daily state 和 completion logging。
- Basic dashboard：chain status 和 asset accumulation。
- Daily review form 和 deterministic coach feedback。
- Settings / privacy screen：可编辑 profile data。

## P1 Scope

- Controlled AI prompts 生成 daily review 和 weekly review copy；AI 只评价工作数据和鼓励持续执行，不输出具体关键词或外链对象。
- 会员教程服务：围绕 Semrush、Ahrefs、Google Trends 的关键词发现流程和外链筛选流程提供教程内容。
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
- Keep-alive task completion rate。
- Seven-day chain rate：7 天内至少 5 天完成一个 valid action。
- Recovery rate：missed day 后 48 小时内返回。
- Weekly review completion。
- SEO/Growth work evidence accumulated：tools opened、competitor/site count analyzed、seed terms analyzed、keywords analyzed、usable keyword count found、backlink channels screened、normal-site prospects counted、outreach attempts or follow-ups logged。
- 14-day beta retention 和 interview sentiment。

## Confirmed Product Decisions

- 首批 Beta 不验证 broad personal growth 市场，先验证初级到中级出海个人独立站长的 SEO/Growth 场景；个人 SaaS 站长也包含在内，除非已经是成熟团队化增长。
- 用户端使用 `keep-alive task`，内部字段和事件可以继续使用 `minimum`。
- `SEO/Growth` 是首批 Beta 的 P0 主模板，围绕关键词分析/发现和 SEO 外链工作验证。
- 站长阶段规则：刚开始的站长优先使用关键词发现；已经建站但内容少、流量少的站长需要加入 SEO 外链工作。
- 关键词任务主要引导用户使用 Semrush、Ahrefs、Google Trends 等工具，记录是否打开工具、分析了几个网站/词根/关键词、最终找到几个可用关键词。
- 有效关键词默认不要求用户在系统保存真实词；可记录编号、预估搜索量、Google 结果总数、首页竞争对手数量等可选元数据。
- 有效外链机会默认不要求用户在系统保存真实 URL；可记录编号、是否有申请通道、是否可能通过、是否为正常内容网站、是否排除垃圾外链站。
- AI 自由度保持低：AI 不输出关键词和外链对象，只对工作数据做鼓励式评价、复盘和持续执行建议。
- AI 接口配置保持供应商中立：只配置 `AI_API_ENDPOINT` 和 `AI_API_KEY`，key 只留在服务端，不进入用户 profile、浏览器状态或截图。
- 付费意愿需要在 Day 14 访谈中确认，并收集用户对会员教程服务的反馈。
- 隐私边界：用户的真实关键词和外链地址通常是私有成果和财富，平台默认只做步骤提醒、工作量记录和持续行动反馈。
- 首轮 beta 保持 14 天；是否扩展到 30 天在第一批 Day 14 复盘后决定。
