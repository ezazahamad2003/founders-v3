# 🚀 Google Cloud Platform (GCP) Deployment Guide
## Scopic Legal Backend - FastAPI

---

## 📋 Prerequisites

Before deploying, ensure you have:

- [ ] Google Cloud account with billing enabled
- [ ] GCP project created
- [ ] `gcloud` CLI installed on your machine
- [ ] Supabase database accessible from internet
- [ ] All environment variables ready

---

## 🛠️ Step 1: Install Google Cloud SDK

If you haven't installed the `gcloud` CLI:

### Windows:
```powershell
# Download and run the installer
# https://cloud.google.com/sdk/docs/install#windows

# Or use Chocolatey
choco install gcloudsdk
```

### macOS:
```bash
brew install --cask google-cloud-sdk
```

### Linux:
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

---

## 🔐 Step 2: Initialize and Authenticate

```bash
# Initialize gcloud
gcloud init

# Follow the prompts to:
# 1. Log in to your Google account
# 2. Select or create a GCP project
# 3. Set default region (e.g., us-central1)

# Verify authentication
gcloud auth list

# Set your project (replace with your project ID)
gcloud config set project YOUR_PROJECT_ID
```

---

## 🌐 Step 3: Enable Required APIs

```bash
# Enable App Engine API
gcloud services enable appengine.googleapis.com

# Enable Cloud Build API (for deployments)
gcloud services enable cloudbuild.googleapis.com

# Enable Secret Manager API (for environment variables)
gcloud services enable secretmanager.googleapis.com
```

---

## 🏗️ Step 4: Create App Engine Application

```bash
# Create App Engine app (one-time setup)
# Choose a region close to your users
gcloud app create --region=us-central

# Common regions:
# us-central (Iowa)
# us-east1 (South Carolina)
# europe-west1 (Belgium)
# asia-northeast1 (Tokyo)
```

---

## 🔑 Step 5: Set Environment Variables

### Option A: Using Secret Manager (Recommended for Production)

```bash
# Navigate to backend directory
cd backend

# Create secrets for sensitive data
echo -n "YOUR_OPENAI_API_KEY" | gcloud secrets create OPENAI_API_KEY --data-file=-
echo -n "YOUR_SUPABASE_ANON_KEY" | gcloud secrets create SUPABASE_ANON_KEY --data-file=-
echo -n "YOUR_SUPABASE_JWT_SECRET" | gcloud secrets create SUPABASE_JWT_SECRET --data-file=-
echo -n "YOUR_SUPABASE_DB_URL" | gcloud secrets create SUPABASE_DB_URL --data-file=-

# Grant App Engine access to secrets
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding SUPABASE_ANON_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding SUPABASE_JWT_SECRET \
  --member="serviceAccount:${PROJECT_NUMBER}@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding SUPABASE_DB_URL \
  --member="serviceAccount:${PROJECT_NUMBER}@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Option B: Using app.yaml (Quick Setup, Less Secure)

Edit `backend/app.yaml` and add your environment variables:

```yaml
env_variables:
  APP_ENV: "production"
  OPENAI_API_KEY: "your-openai-key"
  SUPABASE_URL: "https://your-project.supabase.co"
  SUPABASE_ANON_KEY: "your-anon-key"
  SUPABASE_JWT_SECRET: "your-jwt-secret"
  SUPABASE_JWKS_URL: "https://your-project.supabase.co/auth/v1/certs"
  SUPABASE_DB_URL: "postgresql+asyncpg://postgres:password@host:5432/postgres"
  SUPABASE_STORAGE_BUCKET_NAME: "uploads"
  SUPABASE_STORAGE_PUBLIC_BASE_URL: "https://your-project.supabase.co/storage/v1/object/public"
  ALLOWED_ORIGINS: "https://your-frontend-url.com"
  FRONTEND_URL: "https://your-frontend-url.com"
  BACKEND_URL: "https://your-project.uc.r.appspot.com"
  MAX_HISTORY_MESSAGES: "30"
  MAX_OUTPUT_TOKENS: "4096"
  OPENAI_MODEL_CHAT: "gpt-4o-mini"
  OPENAI_MODEL_VISION: "gpt-4o-mini"
  OPENAI_MODEL_DEEP_RESEARCH: "gpt-4o"
