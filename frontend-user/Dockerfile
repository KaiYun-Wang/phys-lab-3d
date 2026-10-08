# 用户端镜像（端口 3000）：多阶段构建 + standalone 输出
# NEXT_PUBLIC_API_URL 是构建期变量：部署时传空串 → 前端请求走相对路径（/api/...），
# 由统一入口 nginx 转发；以后换域名 / 上 HTTPS 无需重新打镜像
FROM node:20-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
# standalone：只带运行时需要的最小 node_modules + server.js
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
