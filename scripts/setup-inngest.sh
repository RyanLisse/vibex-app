#!/bin/bash

echo "Setting up Inngest for local development..."

# Check if INNGEST_DEV is set in .env.local
if ! grep -q "INNGEST_DEV=1" .env.local 2>/dev/null; then
    echo "Adding INNGEST_DEV=1 to .env.local for local development..."
    echo -e "\n# Enable Inngest dev mode\nINNGEST_DEV=1" >> .env.local
fi

# Check if Inngest dev server is running
if ! lsof -i :8288 >/dev/null 2>&1; then
    echo "Starting Inngest dev server..."
    echo "Run this command in a separate terminal:"
    echo "bunx inngest-cli@latest dev"
    echo ""
    echo "Then visit http://localhost:8288 to view the Inngest dashboard"
else
    echo "Inngest dev server is already running on port 8288"
fi

echo ""
echo "Inngest setup complete!"
echo ""
echo "If you're still seeing errors, make sure:"
echo "1. The Inngest dev server is running (bunx inngest-cli@latest dev)"
echo "2. Your Next.js app is running (bun dev)"
echo "3. Visit http://localhost:8288 to see the Inngest dev dashboard"
echo "4. The app should auto-register at http://localhost:3000/api/inngest"