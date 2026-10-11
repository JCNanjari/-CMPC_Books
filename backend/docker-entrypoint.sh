#!/bin/sh
set -e
npx prisma migrate deploy
if [ "$SEED_ON_START" = "true" ]; then
  node dist/database/seed.js
fi
exec node dist/main.js
