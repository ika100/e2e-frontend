# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

RUN npm ci --ignore-scripts

# Copy source
COPY . .

# Build the SPA
RUN npm run build

# Stage 2: Runtime (nginx:alpine)
FROM nginx:alpine AS runtime

# Install envsubst (part of gettext-base) for runtime config templating
RUN apk add --no-cache gettext

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config as template
COPY nginx.conf /etc/nginx/nginx.conf.template

# Copy entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create directories nginx needs to write to as non-root
RUN mkdir -p /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp \
             /tmp/uwsgi_temp /tmp/scgi_temp && \
    chown -R appuser:appgroup /tmp/client_temp /tmp/proxy_temp_path \
             /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /usr/share/nginx/html && \
    chown appuser:appgroup /docker-entrypoint.sh

# Switch to non-root
USER appuser

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
