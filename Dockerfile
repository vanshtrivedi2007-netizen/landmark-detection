# Multi-stage production build for Render
FROM node:22-bookworm-slim AS production

WORKDIR /app

# Install curl and procps for health probing and Ollama installation
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    zstd \
    procps \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install official Ollama binary
RUN curl -fsSL https://ollama.com/install.sh | sh

# Copy repository package manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/server/package*.json ./apps/server/
COPY apps/web/package*.json ./apps/web/

# Install dependencies across all workspaces
RUN npm ci

# Copy entire repository source code, seed catalogue, and evidence
COPY . .

# Build shared types, backend, and frontend
RUN npm run build

# Copy and grant execution rights to startup entrypoint
COPY scripts/render-entrypoint.sh /app/render-entrypoint.sh
RUN chmod +x /app/render-entrypoint.sh

# Render environment defaults
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production
ENV OLLAMA_BASE_URL=http://localhost:11434
ENV OLLAMA_VISION_MODEL=gemma3:4b

EXPOSE 10000

ENTRYPOINT ["/app/render-entrypoint.sh"]
