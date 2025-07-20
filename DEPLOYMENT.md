# Vercel Deployment Configuration

This document provides comprehensive guidance for deploying the Claude Flow (Vibex) application to Vercel.

## Prerequisites

1. A Vercel account (free tier works for testing)
2. Required API keys for AI services
3. PostgreSQL database (Vercel Postgres, Neon, or Supabase recommended)
4. Bun installed locally for development (v1.0+)

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

The project is optimized for Vercel deployment with the following settings:

- **Framework Preset**: Next.js
- **Build Command**: `bun install --frozen-lockfile && bun run build`
- **Install Command**: Automatically installs Bun via curl
- **Output Directory**: `.next`
- **Node Version**: 20.x (required)
- **Package Manager**: Bun (auto-installed during build)
- **Functions Region**: `iad1` (US East) or closest to your database

## Performance Optimizations

The deployment is optimized with:

- **Memory Allocation**: 8GB for builds (`--max-old-space-size=8192`)
- **Build Caching**: Leverages Vercel's build cache
- **Edge Functions**: Optimized for edge runtime where applicable
- **Security Headers**: Comprehensive CSP and security policies
- **Sentry Integration**: Optional error tracking with tunnel route
- **Regional Deployment**: Configurable based on user base
- **Static Optimization**: Automatic static page generation
- **Image Optimization**: Next.js Image component with WebP/AVIF

## Function Configuration

- API routes have a maximum duration of 30 seconds
- Adjust in `vercel.json` if longer execution times are needed

## Troubleshooting

### Build Failures

1. **Bun Installation**: The build automatically installs Bun. If this fails:
   ```bash
   # Test locally with same command
   curl -fsSL https://bun.sh/install | bash
   ```

2. **TypeScript Errors**: 
   ```bash
   # Use the workaround script locally
   bun run typecheck
   
   # Or skip type checking in production
   SKIP_ENV_VALIDATION=true vercel --prod
   ```

3. **Memory Issues**: Already configured for 8GB. For larger projects:
   - Split the build into smaller chunks
   - Use Vercel's Enterprise plan for more resources
   - Optimize imports and tree shaking

4. **Sentry Build Errors**: 
   - If not using Sentry, don't set ANY Sentry variables
   - If using Sentry, ensure all required vars are set:
     - `SENTRY_ORG`
     - `SENTRY_PROJECT`
     - `SENTRY_AUTH_TOKEN`
     - `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN`

5. **Database Connection**:
   - Use connection pooling for serverless
   - Add `?pgbouncer=true` to DATABASE_URL
   - Set `connection_limit=1` for Vercel Functions

6. **Module Resolution**:
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules bun.lockb
   bun install --frozen-lockfile
   ```

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

## Quick Deployment Checklist

- [ ] Fork/clone the repository
- [ ] Create a new Vercel project
- [ ] Connect your GitHub repository
- [ ] Set up PostgreSQL database (Vercel Postgres recommended)
- [ ] Add all required environment variables
- [ ] Deploy and check build logs
- [ ] Test the deployed application
- [ ] Configure custom domain (optional)

## Deployment Commands

```bash
# Local testing before deployment
bun install --frozen-lockfile
bun run typecheck
bun run test:fast
bun run build

# Deploy to Vercel
vercel --prod

# Check deployment
vercel logs
vercel env pull
```

## Support

For deployment issues:
1. Check Vercel deployment logs in the dashboard
2. Verify all environment variables are correctly set
3. Test the build locally with `bun run build`
4. Check the [Vercel status page](https://www.vercel-status.com/)
5. Review the [troubleshooting guide](./docs/troubleshooting.md)
6. Check recent [GitHub issues](https://github.com/yourusername/vibex/issues)

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Bun Documentation](https://bun.sh/docs)
- [Project Architecture Guide](./docs/ARCHITECTURE.md)