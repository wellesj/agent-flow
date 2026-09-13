"use client";

import { useChat } from "@ai-sdk/react";
import { useMemo, useState } from "react";
import { AgentFlow } from "@/components/AgentFlow";
import { AssistantMarkdown } from "@/components/AssistantMarkdown";

export default function AgentPage() {
  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    clearError,
  } = useChat();

  const [input, setInput] = useState("");

  const isStreaming = status === "submitted" || status === "streaming";

  // 取最后一条助手消息的 parts 给 AgentFlow 展示工具步骤
  const lastAssistantParts = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return messages[i].parts as { type: string; [key: string]: unknown }[];
      }
    }
    return [];
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    void sendMessage({ text });
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 pb-16">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500">
          03-agent-flow · LangChain.js v1 + LangGraph + AI SDK + React Flow
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Tool Calling Agent（可切换模型）
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          试试问：「北京今天天气怎么样？顺便算一下 (12+34)*5-8/2」或「现在东京几点？」
          —— Agent 会依次调用工具，并在下方展示每个步骤。
        </p>
      </header>

      {/* Agent 步骤可视化（React Flow） */}
      <section className="space-y-2" aria-labelledby="flow-heading">
        <h2
          id="flow-heading"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Agent 执行步骤（React Flow）
        </h2>
        <AgentFlow parts={lastAssistantParts} />
      </section>

      {/* 消息列表 */}
      <div className="flex flex-col gap-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            输入一句话，Agent 会自动判断是否需要调用工具。
          </p>
        )}

        {messages.map((m) => {
          const isUser = m.role === "user";
          const text = (m.parts ?? [])
            .filter((p) => p.type === "text")
            .map((p) => (p as { text?: string }).text ?? "")
            .join("");
          if (!text) return null;

          return (
            <div
              key={m.id}
              className={
                isUser
                  ? "self-end max-w-[85%] rounded-xl bg-zinc-100 px-3 py-2 text-sm leading-6 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "self-start max-w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
              }
            >
              <AssistantMarkdown text={text} />
            </div>
          );
        })}
      </div>

      {/* 错误 */}
      {error && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <span className="flex-1">{error.message || String(error)}</span>
          <button
            type="button"
            onClick={() => clearError()}
            className="text-xs font-medium underline underline-offset-2"
          >
            清除
          </button>
        </div>
      )}

      {/* 输入区 */}
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={2}
          placeholder="例如：北京今天天气怎么样？顺便算一下 (12+34)*5-8/2"
          className="min-h-11 w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={() => stop()}
            className="min-h-11 shrink-0 rounded-lg bg-red-600 px-4 text-sm font-medium text-white enabled:active:opacity-80 dark:bg-red-500 dark:text-zinc-950"
          >
            停止
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            className="min-h-11 shrink-0 rounded-lg bg-sky-700 px-4 text-sm font-medium text-white enabled:active:opacity-80 disabled:opacity-40 dark:bg-sky-500 dark:text-zinc-950"
          >
            发送
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        状态：{status} {isStreaming ? "· 生成中可点停止" : ""}
      </p>
    </main>
  );
}
