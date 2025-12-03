# Cloud Run Deployment Guide - Scopic Legal Backend

**RECOMMENDED DEPLOYMENT METHOD** for production.

This guide covers deploying the FastAPI backend to Google Cloud Run - a fully managed serverless platform for containerized applications.

## Why Cloud Run?

Cloud Run is the recommended deployment platform for this backend:
- ✅ **Serverless**: Auto-scales from 0 to N instances based on traffic
- ✅ **Cost-effective**: Pay only for actual usage (CPU/memory/requests)
- ✅ **Fast**: Cold starts ~1-2 seconds, streaming support built-in
- ✅ **Portable**: Standard Docker containers, runs anywhere
- ✅ **Simple**: No server management, automatic HTTPS, built-in logging

**Perfect for**: ~100 concurrent users, GPT wrapper traffic, streaming chat endpoints.

---

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed: https://cloud.google.com/sdk/docs/install
3. **GCP Project** created (get your PROJECT_ID ready)
4. **Secrets ready**:
   - OpenAI API key
   - Supabase credentials (DB URL, JWT secret, service role key, etc.)

---

## Quick Deployment (Recommended)

### 1. Authenticate and Configure

```bash
# Login to GCP
gcloud auth login

# Set your project (replace with your actual PROJECT_ID)
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. Set Up Secrets in Secret Manager (IMPORTANT)

**Do NOT hardcode secrets in your deployment command.** Use Secret Manager:

```bash
# Create secrets (run these once)
echo -n "your-openai-api-key" | gcloud secrets create openai-api-key --data-file=-
echo -n "postgresql+asyncpg://..." | gcloud secrets create supabase-db-url --data-file=-
echo -n "your-jwt-secret" | gcloud secrets create supabase-jwt-secret --data-file=-
echo -n "your-service-role-key" | gcloud secrets create supabase-service-role-key --data-file=-
echo -n "your-anon-key" | gcloud secrets create supabase-anon-key --data-file=-

# Verify secrets were created
gcloud secrets list
```

### 3. Build and Deploy

```bash
cd backend

# Build the container image using Cloud Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/scopic-legal-api

# Deploy to Cloud Run with secrets
gcloud run deploy scopic-legal-api \
  --image gcr.io/YOUR_PROJECT_ID/scopic-legal-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 5 \
  --cpu 1 \
  --memory 1Gi \
  --timeout 300 \
  --concurrency 80 \
  --set-env-vars APP_ENV=production,SUPABASE_PROJECT_URL=https://YOUR_PROJECT.supabase.co,SUPABASE_JWKS_URL=https://YOUR_PROJECT.supabase.co/auth/v1/certs,SUPABASE_STORAGE_BUCKET_NAME=uploads,SUPABASE_STORAGE_PUBLIC_BASE_URL=https://YOUR_PROJECT.supabase.co/storage/v1/object/public,ALLOWED_ORIGINS=https://your-frontend.vercel.app,MAX_HISTORY_MESSAGES=30,MAX_OUTPUT_TOKENS=4096,OPENAI_MODEL_CHAT=gpt-4o-mini,OPENAI_MODEL_VISION=gpt-4o-mini,OPENAI_MODEL_DEEP_RESEARCH=gpt-4o \
  --set-secrets OPENAI_API_KEY=openai-api-key:latest,SUPABASE_DB_URL=supabase-db-url:latest,SUPABASE_JWT_SECRET=supabase-jwt-secret:latest,SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest,SUPABASE_ANON_KEY=supabase-anon-key:latest
```

**Note**: Replace `YOUR_PROJECT_ID` and `YOUR_PROJECT` with your actual values.

### 4. Get Your Service URL

```bash
gcloud run services describe scopic-legal-api --region us-central1 --format 'value(status.url)'
```

Your backend will be live at: `https://scopic-legal-api-XXXXXX-uc.a.run.app`

---

## Configuration Explained

### Scaling Parameters

```bash
--min-instances 0      # Scale to zero when idle (saves costs)
--max-instances 5      # Max 5 instances for ~100 concurrent users
--cpu 1                # 1 vCPU per instance
--memory 1Gi           # 1GB RAM per instance
--timeout 300          # 5 minutes (for long streaming responses)
--concurrency 80       # 80 requests per instance
```

**For higher traffic**, adjust:
- `--max-instances 10` (or more)
- `--cpu 2` and `--memory 2Gi` (for faster responses)

### Environment Variables

**Non-sensitive** (set via `--set-env-vars`):
- `APP_ENV=production`
- `SUPABASE_PROJECT_URL`
- `SUPABASE_JWKS_URL`
- `SUPABASE_STORAGE_BUCKET_NAME`
- `SUPABASE_STORAGE_PUBLIC_BASE_URL`
- `ALLOWED_ORIGINS` (your frontend URL)
- `MAX_HISTORY_MESSAGES`, `MAX_OUTPUT_TOKENS`
- `OPENAI_MODEL_*` (model names)

