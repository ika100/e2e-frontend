#!/bin/sh
set -e

# Substitute env vars in nginx.conf for CSP connect-src
# Default to empty string if not set
VITE_GREETING_SERVICE_URL="${VITE_GREETING_SERVICE_URL:-}"
VITE_COUNTER_SERVICE_URL="${VITE_COUNTER_SERVICE_URL:-}"

envsubst '${VITE_GREETING_SERVICE_URL} ${VITE_COUNTER_SERVICE_URL}'   < /etc/nginx/nginx.conf.template   > /tmp/nginx.conf

exec nginx -g 'daemon off;' -c /tmp/nginx.conf
