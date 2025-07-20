# Vercel Deployment Quick Start Guide

## 🚀 One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/vibex&env=DATABASE_URL,AUTH_SECRET,OPENAI_API_KEY&envDescription=Required%20environment%20variables&envLink=https://github.com/yourusername/vibex/blob/main/DEPLOYMENT.md)

## 📋 Manual Deployment Steps

### 1. Prerequisites

- Vercel account
- GitHub repository with the code
- PostgreSQL database URL
- At least one AI API key (OpenAI, Anthropic, or Google)

### 2. Environment Variables

```bash
# Required
DATABASE_URL=          # PostgreSQL connection string
AUTH_SECRET=           # Random 32+ character string
OPENAI_API_KEY=        # Your OpenAI API key

# Optional but Recommended
ANTHROPIC_API_KEY=     # Claude API access
GOOGLE_AI_API_KEY=     # Gemini models
NEXT_PUBLIC_APP_URL=   # Your deployment URL

# Optional Features
SENTRY_DSN=            # Error tracking
REDIS_URL=             # Caching (if using Redis)
```

### 3. Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Deploy to production
vercel --prod
```

### 4. Deploy via Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure environment variables
4. Click "Deploy"

## 🔧 Configuration

The project includes optimized `vercel.json` configuration:

- Automatic Bun installation
- 8GB memory allocation for builds
- Security headers
- Function optimization
- Regional deployment

## 🐛 Common Issues & Solutions

### Build Fails with "bun: command not found"

Already fixed in `vercel.json` - Bun is auto-installed.

### TypeScript Compilation Errors

```bash
# Skip type checking (temporary fix)
SKIP_ENV_VALIDATION=true vercel --prod
```

### Database Connection Issues

Ensure your DATABASE_URL includes pooling parameters:
```
postgresql://user:pass@host/db?pgbouncer=true&connection_limit=1
```

### Memory Errors During Build

Already configured for 8GB. If still failing:
- Use Vercel Pro/Enterprise
- Optimize imports
- Split large components

## 📊 Post-Deployment

1. **Check Application Health**
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

2. **Monitor Logs**
   ```bash
   vercel logs --follow
   ```

3. **Set Up Monitoring**
   - Enable Vercel Analytics
   - Configure Sentry (optional)
   - Set up uptime monitoring

## 🔗 Resources

- [Full Deployment Guide](./DEPLOYMENT.md)
- [Environment Variables Guide](./.env.example)
- [Troubleshooting Guide](./docs/troubleshooting.md)
- [Vercel Documentation](https://vercel.com/docs)

---

Need help? Check the [GitHub Issues](https://github.com/yourusername/vibex/issues) or [Vercel Support](https://vercel.com/support).