**Sensitive** (set via `--set-secrets`):
- `OPENAI_API_KEY`
- `SUPABASE_DB_URL`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

---

## Alternative: Using PowerShell Script

If you prefer automation, use the included script:

```powershell
cd backend
.\deploy-cloudrun.ps1
```

**Note**: You'll still need to manually configure secrets in Secret Manager first.

---

## Post-Deployment

### 1. Test the Health Endpoint

```bash
curl https://YOUR_SERVICE_URL/health
# Should return: {"status":"ok"}
```

### 2. View Logs

```bash
# Stream live logs
gcloud run services logs tail scopic-legal-api --region us-central1

# View recent logs
gcloud run services logs read scopic-legal-api --region us-central1 --limit 50
```

### 3. Update Frontend CORS

Add your Cloud Run URL to `ALLOWED_ORIGINS`:

```bash
gcloud run services update scopic-legal-api \
  --region us-central1 \
  --update-env-vars ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://scopic-legal-api-XXXXXX-uc.a.run.app
```

### 4. Monitor Performance

Visit Cloud Run console:
```
https://console.cloud.google.com/run/detail/us-central1/scopic-legal-api
```

---

## Updating the Service

### Update Code

```bash
cd backend

# Rebuild and redeploy
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/scopic-legal-api
gcloud run deploy scopic-legal-api \
  --image gcr.io/YOUR_PROJECT_ID/scopic-legal-api \
  --region us-central1
```

### Update Environment Variables

```bash
gcloud run services update scopic-legal-api \
  --region us-central1 \
  --update-env-vars MAX_OUTPUT_TOKENS=8192
```

### Update Secrets

```bash
# Update a secret value
echo -n "new-api-key" | gcloud secrets versions add openai-api-key --data-file=-

# Cloud Run will automatically use the latest version
```

---

## Cost Optimization

### Estimated Costs (~100 concurrent users)

With the recommended configuration:
- **CPU**: ~$0.024/vCPU-hour
- **Memory**: ~$0.0025/GB-hour  
- **Requests**: $0.40/million requests
- **Networking**: $0.12/GB egress

**Typical monthly cost**: $20-50 for moderate usage (scales to zero when idle).

### Tips to Reduce Costs

1. **Use `--min-instances 0`** (already set) - scales to zero when idle
2. **Optimize `--concurrency`** - higher = fewer instances needed
3. **Use connection pooling** for database (already configured)
4. **Monitor and adjust** `--max-instances` based on actual traffic

---

## Troubleshooting

### Build Fails

```bash
# Check Cloud Build logs
gcloud builds list --limit 5
gcloud builds log BUILD_ID
```

### Deployment Fails

```bash
# Check service status
gcloud run services describe scopic-legal-api --region us-central1

# View deployment logs
gcloud run revisions list --service scopic-legal-api --region us-central1
```

### Runtime Errors

```bash
# Stream logs
gcloud run services logs tail scopic-legal-api --region us-central1

# Check for common issues:
# - Missing environment variables
# - Database connection errors
# - OpenAI API key issues
```

### Health Check Fails

```bash
# Test locally first
docker build -t scopic-legal-api .
docker run -p 8080:8080 --env-file .env scopic-legal-api

# Then test health endpoint
curl http://localhost:8080/health
```

---

## Security Best Practices

1. ✅ **Use Secret Manager** for all sensitive values (already configured above)
2. ✅ **Enable VPC Connector** (optional, for private Supabase instances)
3. ✅ **Restrict CORS** to your frontend domain only
4. ✅ **Use HTTPS** (automatic with Cloud Run)
5. ✅ **Rotate secrets regularly** (OpenAI keys, JWT secrets)
6. ✅ **Monitor logs** for suspicious activity

---

## Advanced: CI/CD with GitHub Actions

Create `.github/workflows/deploy-cloudrun.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Deploy to Cloud Run
        run: |
          gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/scopic-legal-api backend/
          gcloud run deploy scopic-legal-api \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/scopic-legal-api \
            --region us-central1 \
            --platform managed
```

---

## Support

- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Supabase Docs**: https://supabase.com/docs

---

## Summary

**You're ready to deploy!** Just run:

```bash
# 1. Set up secrets (once)
gcloud secrets create openai-api-key --data-file=-
# ... (other secrets)

# 2. Build and deploy
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/scopic-legal-api
gcloud run deploy scopic-legal-api --image gcr.io/YOUR_PROJECT_ID/scopic-legal-api ...

# 3. Test
curl https://YOUR_SERVICE_URL/health
```

**Your backend is now live on Cloud Run!** 🚀
