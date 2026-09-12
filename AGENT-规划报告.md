# 03-agent-flow · 引入 LangChain.js 的规划报告

> 日期：2026-08-25  
> 作者：孙健（AI 应用前端方向）  
> 状态：**待你确认后执行**  
> 关联：`学习计划.md` 第三阶段（第 5~6 周）· 技术栈纪律的主动修订

---

## 一、结论（先看这段）

**建议：引入 LangChain.js（v1）+ LangGraph.js 作为 Agent 编排层，保留 Vercel AI SDK 作为前后端流式通道，React Flow 做步骤可视化。**

这不是"推翻原计划"，而是把原计划里"不引入 LangChain"的约束升级为"**用 LangChain 的 Agent 能力，但流式与 UI 仍走 AI SDK**"——两者是互补关系，官方也提供了桥接方案。

| 层 | 技术 | 职责 |
|----|------|------|
| **Agent 编排** | LangChain.js v1 + LangGraph.js | 工具注册、多步循环、状态机、终止条件 |
| **流式通道** | Vercel AI SDK（`LangChainAdapter`） | SSE 回推、前端 `useChat` 消费、停止/重试 |
| **可视化** | React Flow（`@xyflow/react`） | Agent 步骤中间态展示（只读呈现，不参与执行） |
| **模型** | `@langchain/deepseek` 或 OpenAI 兼容 | Tool Calling 推理 |

---

## 二、为什么现在可以引入（时机成熟）

### 2.1 LangChain.js 已到 v1（不再是"玩具框架"）

