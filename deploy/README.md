# 03-agent-flow 部署文档

> 目标：云服务器一条命令跑起「Tool Calling Agent + Nginx 反代」。  
> 特点：无数据库（Agent 无状态），比 02-rag-kb 更简单；SSE 流式同样需关 Nginx buffering。  
> 公网访问：**http://IP:8082**（宿主 80 被 ChatBot、8081 被 RAG 占用）。  
> 完整傻瓜式部署见仓库根目录 `云服务器部署完整指南.md`。

## 架构

```text
浏览器 → Nginx(8082) → web(Next.js standalone :3000) → LangGraph Agent → DeepSeek/可切换模型
                      └ proxy_buffering off（SSE 关键）
```

## 部署步骤

```bash
# 1. 上传代码（git clone 或 scp）
git clone <仓库> 03-agent-flow && cd 03-agent-flow

# 2. 配置密钥
cp .env.production.example .env.production
vim .env.production   # 填 DEEPSEEK_API_KEY（或 LLM_* 切换模型）

# 3. 构建并启动
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 4. 验证
curl http://127.0.0.1/api/chat -H 'Content-Type: application/json' \
  -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"现在几点？"}]}]}' \
  | head -20   # 应看到 tool-input / text-delta 增量
```

## 更新发布

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## 常见问题

| 现象 | 处理 |
|------|------|
| 流式一次性吐完 | nginx/conf.d/agent-flow.conf 的 `proxy_buffering off` 未生效，确认挂载后重启 |
| 工具不调用 | 检查模型是否支持 tool calling；DeepSeek 支持；`LLM_MODEL` 换成不支持 function calling 的模型时需调整 |
| 回答中途断 | `proxy_read_timeout` 调大；看 `docker compose logs web` |
| 401/鉴权失败 | `.env.production` 里 Key 是否配好、容器是否重启加载 |

## 模型切换

| 变量 | 默认 | 说明 |
|------|------|------|
| `DEEPSEEK_API_KEY` | 必填 | DeepSeek Key（默认模型） |
| `LLM_BASE_URL` | 空 | 设置后切换到其他 OpenAI 兼容服务 |
| `LLM_API_KEY` | 空 | 对应服务的 Key |
| `LLM_MODEL` | 空 | 对应模型名（如 gpt-4o-mini） |

> 本地开发同样生效：`.env.local` 里设置 `LLM_*` 即可切换（见 `lib/agent.ts`）。
