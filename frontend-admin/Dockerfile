# 管理端镜像（端口 3001）：多阶段构建 + standalone 输出
# NEXT_PUBLIC_API_URL 传空串 → 请求走相对路径（/api/...），由统一入口 nginx 转发
# NEXT_PUBLIC_BASE_PATH=/admin → 管理端挂在统一入口的 /admin 子路径下
FROM node:20-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_BASE_PATH=/admin
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3001
# standalone：只带运行时需要的最小 node_modules + server.js
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3001
CMD ["node", "server.js"]
