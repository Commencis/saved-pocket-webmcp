FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS model-cache
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
RUN node --input-type=module --eval "\
  import { pipeline, env } from '@huggingface/transformers';\
  env.cacheDir = '/model_cache';\
  console.log('Downloading embedding model...');\
  await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { dtype: 'q8' });\
  console.log('Embedding model ready.');\
  process.exit(0);"

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
# Pre-downloaded embedding model (baked into image at build time)
COPY --from=model-cache /model_cache ./data/models
RUN mkdir -p data/images data/models && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "server.js"]
