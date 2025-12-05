# Custom Domain Setup Guide

## Overview

Your application is now configured to use the custom domain **scopiclegal.com** instead of the Vercel URLs.

---

## ✅ Backend Configuration (Complete)

### CORS Settings
The backend now allows requests from:
- `https://scopiclegal.com`
- `https://www.scopiclegal.com`

**File:** `backend/env.yaml`
```yaml
ALLOWED_ORIGINS: "https://scopiclegal.com,https://www.scopiclegal.com"
```

**Deployed to:** `https://scopic-legal-api-566998539930.us-central1.run.app`

---

## ✅ Frontend Configuration (Complete)

### Environment Variables
**File:** `frontend/.env.production`
```env
NEXT_PUBLIC_API_BASE_URL=https://scopic-legal-api-566998539930.us-central1.run.app
NEXT_PUBLIC_SITE_URL=https://www.scopiclegal.com
```

---

## 🔧 Required Steps to Complete Setup

### 1. Configure Custom Domain in Vercel

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: `founders-v3`

2. **Add Custom Domain:**
   - Go to **Settings → Domains**
   - Click **Add Domain**
   - Add: `scopiclegal.com`
   - Add: `www.scopiclegal.com`

3. **Configure DNS Records:**
   
   In your domain registrar (where you bought scopiclegal.com), add these DNS records:

   **For `scopiclegal.com` (root domain):**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```

   **For `www.scopiclegal.com`:**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

4. **Wait for DNS Propagation:**
   - Usually takes 5-60 minutes
   - Can take up to 48 hours in rare cases
   - Check status: https://www.whatsmydns.net/

5. **Verify SSL Certificate:**
   - Vercel automatically provisions SSL certificates
   - Your site will be available at `https://www.scopiclegal.com`

---

### 2. Update Supabase Configuration

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/vkwinzxslacteeqjpmne

2. **Navigate to Authentication → URL Configuration**

3. **Update Site URL:**
   ```
   https://www.scopiclegal.com
   ```

4. **Update Redirect URLs:**
   Add these URLs to the allowlist:
   ```
   https://scopiclegal.com/**
   https://www.scopiclegal.com/**
   http://localhost:3000/**
   http://localhost:3001/**
   http://localhost:3002/**
   http://localhost:3003/**
   http://localhost:3004/**
   ```

5. **Click Save**

---

## 🧪 Testing After Domain Setup

### 1. Test Frontend
```bash
# Visit your custom domain
https://www.scopiclegal.com
```

### 2. Test Backend CORS
```bash
# Should return Access-Control-Allow-Origin header
curl -H "Origin: https://www.scopiclegal.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS -I \
     https://scopic-legal-api-566998539930.us-central1.run.app/health
```

### 3. Test Password Reset
1. Go to `https://www.scopiclegal.com/forgot-password`
2. Enter your email
3. Check that the reset link points to `https://www.scopiclegal.com/reset-password`

---

## 📋 Current Architecture

```
User Browser
    ↓
https://www.scopiclegal.com (Frontend - Vercel)
    ↓
API calls to
    ↓
https://scopic-legal-api-566998539930.us-central1.run.app (Backend - GCP Cloud Run)
    ↓
Connects to
    ↓
Supabase PostgreSQL Database
    ↓
Calls
    ↓
OpenAI API (gpt-5.1)
```

---

## 🔒 Security Notes

- ✅ HTTPS enforced on all domains
- ✅ CORS configured for custom domain only
- ✅ Supabase redirect URLs restricted to known domains
- ✅ Backend secrets stored in GCP Secret Manager

---

## 🚀 Deployment Status

- ✅ Backend deployed with custom domain CORS
- ✅ Frontend configured for custom domain
- ✅ All changes committed and pushed to main
- ⏳ Waiting for DNS configuration (you need to do this)
- ⏳ Waiting for Supabase URL update (you need to do this)

---

## 📞 Support

If you encounter any issues:
1. Check DNS propagation: https://www.whatsmydns.net/
2. Verify Vercel domain settings
3. Check browser console for CORS errors
4. View backend logs: `gcloud run services logs read scopic-legal-api --region=us-central1 --limit=50`
