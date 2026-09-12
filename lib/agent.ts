import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { agentTools } from "@/lib/tools";

/**
 * 模型可切换（环境变量控制）：
 * - 默认：DeepSeek（OpenAI 兼容协议，用 @langchain/openai 构造）
 *   LLM_BASE_URL / LLM_API_KEY / LLM_MODEL 三个变量可覆盖为任意 OpenAI 兼容服务
 *   （如 OpenAI 官方、硅基流动、Moonshot 等）
 * - 不设 LLM_API_KEY 时用 DEEPSEEK_API_KEY（与 01-chatbot / 02-rag-kb 复用）
 */
export function getAgentModel() {
  const apiKey = process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "缺少模型 Key：请配置 DEEPSEEK_API_KEY（默认）或 LLM_API_KEY（可切换模型）",
    );
  }

  const modelName = process.env.LLM_MODEL || "deepseek-v4-flash";

  return new ChatOpenAI({
    model: modelName,
    temperature: 0.7,
    maxRetries: 2,
    // v1：OpenAI 客户端配置放 configuration
    configuration: {
      apiKey,
      baseURL: process.env.LLM_BASE_URL || "https://api.deepseek.com/v1",
    },
  });
}

/**
 * ReAct Agent（LangGraph v1）：
 * 循环 = LLM 推理 → 选择工具 → 执行 → 结果回传 → 直到给出最终回答或达到上限。
 * prompt 提示模型在需要时使用工具。
 */
export async function createAgent() {
  return createReactAgent({
    llm: getAgentModel(),
    tools: agentTools,
    prompt:
      "你是一个乐于助人的 AI 助手，可以调用工具获取信息或计算。\n" +
      "规则：\n" +
      "1. 需要实时/具体信息（天气、时间）时，先调用对应工具，再基于工具结果回答。\n" +
      "2. 需要数学计算时，用 calculator 工具，并说明计算过程。\n" +
      "3. 回答用中文，简洁准确。\n" +
      "4. 工具返回错误时，如实告知用户，不要编造结果。",
  });
}

/** Agent 系统提示（前端展示用，可选） */
export const AGENT_NAME = "03-agent-flow · ReAct Agent";
