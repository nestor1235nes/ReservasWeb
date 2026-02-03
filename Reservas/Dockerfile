# Backend container for Google Cloud Run
# Uses Cloud Run provided PORT env var (default 8080)

FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies first (better Docker layer caching)
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Prefer npm (repo root uses npm scripts)
RUN npm ci --omit=dev

# Copy source
COPY src ./src

# Note: `uploads/` and `imagenesPacientes/` are created at runtime by the app if missing.

EXPOSE 8080

CMD ["npm", "start"]
