#!/bin/sh
set -e

# Substitute env vars in nginx.conf for CSP connect-src.
# If VITE_*_URL are empty (same-origin API calls), the CSP relies on 'self'.
VITE_GREETING_SERVICE_URL="${VITE_GREETING_SERVICE_URL:-}"
VITE_COUNTER_SERVICE_URL="${VITE_COUNTER_SERVICE_URL:-}"

# Build the extra connect-src origins string (skip empty values)
EXTRA_ORIGINS=""
[ -n "$VITE_GREETING_SERVICE_URL" ] && EXTRA_ORIGINS="$EXTRA_ORIGINS $VITE_GREETING_SERVICE_URL"
[ -n "$VITE_COUNTER_SERVICE_URL"  ] && EXTRA_ORIGINS="$EXTRA_ORIGINS $VITE_COUNTER_SERVICE_URL"
export EXTRA_ORIGINS

# Replace the two separate variables with the combined EXTRA_ORIGINS
# so the CSP line stays clean when values are empty
sed "s|\${VITE_GREETING_SERVICE_URL} \${VITE_COUNTER_SERVICE_URL}|\${EXTRA_ORIGINS}|g"   /etc/nginx/nginx.conf.template   | envsubst '${EXTRA_ORIGINS}'   > /tmp/nginx.conf

exec nginx -g 'daemon off;' -c /tmp/nginx.conf