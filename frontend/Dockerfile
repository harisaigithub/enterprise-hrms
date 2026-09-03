# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
# Copy only package.json (ignore host Windows package-lock.json)
# so npm resolves the correct platform-specific Linux musl native bindings.
COPY package.json ./
RUN npm install



# ── Stage 2: Build the Vite app ──────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# VITE_API_URL is passed at build time so the bundle knows the API origin.
# In production docker-compose this is set via build.args.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── Stage 3: Serve with Nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime
# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html
# Custom nginx config: handle SPA client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
