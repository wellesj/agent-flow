import { createUIMessageStreamResponse } from "ai";
import { toUIMessageStream, toBaseMessages } from "@ai-sdk/langchain";
import { createAgent } from "@/lib/agent";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (!process.env.DEEPSEEK_API_KEY && !process.env.LLM_API_KEY) {
    return Response.json(
      { error: "缺少模型 Key：请在 .env.local 配置 DEEPSEEK_API_KEY 或 LLM_API_KEY" },
      { status: 500 },
    );
  }

  const { messages } = await req.json();

  // AI SDK UIMessage → LangChain BaseMessage
  const langchainMessages = await toBaseMessages(messages);

  // 创建 ReAct Agent（每次请求新建，无状态，便于演示/部署）
  const agent = await createAgent();

  // LangGraph stream：values（完整状态）+ messages（token 流）
  // 参考 @ai-sdk/langchain 官方示例
  const graphStream = await agent.stream(
    { messages: langchainMessages },
    { streamMode: ["values", "messages"] },
  );

  const stream = toUIMessageStream(graphStream, {
    onError: (error) => {
      console.error("[agent] stream error:", error.message);
    },
    onAbort: () => {
      console.log("[agent] stream aborted by client");
    },
  });

  return createUIMessageStreamResponse({ stream });
}
