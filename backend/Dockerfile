# Backend runtime
FROM node:22-alpine AS base
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public
RUN npx prisma generate && npm run build

# Runtime
FROM base AS runtime
ENV NODE_ENV=production
RUN mkdir -p /app/uploads && chown node:node /app/uploads
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/prisma ./prisma
COPY --chown=node:node --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --chown=node:node package*.json ./
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
