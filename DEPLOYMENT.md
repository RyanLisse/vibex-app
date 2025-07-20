# Vercel Deployment Configuration

This document outlines the required configuration for deploying the Codex Clone application to Vercel.

## Prerequisites

1. A Vercel account and project set up
2. Required API keys and services configured
3. Bun installed locally for development

## Environment Variables

The following environment variables must be configured in your Vercel project settings:

### Required Variables

```bash
# Application URL (set by Vercel automatically, but can be overridden)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Database
DATABASE_URL=your_database_connection_string

# Authentication
AUTH_SECRET=your_auth_secret_here

# AI Services (at least one required)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### Optional Variables (Recommended for Production)

```bash
# Sentry Error Tracking
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
SENTRY_AUTH_TOKEN=your_sentry_auth_token
NEXT_PUBLIC_SENTRY_DSN=your_public_sentry_dsn
SENTRY_DSN=your_sentry_dsn

# Feature Flags
REDIS_ENABLED=false  # Set to true if using Redis
INNGEST_ENABLED=false  # Set to true if using Inngest
```

## Deployment Steps

1. **Configure Environment Variables**
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add all required variables listed above
   - Use the `@` prefix in vercel.json to reference Vercel secrets

2. **Deploy**
   ```bash
   # Using Vercel CLI
   vercel --prod
   
   # Or push to your connected Git repository
   git push origin main
   ```

3. **Post-Deployment Verification**
   - Check the deployment logs for any errors
   - Verify all API routes are functioning
   - Test authentication flow
   - Check Sentry integration (if configured)

## Build Configuration

The project uses the following build configuration:

- **Framework**: Next.js
- **Build Command**: `bun run build`
- **Install Command**: `bun install`
- **Output Directory**: `.next`
- **Node Version**: 20.x (recommended)

## Performance Optimizations

The deployment configuration includes:

- Node.js memory optimization (`--max-old-space-size=4096`)
- Disabled Next.js telemetry for faster builds
- Security headers for production
- Sentry tunnel route for bypassing ad blockers
- Regional deployment (US East by default)

## Function Configuration

- API routes have a maximum duration of 30 seconds
- Adjust in `vercel.json` if longer execution times are needed

## Troubleshooting

### Build Failures

1. **Sentry Build Errors**: If you see Sentry-related errors and don't need Sentry, ensure all Sentry environment variables are undefined (not empty strings)

2. **Memory Issues**: The build is configured with 4GB of memory. If you encounter out-of-memory errors, contact Vercel support to increase limits

3. **TypeScript Errors**: Run `bun run typecheck` locally before deploying

4. **Missing Dependencies**: Ensure all dependencies are listed in `package.json` and not in `devDependencies` if needed for production

### Runtime Issues

1. **API Routes Not Working**: Check that all required environment variables are set
2. **Authentication Failures**: Verify `AUTH_SECRET` is set and consistent
3. **Database Connection**: Ensure `DATABASE_URL` is correctly formatted for your provider

## Security Considerations

- All sensitive environment variables should be added as encrypted Vercel environment variables
- The `.vercelignore` file excludes sensitive and unnecessary files from deployment
- Security headers are automatically applied to all routes
- Source maps are hidden in production builds

## Monitoring

If Sentry is configured:
- Errors are automatically tracked
- Performance monitoring is enabled
- Source maps are uploaded for better error tracking
- Vercel Cron Monitors are automatically instrumented

## Support

For deployment issues:
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Run `bun run build` locally to catch build errors
4. Check the Vercel status page for platform issues