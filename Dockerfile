FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time placeholder only; real secret is injected at runtime via compose
ENV BETTER_AUTH_SECRET=build-time-placeholder
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# SQL migrations run automatically on startup (src/instrumentation.ts)
COPY --from=builder /app/drizzle ./drizzle
# onnxruntime-node native bindings (needed for local embedding model)
COPY --from=builder /app/node_modules/onnxruntime-node ./node_modules/onnxruntime-node
COPY --from=builder /app/node_modules/onnxruntime-common ./node_modules/onnxruntime-common
RUN mkdir -p data/images data/models && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "server.js"]
