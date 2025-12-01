# Cloud Run Deployment Guide

This guide covers deploying the FastAPI backend to Google Cloud Run using Docker containers.

## Why Cloud Run?

Cloud Run offers several advantages over App Engine:
- **Containerized**: Full control over your runtime environment
- **Cost-effective**: Pay only for actual usage, scales to zero
- **Fast deployments**: Typically faster than App Engine
- **Portable**: Same Docker image can run anywhere
- **Better scaling**: More granular control over scaling parameters

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed from https://cloud.google.com/sdk/docs/install
3. **Docker** (optional - Cloud Run can build from source)
4. **GCP Project** created

## Quick Start

### 1. Authenticate and Set Project

```powershell
# Login to GCP
gcloud auth login

# Set your project
gcloud config set project founders-v3
```

### 2. Deploy Using the Script

```powershell
cd backend
.\deploy-cloudrun.ps1
```

That's it! The script will:
- Build your Docker image
- Push it to Google Container Registry
- Deploy to Cloud Run
- Configure environment variables
- Set up scaling parameters

## Manual Deployment

If you prefer manual control:

### 1. Enable Required APIs

```powershell
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 2. Deploy from Source

```powershell
gcloud run deploy founders-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --env-vars-file .env.yaml \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --quiet
```

### 3. Deploy from Pre-built Image (Alternative)

If you want to build the image separately:

```powershell
# Build and push to Artifact Registry
gcloud builds submit --tag gcr.io/founders-v3/founders-backend

# Deploy the image
gcloud run deploy founders-backend \
  --image gcr.io/founders-v3/founders-backend \
  --region us-central1 \
  --allow-unauthenticated \
  --env-vars-file .env.yaml \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

## Configuration

### Environment Variables

Environment variables are stored in `.env.yaml`:

```yaml
APP_ENV: "production"
OPENAI_API_KEY: "your-key"
SUPABASE_DB_URL: "your-db-url"
# ... etc
```

To update environment variables:

```powershell
# Update the .env.yaml file, then redeploy
gcloud run services update founders-backend \
  --region us-central1 \
  --env-vars-file .env.yaml
```

### Scaling Configuration

Current configuration:
- **Memory**: 1Gi (can be adjusted: 128Mi, 256Mi, 512Mi, 1Gi, 2Gi, 4Gi, 8Gi)
- **CPU**: 1 (can be: 1, 2, 4, 8)
- **Min Instances**: 0 (scales to zero when not in use)
- **Max Instances**: 10 (maximum concurrent instances)

To update scaling:

```powershell
gcloud run services update founders-backend \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 20
```

### Concurrency

Cloud Run defaults to 80 concurrent requests per instance. To adjust:

```powershell
gcloud run services update founders-backend \
  --region us-central1 \
  --concurrency 100
```

## Monitoring & Debugging

### View Logs

```powershell
# Stream logs in real-time
gcloud run logs tail --service=founders-backend --region=us-central1

# Read recent logs
gcloud run logs read --service=founders-backend --region=us-central1 --limit=50
```

### View Service Details

```powershell
gcloud run services describe founders-backend --region=us-central1
```

### List Revisions

```powershell
gcloud run revisions list --service=founders-backend --region=us-central1
```

### Check Service URL

```powershell
gcloud run services describe founders-backend \
  --region=us-central1 \
  --format="value(status.url)"
```

## Traffic Management

### Gradual Rollout

Deploy a new revision without sending traffic:

```powershell
gcloud run deploy founders-backend \
  --source . \
  --region us-central1 \
  --no-traffic \
  --tag=canary
```

Then split traffic:

```powershell
gcloud run services update-traffic founders-backend \
  --region=us-central1 \
  --to-revisions=LATEST=50,PREVIOUS=50
```

### Rollback

```powershell
# List revisions
gcloud run revisions list --service=founders-backend --region=us-central1

# Rollback to a specific revision
gcloud run services update-traffic founders-backend \
  --region=us-central1 \
  --to-revisions=founders-backend-00001-abc=100
```

## Custom Domains

### Add a Custom Domain

```powershell
# Map a domain
gcloud run domain-mappings create \
  --service=founders-backend \
  --domain=api.yourdomain.com \
  --region=us-central1
```

