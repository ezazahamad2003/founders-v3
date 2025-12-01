# Vercel Deployment Guide

This guide will help you deploy the Next.js frontend to Vercel.

## Prerequisites

- GitHub account with the repository
- Vercel account (sign up at https://vercel.com)
- Backend deployed to Cloud Run

## Quick Deployment

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**
   - Visit https://vercel.com
   - Sign in with your GitHub account

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repository: `ezazahamad2003/founders-v3`
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

4. **Add Environment Variables**
   
   Click "Environment Variables" and add:
   
   ```
   NEXT_PUBLIC_API_BASE_URL=https://founders-backend-4wdopgn6aq-uc.a.run.app
   NEXT_PUBLIC_SUPABASE_URL=https://vkwinzxslacteeqjpmne.supabase.co
   NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET=ProfileDrawer
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrd2luenhzbGFjdGVlcWpwbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDUwNzYsImV4cCI6MjA3OTI4MTA3Nn0.peO1QUFc7UzPfd55RGW4fz2ThTUdMJ18VQ1fRYAyAnM
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (2-3 minutes)
   - Your app will be live at `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from frontend directory
cd frontend
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? founders-v3
# - Directory? ./
# - Override settings? No

# Deploy to production
vercel --prod
```

## Post-Deployment

### 1. Update Backend CORS

Update the backend's `ALLOWED_ORIGINS` to include your Vercel URL:

```yaml
# In backend/.env.yaml
ALLOWED_ORIGINS: "https://your-project.vercel.app,http://localhost:3000"
```

Then redeploy the backend:
```bash
cd backend
gcloud run deploy founders-backend --source . --region us-central1 --quiet
```

### 2. Set Custom Domain (Optional)

1. Go to your Vercel project settings
2. Click "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### 3. Configure Production Settings

In Vercel dashboard:
- **Settings** → **General**
  - Node.js Version: 18.x or 20.x
  - Install Command: `npm install`
  - Build Command: `npm run build`
  - Output Directory: `.next`

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL | `https://founders-backend-xxx.run.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |
| `NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET` | Storage bucket name | `ProfileDrawer` |

### Update Environment Variables

1. Go to your project in Vercel
2. Settings → Environment Variables
3. Edit or add variables
4. Redeploy for changes to take effect

## Automatic Deployments

Vercel automatically deploys:
- **Production**: Every push to `main` branch
- **Preview**: Every pull request

### Disable Auto-Deploy (if needed)

1. Settings → Git
2. Uncheck "Production Branch"
3. Deploy manually via dashboard or CLI

## Monitoring & Debugging

### View Deployment Logs

1. Go to your project in Vercel
2. Click on a deployment
3. View "Build Logs" and "Function Logs"

### View Runtime Logs

```bash
vercel logs [deployment-url]
```

### Common Issues

#### Build Fails

**Check build logs** for errors:
- Missing dependencies: Run `npm install` locally
- TypeScript errors: Run `npm run build` locally to test
- Environment variables: Ensure all required vars are set

#### API Requests Fail

**Check:**
1. Backend URL is correct in environment variables
2. Backend CORS includes Vercel URL
3. Backend is running: `curl https://your-backend.run.app/health`

#### Supabase Connection Issues

**Verify:**
1. Supabase URL and anon key are correct
2. Supabase project is active
3. Row Level Security (RLS) policies are configured

## Performance Optimization

### Enable Edge Functions

For faster global response times:

1. Create `middleware.ts` in `src/`:
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
```

### Enable Image Optimization

In `next.config.mjs`:
```javascript
const nextConfig = {
  images: {
    domains: ['vkwinzxslacteeqjpmne.supabase.co'],
  },
}
```

### Enable Caching

Add cache headers in `next.config.mjs`:
```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
```

## Cost Management

### Vercel Pricing

- **Hobby (Free)**:
  - 100GB bandwidth/month
  - 100 hours serverless function execution
  - Unlimited deployments
  - Perfect for personal projects

- **Pro ($20/month)**:
  - 1TB bandwidth
  - 1000 hours execution
  - Team collaboration
  - Better performance

### Monitor Usage

1. Go to Vercel dashboard
2. Settings → Usage
3. View bandwidth and function execution

## CI/CD Integration

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
```

## Rollback

### Via Dashboard

1. Go to Deployments
2. Find previous successful deployment
3. Click "..." → "Promote to Production"

### Via CLI

```bash
vercel rollback [deployment-url]
```

## Support & Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **Vercel Support**: https://vercel.com/support

## Current Configuration

- **Repository**: `ezazahamad2003/founders-v3`
- **Root Directory**: `frontend`
- **Framework**: Next.js
- **Backend**: https://founders-backend-4wdopgn6aq-uc.a.run.app
- **Supabase**: https://vkwinzxslacteeqjpmne.supabase.co

## Next Steps After Deployment

1. ✅ Test the deployed frontend
2. ✅ Verify API connectivity
3. ✅ Test authentication flow
4. ✅ Check file uploads
5. ✅ Monitor performance
6. ✅ Set up custom domain (optional)
7. ✅ Configure analytics (optional)
