#!/bin/bash

# Load environment variables from .env.local
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

echo "🚀 Running database migration..."
echo "DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo "YES" || echo "NO")"

# Run the migration
bun run db/cli.ts migrate
