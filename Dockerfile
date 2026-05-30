# =============================================================================
# SocialFlow AI — Production multi-stage build (Next.js standalone)
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time public env (baked into client bundle)
ARG NEXT_PUBLIC_APP_URL=http://localhost
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache wget && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
# Windows checkouts may use CRLF — normalize so exec does not fail in Linux
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod 755 /docker-entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
