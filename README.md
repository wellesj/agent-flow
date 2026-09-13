# 03-agent-flow · Tool Calling Agent（LangChain + LangGraph + AI SDK + React Flow）

> 第三阶段作品：带 **Tool Calling 的多步 Agent**，用 **React Flow** 实时展示执行步骤。  
> **✅ 已上线：http://47.101.37.239:8082**（阿里云轻量服务器 + Docker Compose：web + nginx）  
> 编排层：**LangChain.js v1 + LangGraph.js**（`createReactAgent`）  
> 流式通道：**Vercel AI SDK**（`@ai-sdk/langchain` 的 `toUIMessageStream` 桥接）  
> 可视化：**React Flow**（`@xyflow/react`）  
> 模型：**可切换**（DeepSeek 默认，环境变量切任意 OpenAI 兼容服务）

## 本地启动

```powershell
cd D:\AI\AI应用前端向\03-agent-flow
npm install
copy .env.example .env.local
# 编辑 .env.local，填 DEEPSEEK_API_KEY（复用 01-chatbot 的 Key）
npm run dev
```

打开 http://localhost:3000

**试试这些提问：**
- 「北京今天天气怎么样？」→ 调用 `getWeather`
- 「算一下 (12+34)*5-8/2」→ 调用 `calculator`
- 「现在东京几点？」→ 调用 `getTime`
- 「北京天气怎么样？东京时间呢？」→ 连续调用两个工具

## 链路（面试可画）

```text
浏览器 useChat
  → POST /api/chat
    → toBaseMessages（AI SDK UIMessage → LangChain BaseMessage）
    → createReactAgent（LangGraph ReAct：推理 → 选工具 → 执行 → 回传 → 循环）
    → agent.stream（values + messages 双模式）
    → toUIMessageStream（LangChain 流 → AI SDK UI Message Stream）
  ← SSE 流式回推（text-delta + tool-input/output 中间态）
前端：message.parts 里 tool 类型 part → React Flow 节点/连线实时渲染
```

## 模型切换（环境变量）

| 变量 | 默认 | 说明 |
|------|------|------|
| `DEEPSEEK_API_KEY` | 必填 | DeepSeek Key（默认模型） |
| `LLM_BASE_URL` | 空 | 设置后切换到其他 OpenAI 兼容服务 |
| `LLM_API_KEY` | 空 | 对应 Key |
| `LLM_MODEL` | 空 | 模型名（如 gpt-4o-mini） |

实现见 `lib/agent.ts`；切换只改环境变量，代码不变。

## 目录

| 路径 | 说明 |
|------|------|
| `lib/tools.ts` | 3 个 mock 工具（getWeather / calculator / getTime），zod 定义入参 |
| `lib/agent.ts` | `createReactAgent` + 模型工厂（可切换） |
| `app/api/chat/route.ts` | LangChain 流 → AI SDK 桥接（`toUIMessageStream`） |
| `components/AgentFlow.tsx` | React Flow 步骤可视化（工具节点/结果节点/状态徽标） |
| `components/AssistantMarkdown.tsx` | Markdown 安全渲染（复用 01-chatbot） |
| `app/page.tsx` | 聊天 UI + 工具调用展示 + 步骤面板 |
| `Dockerfile` / `docker-compose.yml` / `nginx/` / `deploy/` | 生产部署资产 |
| `AGENT-规划报告.md` | 引入 LangChain.js 的规划与取舍 |

## 部署

见 `deploy/README.md`：Docker Compose（web + nginx）一条命令上线，SSE 关 `proxy_buffering`。

## 技术取舍（面试要点）

- **为什么 LangChain/LangGraph 而不是手写循环？** 状态图 + 条件边 + 工具节点是工程化编排；UI 层仍用 AI SDK，未被绑架（详见 `AGENT-规划报告.md`）
- **为什么 LangChain 而不是纯 AI SDK tools？** AI SDK 的 tool calling 适合单轮工具调用；LangGraph 的 ReAct 循环 + 状态管理适合多步 Agent，且可观测
- **中间态怎么展示？** `tool-input` / `tool-output` 是 AI SDK UI Message Stream 的标准 part，前端从 `message.parts` 提取渲染，无需自造协议