- `@langchain/core` 1.0.0 已发布（[版本公告](https://newreleases.io/project/github/langchain-ai/langchainjs/release/@langchain%2Fcore==1.0.0)），API 稳定
- 中文生态成熟：[LangChain.js 中文手册](https://juejin.cn/post/7659331189153759282) / [LangChain 中文文档](https://js.langchain.ac.cn/docs/versions/release_policy/)
- 官方提供 [Next.js 模板（langchain-nextjs-template）](https://deepwiki.com/langchain-ai/langchain-nextjs-template/3.3-api-routes-architecture)，有现成架构参考

### 2.2 官方桥接：AI SDK ↔ LangChain 平滑共存

Vercel AI SDK 官方提供 **LangChain 适配器**（[官方文档](https://github.com/vercel/ai/blob/391124ef4144593fa6c975e844629768ab0993cf/docs/pages/docs/guides/providers/langchain.mdx)）与 [next-langchain 官方示例](https://github.com/vercel/ai/blob/83877a1e/examples/next-langchain/README.md)：

```ts
// LangChain Agent 的输出流 → AI SDK 的 UI Message Stream（前端 useChat 直接消费）
import { LangChainAdapter } from "ai";

return LangChainAdapter.toDataStreamResponse(agent.stream(...));
```

这意味着：**前端体验（流式/停止/重试）完全复用你前两个项目已熟练的 `useChat`，Agent 内部逻辑交给 LangChain**——不冲突、不重学 UI 层。

### 2.3 面试价值显著提升（你的核心诉求）

| 维度 | 不用 LangChain | 用 LangChain + LangGraph |
|------|----------------|--------------------------|
| 项目含金量 | 手写工具调用循环 | 能讲「Agent 编排框架」的取舍与设计 |
| 面试广度 | 只会 AI SDK | 能聊 LangGraph 状态机、ReAct Agent、LangSmith 可观测 |
| 岗位匹配 | 前端视角 | 覆盖「AI 应用工程师」岗位的常见要求 |
| 风险 | 无 | 需多学一层；但你有前两项目基础，成本可控 |

---

## 三、技术选型细节

### 3.1 依赖清单（相比原计划新增）

```json
{
  "dependencies": {
    "@langchain/core": "^1.0.0",
    "langchain": "^1.0.0",
    "@langchain/langgraph": "^1.0.0",
    "@langchain/deepseek": "^0.2.0",
    "ai": "^7.0.42",
    "@ai-sdk/react": "^4.0.76",
    "@xyflow/react": "^12.7.2"
  }
}
```

> 备注：`@langchain/deepseek` 是否提供取决于 DeepSeek 官方/社区封装；若没有，用 `@langchain/openai`（DeepSeek 兼容 OpenAI 协议）即可，成本相同。

### 3.2 架构图（面试可画）

```text
浏览器
  │ useChat（前端流式消费，停止/重试）
  ▼
POST /api/chat  ──►  LangChainAdapter.toDataStreamResponse
                         │
                         ▼
                LangGraph Agent（createAgent / 状态图）
                  │  ReAct 循环：LLM 推理 → 选工具 → 执行 → 回传
                  ├─ 工具：getWeather / searchDocs / calculator...
                  ├─ 终止条件：回答完成 / maxSteps / 用户打断
                  └─ 每一步 emit 中间态（步骤名、输入、输出、耗时）
                         │
                         ▼
                React Flow 面板（实时渲染步骤节点 + 连线）
```

### 3.3 与现有技术栈的衔接点（复用经验）

| 现有资产 | 在 03-agent-flow 的用法 |
|----------|------------------------|
| `01-chatbot` 的流式经验 | `useChat` + 停止 + Markdown 渲染照搬 |
| `02-rag-kb` 的检索经验 | 可把「知识库检索」封装成 Agent 的一个 **tool**（复用 embed + pgvector 逻辑） |
| Docker/部署经验 | 与 RAG 一样补 Dockerfile + compose（Node 22 + standalone） |
| 面试话术积累 | ChatBot（流式）→ RAG（检索）→ Agent（编排），形成完整递进故事 |

---

## 四、实现计划（分两刀，与学习计划周次对齐）

### 第 1 刀（Day A）：最小 Tool Calling Agent + 流式（半天~1天）

**验收：** 浏览器提问"北京今天天气怎么样？顺便算一下 15% 的小费是多少"→ 模型依次调用 `getWeather` + `calculator` 两个工具 → 流式回答；前端能看到工具调用过程。

- [ ] 建 `lib/agent.ts`：LangGraph `createAgent`（模型 + 2~3 个工具）
- [ ] 工具：`getWeather`（mock）、`calculator`（纯函数）、`getTime`（纯函数）
- [ ] `/api/chat`：Agent 流 → `LangChainAdapter.toDataStreamResponse`
- [ ] 前端：`useChat` + 工具调用状态卡片（工具名/入参/出参/耗时）

### 第 2 刀（Day B）：LangGraph 状态机 + React Flow 可视化（1~2 天）

**验收：** Agent 执行时，React Flow 面板实时出现"节点：LLM 推理 → 工具调用 → 执行结果 → 最终回答"，边生成边连线；支持中止。

- [ ] 自定义 LangGraph 状态图（节点：agent → tools → 条件边 → 结束）
- [ ] 每步 emit 结构化中间态（步骤 id / 类型 / 输入 / 输出 / 时间戳）
- [ ] React Flow 渲染步骤节点 + 动态连线 + 状态色（进行中/完成/失败）
- [ ] 终止：maxSteps 上限 + 前端 stop 贯通到 Agent 取消
- [ ] 错误展示：工具异常 → 节点标红 → Agent 可重试或放弃

### 第 3 刀（Day C，可选加分）：接 RAG tool + 收尾（半天）

- [ ] 把 02-rag-kb 的检索封装成 `searchKnowledgeBase` 工具（复用 pgvector）
- [ ] 补 README（选型/架构/部署/演示）+ 面试要点文档
- [ ] Docker 部署资产（与 RAG 对齐）

---

## 五、风险与取舍（面试会问，先想清楚）

| 风险 | 应对 |
|------|------|
| **过度封装**：面试官问"为什么不用手写循环" | 答：手写也能跑，但 LangGraph 提供状态图 + 条件边 + 重试 + 可观测，项目规模增长后是「工程化」而非「玩具」；且 UI 层仍是 AI SDK，没被绑架 |
| **学习成本** | 你有前两项目基础，重点只学 `createAgent`/`createReactAgent` + 状态图，不碰 Chains 旧 API |
| **依赖体积/构建** | LangChain 按需 import（`langchain/tools` 等），Next.js standalone 构建已验证可行；必要时用 `@langchain/core` 精简入口 |
| **DeepSeek 工具调用兼容性** | DeepSeek 支持 function calling；若个别版本不稳，备选 `@langchain/openai`（协议兼容） |
| **v1 刚发布 API 变动** | 锁定 `^1.0.0` 版本；以官方文档为准；本项目本身就是"跟版本"的练习 |

**明确不做（防止范围膨胀）：**
- 不引入 LangSmith 做完整可观测平台（面试可提，不接）
- 不做多 Agent 复杂编排（先用单 Agent + 多工具）
- 不重写已有 UI 层为 LangChain 组件（`useChat` 保持）

---

## 六、对学习计划.md 的修订建议

原文：
> **依赖纪律**：默认不引入 LangChain 等计划外框架；需要扩展时先改本计划再动手。

修订为：
> **依赖纪律**：第三阶段起引入 LangChain.js v1 + LangGraph.js 作为 Agent 编排层（理由见 `03-agent-flow/AGENT-规划报告.md`）；流式与 UI 仍走 Vercel AI SDK；其余计划外框架仍需先改本计划再动手。

---

## 七、待你确认的问题

1. **是否同意引入 LangChain.js v1 + LangGraph.js？**（本报告默认你已同意，待确认后执行）
2. **第一刀的工具场景**：用「天气 + 计算器 + 时间」这种无外部依赖的 mock 工具，还是直接接「RAG 知识库检索」作为第一个工具？（影响第一刀工作量：前者半天，后者需先联 pgvector）
3. **是否要 Docker 部署资产**：与 RAG 对齐做（推荐，面试部署故事完整），还是本地可跑即可？
4. **模型**：DeepSeek 优先（与现有 Key 复用），是否需要同时支持模型切换（环境变量配置）？

---

## 参考链接

- [Vercel AI SDK × LangChain 官方适配器文档](https://github.com/vercel/ai/blob/391124ef4144593fa6c975e844629768ab0993cf/docs/pages/docs/guides/providers/langchain.mdx)
- [next-langchain 官方示例（AI SDK + LangChain + Next.js）](https://github.com/vercel/ai/blob/83877a1e/examples/next-langchain/README.md)
- [langchain-nextjs 社区模板（LangChain.js + LangGraph.js + Next.js）](https://github.com/bglara/langchain-nextjs)
- [langchain-ai/langchain-nextjs-template 官方架构参考](https://deepwiki.com/langchain-ai/langchain-nextjs-template/3.3-api-routes-architecture)
- [LangChain.js 中文文档](https://js.langchain.ac.cn/docs/versions/release_policy/)
- [LangChain.js 中文开发手册（掘金）](https://juejin.cn/post/7659331189153759282)
- [LangChain vs Vercel AI SDK 对比（2026）](https://tooldirectory.ai/compare/langchain-vs-vercel-ai-sdk)
