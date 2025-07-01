# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy deployment script and make executable
COPY --from=builder --chown=nextjs:nodejs /app/scripts/deploy.sh ./scripts/
COPY --from=builder --chown=nextjs:nodejs /app/scripts/populate.ts ./scripts/
COPY --from=builder --chown=nextjs:nodejs /app/scripts/healthcheck.js ./scripts/
COPY --from=builder --chown=nextjs:nodejs /app/data ./data
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./

# Copy necessary files for deployment script
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node scripts/healthcheck.js

# Run deployment script then start the application
CMD ["dumb-init", "sh", "-c", "./scripts/deploy.sh && node server.js"] 