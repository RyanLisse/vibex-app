# GitHub Repository Secrets Configuration Guide

## 🔐 Required Secrets for CI/CD Pipeline

Based on the analysis of your workflows, here are all the secrets that need to be configured in your GitHub repository settings:

### Critical Deployment Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `VERCEL_TOKEN` | Vercel deployment token | Run `vercel login` then get token from Vercel dashboard |
| `VERCEL_ORG_ID` | Vercel organization ID | Found in Vercel project settings |
| `VERCEL_PROJECT_ID` | Vercel project ID | Found in Vercel project settings |

### Performance & Monitoring

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `LHCI_GITHUB_APP_TOKEN` | Lighthouse CI GitHub App token | Install Lighthouse CI GitHub App |
| `MONITORING_API_KEY` | Performance monitoring service | From your monitoring service dashboard |

### Release & Publishing

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `NPM_TOKEN` | NPM publishing token | Generate from npmjs.com account settings |
| `GITHUB_TOKEN` | GitHub API token | Auto-provided by GitHub Actions |

### Notifications

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | Create webhook in Slack app settings |

### Production Environment Variables

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `DATABASE_URL` | Production database URL | `postgresql://user:pass@host:5432/db` |
| `ELECTRIC_URL` | ElectricSQL production URL | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_SECRET` | NextAuth.js secret | Generate with `openssl rand -base64 32` |
| `OPENAI_API_KEY` | OpenAI API key | From OpenAI dashboard |
| `ANTHROPIC_API_KEY` | Anthropic API key | From Anthropic dashboard |

## 🚀 Setup Instructions

### 1. Access Repository Settings
1. Go to your GitHub repository
2. Click **Settings** tab
3. Navigate to **Secrets and variables** → **Actions**

### 2. Vercel Setup
```bash
# Install Vercel CLI
npm i -g vercel

# Login and get project info
vercel login
vercel project ls

# Get your organization and project IDs from the output
```

### 3. Generate Required Tokens

#### NextAuth Secret
```bash
openssl rand -base64 32
```

#### NPM Token
1. Go to npmjs.com
2. Login to your account
3. Go to Access Tokens
4. Generate new token with "Automation" type

#### Lighthouse CI Token
1. Install the Lighthouse CI GitHub App
2. Configure it for your repository
3. Get the token from the app settings

### 4. Add Secrets to GitHub

For each secret above:
1. Click **New repository secret**
2. Enter the **Name** (exactly as shown in table)
3. Enter the **Value**
4. Click **Add secret**

## 🔍 Verification

After adding all secrets, you can verify they're working by:

1. **Triggering a workflow run**
2. **Checking the Actions tab** for any missing secret errors
3. **Monitoring deployment logs** for authentication issues

## 🚨 Security Notes

- Never commit secrets to your repository
- Use environment-specific secrets (dev/staging/prod)
- Regularly rotate API keys and tokens
- Monitor secret usage in Actions logs
- Use least-privilege access for all tokens

## 📋 Checklist

- [ ] `VERCEL_TOKEN` - Vercel deployment
- [ ] `VERCEL_ORG_ID` - Vercel organization
- [ ] `VERCEL_PROJECT_ID` - Vercel project
- [ ] `LHCI_GITHUB_APP_TOKEN` - Lighthouse CI
- [ ] `MONITORING_API_KEY` - Performance monitoring
- [ ] `NPM_TOKEN` - Package publishing
- [ ] `SLACK_WEBHOOK_URL` - Notifications
- [ ] `DATABASE_URL` - Production database
- [ ] `ELECTRIC_URL` - ElectricSQL production
- [ ] `NEXTAUTH_SECRET` - Authentication
- [ ] `OPENAI_API_KEY` - OpenAI integration
- [ ] `ANTHROPIC_API_KEY` - Anthropic integration

## 🔧 Troubleshooting

### Common Issues:

1. **Vercel deployment fails**: Check VERCEL_* secrets are correct
2. **Lighthouse CI fails**: Ensure LHCI_GITHUB_APP_TOKEN is valid
3. **Release fails**: Verify NPM_TOKEN has correct permissions
4. **Build fails**: Check all environment variables are set

### Debug Steps:

1. Check Actions logs for specific error messages
2. Verify secret names match exactly (case-sensitive)
3. Test tokens individually outside of CI
4. Ensure tokens have required permissions
