# GCP App Engine Deployment Guide

This guide will help you deploy the FastAPI backend to Google Cloud Platform (GCP) App Engine.

## Prerequisites

1. **Google Cloud Account**: You need a GCP account with billing enabled
2. **gcloud CLI**: Install the Google Cloud SDK from https://cloud.google.com/sdk/docs/install
3. **GCP Project**: Create a project in GCP Console or use an existing one

## Initial Setup

### 1. Install gcloud CLI (if not already installed)

Download and install from: https://cloud.google.com/sdk/docs/install

### 2. Authenticate with GCP

```powershell
gcloud auth login
```

### 3. Set Your GCP Project

```powershell
# List your projects
gcloud projects list

# Set the project you want to use
gcloud config set project YOUR_PROJECT_ID
```

### 4. Enable Required APIs

```powershell
# Enable App Engine Admin API
gcloud services enable appengine.googleapis.com

# Enable Cloud Build API (for deployment)
gcloud services enable cloudbuild.googleapis.com
```

### 5. Initialize App Engine (First Time Only)

```powershell
# Initialize App Engine in your project
# Choose a region when prompted (e.g., us-central)
gcloud app create
```

## Deployment

### Option 1: Using the Deployment Script (Recommended)

Simply run the PowerShell script:

```powershell
cd backend
.\deploy.ps1
```

The script will:
- Check if gcloud is installed
- Verify authentication
- Confirm your GCP project
- Deploy the application
- Show you the live URL

### Option 2: Manual Deployment

```powershell
cd backend
gcloud app deploy app.yaml --quiet
```

## Post-Deployment

### View Your Application

```powershell
# Open in browser
gcloud app browse

# Or manually visit
# https://YOUR_PROJECT_ID.uc.r.appspot.com
```

### View API Documentation

Visit: `https://YOUR_PROJECT_ID.uc.r.appspot.com/docs`

### Monitor Logs

```powershell
# Stream logs in real-time
gcloud app logs tail -s default

# View recent logs
gcloud app logs read
```

### Check Application Status

```powershell
gcloud app describe
```

## Configuration

### Environment Variables

All environment variables are configured in `app.yaml`. The current configuration includes:

- **OpenAI API**: API key and model configurations
- **Supabase**: Database and authentication settings
- **CORS**: Allowed origins for frontend access
- **App Settings**: Max history messages, output tokens, etc.

### Scaling Configuration

The app is configured with automatic scaling:
- **Instance Class**: F2 (512MB RAM, 1.2GHz CPU)
- **Min Instances**: 1 (always at least one instance running)
- **Max Instances**: 10 (scales up to 10 instances under load)
- **Target CPU**: 65% utilization

To modify scaling, edit `app.yaml`:

```yaml
automatic_scaling:
  target_cpu_utilization: 0.65
  min_instances: 1
  max_instances: 10
```

## Updating the Application

To deploy updates:

```powershell
# Make your code changes, then deploy
.\deploy.ps1

# Or manually
gcloud app deploy app.yaml --quiet
```

## Cost Management

### Reduce Costs

If you want to reduce costs, you can:

1. **Reduce min_instances to 0** (but first request will be slower):
   ```yaml
   automatic_scaling:
     min_instances: 0
   ```

2. **Use a smaller instance class**:
   ```yaml
   instance_class: F1  # 256MB RAM, 600MHz CPU
   ```

### Monitor Costs

View your costs in the GCP Console:
- https://console.cloud.google.com/billing

## Troubleshooting

### Deployment Fails

1. **Check logs**:
   ```powershell
   gcloud app logs read
   ```

2. **Verify APIs are enabled**:
   ```powershell
   gcloud services list --enabled
   ```

3. **Check quotas**:
   Visit: https://console.cloud.google.com/iam-admin/quotas

### Application Errors

1. **View real-time logs**:
   ```powershell
   gcloud app logs tail -s default
   ```

2. **Check environment variables** in GCP Console:
   - Go to App Engine → Settings → Environment variables

### Connection Issues

1. **Verify CORS settings** in `app.yaml`
2. **Check Supabase connection** from GCP (firewall rules)
3. **Verify OpenAI API key** is valid

## Security Best Practices

### Use Secret Manager (Recommended for Production)

Instead of storing secrets in `app.yaml`, use GCP Secret Manager:

1. **Create secrets**:
   ```powershell
   echo -n "your-openai-key" | gcloud secrets create openai-api-key --data-file=-
   ```

2. **Grant access**:
   ```powershell
   gcloud secrets add-iam-policy-binding openai-api-key \
     --member="serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. **Update code** to read from Secret Manager

### Rotate API Keys Regularly

- OpenAI API keys
- Supabase JWT secrets
- Database passwords

## Useful Commands

```powershell
# View all versions
gcloud app versions list

# Delete old versions
gcloud app versions delete VERSION_ID

# View services
gcloud app services list

# View instances
gcloud app instances list

# SSH into an instance (for debugging)
gcloud app instances ssh INSTANCE_ID

# Set traffic split (for gradual rollouts)
gcloud app services set-traffic default --splits=v1=0.5,v2=0.5
```

## Support

- **GCP Documentation**: https://cloud.google.com/appengine/docs
- **FastAPI Documentation**: https://fastapi.tiangolo.com
- **Supabase Documentation**: https://supabase.com/docs

## Next Steps

1. **Set up CI/CD**: Automate deployments with GitHub Actions or Cloud Build
2. **Configure Custom Domain**: Add your own domain name
3. **Set up Monitoring**: Use Cloud Monitoring for alerts
4. **Enable Cloud CDN**: For better performance globally
5. **Implement Secret Manager**: For better security