Then update your DNS with the provided records.

## Security

### Use Secret Manager (Recommended)

Instead of `.env.yaml`, use Secret Manager for sensitive data:

1. **Create secrets**:
```powershell
echo -n "your-openai-key" | gcloud secrets create openai-api-key --data-file=-
```

2. **Grant access**:
```powershell
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:566998539930-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

3. **Deploy with secrets**:
```powershell
gcloud run deploy founders-backend \
  --source . \
  --region us-central1 \
  --set-secrets="OPENAI_API_KEY=openai-api-key:latest"
```

### Restrict Access

To require authentication:

```powershell
gcloud run services update founders-backend \
  --region=us-central1 \
  --no-allow-unauthenticated
```

Then use IAM to grant access to specific users/services.

## Cost Optimization

### Current Pricing (as of 2024)

Cloud Run charges for:
- **CPU**: $0.00002400 per vCPU-second
- **Memory**: $0.00000250 per GiB-second
- **Requests**: $0.40 per million requests
- **Free tier**: 2 million requests/month, 360,000 GiB-seconds, 180,000 vCPU-seconds

### Tips to Reduce Costs

1. **Scale to zero**: Set `min-instances=0` (already configured)
2. **Right-size resources**: Start with smaller memory/CPU and scale up if needed
3. **Optimize cold starts**: Keep Docker image small
4. **Use caching**: Implement response caching where appropriate
5. **Monitor usage**: Use Cloud Monitoring to track costs

### Estimate Costs

Use the [Cloud Run Pricing Calculator](https://cloud.google.com/products/calculator)

Example: 100,000 requests/month with 1Gi memory, 1 CPU, 500ms avg response time:
- ~$5-10/month

## Troubleshooting

### Deployment Fails

1. **Check build logs**:
   - Visit the Cloud Build URL shown during deployment
   - Or: `gcloud builds list --limit=5`

2. **Verify Dockerfile**:
   - Test locally: `docker build -t test .`
   - Run locally: `docker run -p 8080:8080 test`

3. **Check quotas**:
   - Visit: https://console.cloud.google.com/iam-admin/quotas

### Service Not Responding

1. **Check logs**:
   ```powershell
   gcloud run logs tail --service=founders-backend --region=us-central1
   ```

2. **Verify environment variables**:
   ```powershell
   gcloud run services describe founders-backend --region=us-central1 --format=yaml
   ```

3. **Test health endpoint**:
   ```powershell
   curl https://your-service-url/health
   ```

### Cold Start Issues

If cold starts are slow:

1. **Keep warm with min-instances**:
   ```powershell
   gcloud run services update founders-backend \
     --region=us-central1 \
     --min-instances=1
   ```

2. **Optimize Docker image**:
   - Use multi-stage builds
   - Minimize layers
   - Use smaller base images

3. **Use startup CPU boost**:
   ```powershell
   gcloud run services update founders-backend \
     --region=us-central1 \
     --cpu-boost
   ```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - uses: google-github-actions/deploy-cloudrun@v1
        with:
          service: founders-backend
          region: us-central1
          source: ./backend
          env_vars: |
            APP_ENV=production
```

## Comparison: Cloud Run vs App Engine

| Feature | Cloud Run | App Engine |
|---------|-----------|------------|
| **Container** | ✅ Full control | ❌ Limited |
| **Scale to Zero** | ✅ Yes | ❌ No (Standard) |
| **Cold Start** | ~1-2s | ~3-5s |
| **Max Request Time** | 60 min | 60 min |
| **Pricing** | Pay per use | Instance hours |
| **Deployment Speed** | Fast | Slower |
| **Portability** | High | Low |

## Support & Resources

- **Cloud Run Documentation**: https://cloud.google.com/run/docs
- **Pricing**: https://cloud.google.com/run/pricing
- **Quotas**: https://cloud.google.com/run/quotas
- **Best Practices**: https://cloud.google.com/run/docs/tips

## Current Deployment

- **Service Name**: `founders-backend`
- **Project**: `founders-v3` (566998539930)
- **Region**: `us-central1`
- **URL**: https://founders-backend-566998539930.us-central1.run.app
- **API Docs**: https://founders-backend-566998539930.us-central1.run.app/docs
