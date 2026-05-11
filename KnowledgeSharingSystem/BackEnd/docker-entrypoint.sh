#!/bin/sh
set -e

if [ "${RUN_DB_MIGRATIONS:-true}" = "true" ]; then
  npm run db:pg:schema
  npm run db:pg:hidden-knowledge
  npm run db:pg:point-policy
fi

exec "$@"
