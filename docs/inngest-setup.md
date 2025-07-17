# Inngest Setup Guide

This guide explains how to properly configure Inngest for both local development and production deployment.

## Overview

Inngest is used for event-driven background jobs and real-time updates in the application. It handles:
- Task creation and processing
- Code generation workflows
- Pull request creation
- Real-time status updates

## Configuration

### 1. Create Inngest Account

1. Go to [https://app.inngest.com/](https://app.inngest.com/)
2. Sign up or log in
3. Create a new app or use an existing one

### 2. Get Your Keys

From the Inngest dashboard:
1. Navigate to your app settings
2. Copy your **Signing Key** (starts with `signkey-`)
3. Copy your **Event Key**

### 3. Environment Variables

Add these to your `.env.local`:

```bash
# Required for all environments
INNGEST_SIGNING_KEY=signkey-prod-your_signing_key_here
INNGEST_EVENT_KEY=your_event_key_here

# For local development only
INNGEST_DEV=1
```

**Important**: 
- Remove quotes from the values
- Don't include `INNGEST_DEV=1` in production

### 4. Local Development Setup

For local development:

1. Start your Next.js app:
   ```bash
   npm run dev
   ```

2. In a separate terminal, start Inngest Dev Server:
   ```bash
   npx inngest-cli@latest dev
   ```

3. The Inngest Dev Server will:
   - Run on `http://localhost:8288`
   - Auto-discover your functions at `http://localhost:3000/api/inngest`

### 5. Production Setup (Vercel)

For Vercel deployment:

1. **Add Environment Variables** in Vercel:
   - `INNGEST_SIGNING_KEY`
   - `INNGEST_EVENT_KEY`
   - Do NOT add `INNGEST_DEV`

2. **Register Your App URL** in Inngest:
   - Go to Inngest dashboard
   - Add your production URL: `https://your-app.vercel.app/api/inngest`
   - For preview deployments: `https://your-app-git-branch.vercel.app/api/inngest`

3. **Sync Your App**:
   - Click "Sync" in Inngest dashboard
   - It should successfully connect to your endpoint

## Troubleshooting

### "We could not reach your URL" Error

This error occurs when Inngest can't connect to your app. Common causes:

1. **Incorrect URL Format**:
   - ✅ Correct: `https://your-app.vercel.app/api/inngest`
   - ❌ Wrong: `https://your-app.vercel.app` (missing `/api/inngest`)

2. **Missing Environment Variables**:
   ```bash
   # Check in Vercel dashboard
   INNGEST_SIGNING_KEY=signkey-prod-...
   INNGEST_EVENT_KEY=...
   ```

3. **Deployment Not Complete**:
   - Wait for Vercel deployment to finish
   - Check deployment logs for errors

4. **Route Not Accessible**:
   - Verify `/api/inngest` route exists
   - Check that the route exports GET, POST, PUT methods

### WebSocket Authentication Errors

If you see WebSocket errors in the browser console:

1. **Check Event Key**:
   - Ensure `INNGEST_EVENT_KEY` is correct
   - Remove any quotes from the value

2. **Disable Real-time for Debugging**:
   ```typescript
   // In lib/inngest.ts, temporarily comment out:
   // middleware: [realtimeMiddleware()],
   ```

3. **Use Correct Environment**:
   - Dev: Use Inngest Dev Server
   - Prod: Use production Inngest app

### Function Not Triggering

If functions aren't running:

1. **Check Event Names**:
   - Event name in trigger: `clonedex/create.task`
   - Must match exactly when sending

2. **Verify Function Registration**:
   ```typescript
   // In app/api/inngest/route.ts
   export const { GET, POST, PUT } = serve({
     client: inngest,
     functions: [createTask], // Function must be listed here
   })
   ```

3. **Check Logs**:
   - Inngest dashboard > Functions > View logs
   - Look for error messages

## Testing

### Local Testing

1. Start dev server and Inngest CLI
2. Open Inngest Dev UI: `http://localhost:8288`
3. Send a test event:
   ```typescript
   await inngest.send({
     name: 'clonedex/create.task',
     data: {
       task: { id: '1', title: 'Test' },
       token: 'github_token',
     },
   })
   ```
4. Check function runs in Dev UI

### Production Testing

1. Deploy to Vercel
2. Sync in Inngest dashboard
3. Use "Test" button in Inngest dashboard
4. Monitor function runs

## Best Practices

1. **Use Environment-Specific Apps**:
   - Create separate Inngest apps for dev/staging/prod
   - Use different signing keys for each

2. **Error Handling**:
   - Add try-catch blocks in functions
   - Use Inngest's retry configuration
   - Log errors for debugging

3. **Monitoring**:
   - Check Inngest dashboard regularly
   - Set up alerts for failed functions
   - Monitor execution times

4. **Security**:
   - Never commit signing keys
   - Rotate keys periodically
   - Use environment variables only

## Related Documentation

- [Inngest Documentation](https://www.inngest.com/docs)
- [Inngest Next.js Guide](https://www.inngest.com/docs/frameworks/nextjs)
- [Troubleshooting Guide](./troubleshooting.md)