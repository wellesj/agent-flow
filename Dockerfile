# 03-agent-flow 生产镜像（Next.js standalone + Node 22 slim）
# 构建：docker build --build-arg NODE_BASE=docker.1ms.run/library/node:22-alpine -t agent-flow:latest .
# 运行：见 docker-compose.yml

ARG NODE_BASE=node:22-alpine

# ---- 依赖安装 ----
FROM ${NODE_BASE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---- 构建 ----
FROM ${NODE_BASE} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- 运行时 ----
FROM ${NODE_BASE} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 非 root 运行（安全基线）
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
