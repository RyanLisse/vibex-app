# Inngest Setup Guide

## Overview

Inngest is used for event-driven background tasks and real-time updates in this application. It handles task creation, streaming updates, and task control (pause/resume/cancel).

## Local Development Setup

### 1. Environment Variables

Make sure you have the following in your `.env.local` file:

```bash
# For local development
INNGEST_DEV=1

# These can be dummy values for local dev
INNGEST_EVENT_KEY=test_dummy_event_key_for_local_development_only
INNGEST_SIGNING_KEY=signkey-test-dummy-signing-key-for-local-development
```

### 2. Start the Inngest Dev Server

In a separate terminal, run:

```bash
bunx inngest-cli@latest dev
```

This will:

- Start the Inngest dev server on port 8288
- Provide a dashboard at http://localhost:8288
- Auto-discover your functions from your Next.js app

### 3. Start Your Next.js App

In another terminal:

```bash
bun dev
```

### 4. Verify Setup

1. Visit http://localhost:8288 - You should see the Inngest dev dashboard
2. Your app should auto-register at http://localhost:3000/api/inngest
3. Test the configuration: `curl http://localhost:3000/api/test-inngest`

## Production Setup

For production, you'll need:

1. Real Inngest signing and event keys from https://app.inngest.com/
2. Remove or set `INNGEST_DEV=0`
3. Deploy your functions to your production URL

## Troubleshooting

### "Inngest subscription disabled: No token available"

This means the Inngest dev server isn't running or can't be reached. Make sure:

1. The Inngest dev server is running (`bunx inngest-cli@latest dev`)
2. It's accessible on port 8288
3. Your Next.js app can reach it

### "fetch failed" when sending events

This typically means:

1. The Inngest dev server isn't running
2. There's a network issue preventing connection
3. The event key is invalid (in production)

### React Error #185

This is often related to component lifecycle issues. Make sure:

1. You're not using hooks conditionally
2. Components are properly wrapped in error boundaries
3. Subscription cleanup is handled properly

## Quick Setup Script

Run the setup script to check your configuration:

```bash
./scripts/setup-inngest.sh
```
