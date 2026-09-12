import { z } from "zod";
import { tool } from "@langchain/core/tools";

/**
 * Mock 工具集（第一刀：无外部依赖，验证 Tool Calling 链路）。
 * 后续可扩展为真实 API / 知识库检索 tool。
 */

/** 模拟天气查询（按城市返回 mock 数据） */
export const getWeatherTool = tool(
  async ({ city }) => {
    const conditions = ["晴", "多云", "小雨", "阴"];
    const temp = Math.round(18 + Math.random() * 12);
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const result = {
      city,
      condition,
      temperature: temp,
      humidity: Math.round(40 + Math.random() * 40),
      updatedAt: new Date().toISOString(),
    };
    // 工具返回给模型的文本（LangGraph 会作为 ToolMessage 回传）
    return JSON.stringify(result);
  },
  {
    name: "getWeather",
    description:
      "查询指定城市的当前天气（mock 数据）。输入城市名，返回天气状况、温度、湿度。",
    schema: z.object({
      city: z.string().describe("城市名，例如：北京、上海、广州"),
    }),
  },
);

/** 四则运算计算器（纯函数，展示工具执行结果） */
export const calculatorTool = tool(
  async ({ expression }) => {
    // 只允许数字 + - * / ( ) . 空格，防注入
    const cleaned = expression.replace(/[^0-9+\-*/().\s]/g, "");
    if (!cleaned || cleaned.length > 100) {
      return JSON.stringify({ error: "表达式不合法或过长" });
    }
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${cleaned})`)();
      if (typeof result !== "number" || !Number.isFinite(result)) {
        return JSON.stringify({ error: "无法计算该表达式" });
      }
      return JSON.stringify({
        expression: expression,
        result: Math.round(result * 1e6) / 1e6,
      });
    } catch {
      return JSON.stringify({ error: "表达式解析失败" });
    }
  },
  {
    name: "calculator",
    description:
      "计算一个数学表达式，支持 + - * / 和括号。输入表达式字符串，返回计算结果。",
    schema: z.object({
      expression: z
        .string()
        .describe("数学表达式，例如：(12 + 34) * 5 - 8 / 2"),
    }),
  },
);

/** 获取当前时间（时区可配） */
export const getTimeTool = tool(
  async ({ timezone }) => {
    try {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat("zh-CN", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now);
      return JSON.stringify({ timezone, localTime: formatted, iso: now.toISOString() });
    } catch {
      return JSON.stringify({ error: `无效的时区：${timezone}` });
    }
  },
  {
    name: "getTime",
    description:
      "获取指定时区的当前时间。输入 IANA 时区名（如 Asia/Shanghai、America/New_York），返回本地时间。",
    schema: z.object({
      timezone: z
        .string()
        .describe("IANA 时区名，例如：Asia/Shanghai"),
    }),
  },
);

/** 全部工具（传给 createReactAgent） */
export const agentTools = [getWeatherTool, calculatorTool, getTimeTool];