```

⚠️ **Warning:** Don't commit sensitive keys to Git!

---

## 📦 Step 6: Deploy to App Engine

```bash
# Make sure you're in the backend directory
cd backend

# Deploy the application
gcloud app deploy app.yaml

# You'll be prompted to confirm:
# - Service: default
# - Region: your-selected-region
# - Type 'y' to proceed

# Deployment typically takes 3-5 minutes
```

**Expected Output:**
```
Deployed service [default] to [https://YOUR_PROJECT_ID.uc.r.appspot.com]
```

---

## 🔍 Step 7: Verify Deployment

### Check Deployment Status

```bash
# View recent deployments
gcloud app versions list

# Check service status
gcloud app services list

# View logs
gcloud app logs tail -s default
```

### Test the API

```bash
# Get your app URL
gcloud app browse

# Test health endpoint
curl https://YOUR_PROJECT_ID.uc.r.appspot.com/health

# Expected response:
# {"status":"healthy"} or similar
```

### Test API Documentation

Visit: `https://YOUR_PROJECT_ID.uc.r.appspot.com/docs`

You should see the FastAPI Swagger UI.

---

## 🔧 Step 8: Configure CORS

Update your `ALLOWED_ORIGINS` environment variable to include your frontend URL:

```bash
# If using Secret Manager
echo -n "https://your-frontend-url.com" | gcloud secrets create ALLOWED_ORIGINS --data-file=-

# Or update app.yaml and redeploy
gcloud app deploy
```

---

## 📊 Step 9: Monitor Your Application

### View Logs

```bash
# Real-time logs
gcloud app logs tail -s default

# Logs from last hour
gcloud app logs read --limit=50

# Filter by severity
gcloud app logs read --severity=ERROR
```

### View Metrics

```bash
# Open Cloud Console
gcloud app open-console

# Navigate to:
# App Engine → Dashboard
# - Request rate
# - Latency
# - Errors
# - Instance usage
```

---

## 🔄 Step 10: Update Frontend Configuration

After deployment, update your frontend to use the new backend URL:

**File:** `frontend/.env.local` or `frontend/.env.production`

```bash
NEXT_PUBLIC_API_BASE_URL=https://YOUR_PROJECT_ID.uc.r.appspot.com
```

Then redeploy your frontend.

---

## 🚀 Step 11: Deploy Updates

When you make changes to the backend:

```bash
# 1. Commit your changes
git add .
git commit -m "your changes"
git push

# 2. Navigate to backend directory
cd backend

# 3. Deploy
gcloud app deploy

# The new version will automatically become the default
```

---

## 🔐 Security Best Practices

### 1. Use Secret Manager

Don't store sensitive data in `app.yaml`. Use Secret Manager instead.

### 2. Enable HTTPS Only

App Engine enforces HTTPS by default, but verify:

```yaml
# In app.yaml
handlers:
- url: /.*
  secure: always
  script: auto
```

### 3. Restrict Access

If needed, use Identity-Aware Proxy (IAP):

```bash
gcloud app services update default --no-allow-unauthenticated
```

### 4. Set Up Firewall Rules

```bash
# Allow only specific IPs if needed
gcloud app firewall-rules create 1000 \
  --action=ALLOW \
  --source-range=YOUR_IP_RANGE \
  --description="Allow specific IPs"
```

---

## 💰 Cost Optimization

### Monitor Costs

```bash
# View billing
gcloud billing accounts list

# Set budget alerts in Cloud Console
# Billing → Budgets & alerts
```

### Optimize Instance Usage

Edit `app.yaml`:

```yaml
automatic_scaling:
  target_cpu_utilization: 0.65
  min_instances: 1        # Reduce to 0 for dev
  max_instances: 10       # Adjust based on traffic
  min_idle_instances: 0   # Reduce idle instances
  max_idle_instances: 1
```

### Use Smaller Instance Class

For lower traffic:

```yaml
instance_class: F1  # Smallest (cheapest)
# F1: 256 MB, 600 MHz
# F2: 512 MB, 1.2 GHz (default)
# F4: 1 GB, 2.4 GHz
```

---

## 🐛 Troubleshooting

### Issue 1: Deployment Fails

**Error:** "Build failed"

**Solution:**
```bash
# Check requirements.txt is correct
cat requirements.txt

# Verify Python version in app.yaml
# runtime: python313

# Check build logs
gcloud app logs read --limit=50
```

---

### Issue 2: Database Connection Fails

**Error:** "Can't connect to Supabase database"

**Solution:**
1. Verify `SUPABASE_DB_URL` is correct
2. Check Supabase allows connections from GCP IPs
3. Test connection:
   ```bash
   gcloud app logs tail -s default | grep -i "database\|connection"
   ```

---

### Issue 3: 502 Bad Gateway

**Error:** App returns 502

**Solution:**
1. Check if app is listening on `$PORT`:
   ```python
   # In app.yaml
   entrypoint: uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
2. Verify app starts successfully:
   ```bash
   gcloud app logs tail -s default
   ```

---

### Issue 4: Import Errors

**Error:** "ModuleNotFoundError"

**Solution:**
1. Ensure all dependencies in `requirements.txt`
2. Check `.gcloudignore` isn't excluding needed files
3. Verify Python path is correct

---

## 📈 Scaling Configuration

### For High Traffic

```yaml
automatic_scaling:
  target_cpu_utilization: 0.65
  min_instances: 3
  max_instances: 50
  target_throughput_utilization: 0.75
  max_concurrent_requests: 80
```

### For Low Traffic / Development

```yaml
automatic_scaling:
  target_cpu_utilization: 0.65
  min_instances: 0  # Scale to zero when idle
  max_instances: 3
```

---

## 🔗 Useful Commands Reference

```bash
# View app info
gcloud app describe

# Open app in browser
gcloud app browse

# View versions
gcloud app versions list

# Delete old versions
gcloud app versions delete VERSION_ID

# View instances
gcloud app instances list

# SSH into instance (for debugging)
gcloud app instances ssh INSTANCE_ID

# Set default version
gcloud app versions migrate VERSION_ID

# Stop a version
gcloud app versions stop VERSION_ID
```

---

## 📞 Next Steps

After successful deployment:

1. **Test the API**
   - Visit: `https://YOUR_PROJECT_ID.uc.r.appspot.com/docs`
   - Test health endpoint
   - Test authentication endpoints

2. **Update Frontend**
   - Set `NEXT_PUBLIC_API_BASE_URL` to your GCP URL
   - Redeploy frontend

3. **Update Supabase**
   - Add GCP URL to allowed origins
   - Update redirect URLs if needed

4. **Monitor**
   - Set up logging alerts
   - Configure budget alerts
   - Monitor error rates

5. **Document**
   - Save your GCP project ID
   - Document environment variables
   - Note the deployed URL

---

## 🎉 Deployment Complete!

Your backend is now running on Google Cloud Platform!

**Your API URL:** `https://YOUR_PROJECT_ID.uc.r.appspot.com`

**API Documentation:** `https://YOUR_PROJECT_ID.uc.r.appspot.com/docs`

---

## 📚 Additional Resources

- [App Engine Python Docs](https://cloud.google.com/appengine/docs/standard/python3)
- [Secret Manager Docs](https://cloud.google.com/secret-manager/docs)
- [App Engine Pricing](https://cloud.google.com/appengine/pricing)
- [Monitoring & Logging](https://cloud.google.com/appengine/docs/standard/python3/logs)

