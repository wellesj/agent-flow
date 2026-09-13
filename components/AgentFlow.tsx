"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";

/**
 * 从 AI SDK 消息的 parts 里提取工具调用步骤（tool 类型的 part）。
 * 每个工具调用 → React Flow 的一个节点组：LLM 决策 → 工具调用 → 执行结果。
 */

type ToolPart = {
  type: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  state?: string;
  title?: string;
  errorText?: string;
};

type ExtractedStep = {
  id: string;
  toolName: string;
  input: unknown;
  output: unknown;
  state: string; // input-streaming / input-available / output-available / error
  title: string;
};

function extractSteps(parts: { type: string; [key: string]: unknown }[]): ExtractedStep[] {
  const steps: ExtractedStep[] = [];
  const byId = new Map<string, ExtractedStep>();

  for (const part of parts) {
    const p = part as ToolPart;
    if (!p.type?.startsWith("tool-") || !p.toolCallId) continue;

    let step = byId.get(p.toolCallId);
    if (!step) {
      step = {
        id: p.toolCallId,
        toolName: p.toolName ?? "未知工具",
        input: undefined,
        output: undefined,
        state: "input-streaming",
        title: p.toolName ?? "工具调用",
      };
      byId.set(p.toolCallId, step);
      steps.push(step);
    }

    if (p.input !== undefined) {
      step.input = p.input;
      if (step.state === "input-streaming") step.state = "input-available";
    }
    if (p.output !== undefined) {
      step.output = p.output;
      step.state = "output-available";
    }
    if (p.state === "output-error" || p.errorText) {
      step.state = "error";
    }
  }

  return steps;
}

function parseToolOutput(output: unknown): string {
  if (typeof output === "string") {
    try {
      const parsed = JSON.parse(output);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return output;
    }
  }
  return JSON.stringify(output ?? "", null, 2);
}

export function AgentFlow({ parts }: { parts: { type: string; [key: string]: unknown }[] }) {
  const { nodes, edges } = useMemo(() => {
    const steps = extractSteps(parts);
    if (steps.length === 0) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // 起点：用户提问（占位）
    nodes.push({
      id: "start",
      position: { x: 0, y: 20 },
      data: { label: "用户提问" },
      type: "input",
    });

    steps.forEach((step, i) => {
      const baseY = 20 + i * 220;
      const stateColor =
        step.state === "output-available"
          ? "bg-emerald-600"
          : step.state === "error"
            ? "bg-red-600"
            : "bg-amber-500";

      // 工具调用节点（含输入）
      nodes.push({
        id: step.id,
        position: { x: 240, y: baseY },
        data: {
          label: (
            <div className="w-56 text-left">
              <div className="text-xs font-semibold text-zinc-800">
                🔧 {step.toolName}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                入参：{JSON.stringify(step.input ?? "生成中…")}
              </div>
            </div>
          ),
        },
      });

      // 执行结果节点
      nodes.push({
        id: `${step.id}-output`,
        position: { x: 560, y: baseY },
        data: {
          label: (
            <div className="w-56 text-left">
              <div className="text-xs font-semibold text-zinc-800">执行结果</div>
              <pre className="mt-1 max-h-24 overflow-auto text-[10px] leading-4 whitespace-pre-wrap text-zinc-500">
                {step.state === "error"
                  ? "工具执行失败"
                  : step.state === "output-available"
                    ? parseToolOutput(step.output).slice(0, 300)
                    : "执行中…"}
              </pre>
            </div>
          ),
        },
        style: { borderColor: "#059669" },
      });

      // 状态徽标（进行中/完成/失败）
      nodes.push({
        id: `${step.id}-badge`,
        position: { x: 240 + 40, y: baseY - 45 },
        data: {
          label: (
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${stateColor}`}
            >
              {step.state === "output-available"
                ? "已完成"
                : step.state === "error"
                  ? "失败"
                  : "进行中"}
            </span>
          ),
        },
        type: "default",
        style: { background: "transparent", border: "none" },
        draggable: false,
        connectable: false,
      });

      // 连线：start → 工具 → 结果
      if (i === 0) {
        edges.push({ id: `e-start-${step.id}`, source: "start", target: step.id });
      }
      edges.push({
        id: `e-${step.id}-out`,
        source: step.id,
        target: `${step.id}-output`,
      });
      if (i > 0) {
        edges.push({
          id: `e-prev-${step.id}`,
          source: `${steps[i - 1].id}-output`,
          target: step.id,
        });
      }
    });

    return { nodes, edges };
  }, [parts]);

  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Agent 调用工具后，这里会实时展示执行步骤
      </div>
    );
  }

  return (
    <div className="h-72 rounded-lg border border-zinc-200 bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        proOptions={{ hideAttribution: true }}
        colorMode="light"
        className="rounded-lg"
      >
        <Background gap={16} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
