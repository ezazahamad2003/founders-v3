# Vercel Deployment Guide - Scopic Legal Frontend

## Environment Variables Required

When deploying to Vercel, you **MUST** set the following environment variables in your Vercel project settings:

### 1. Backend API URL
```
NEXT_PUBLIC_API_BASE_URL=https://scopic-legal-api-566998539930.us-central1.run.app
```
**Purpose**: Points the frontend to your production FastAPI backend on Google Cloud Run.

### 2. Supabase Project URL
```
NEXT_PUBLIC_SUPABASE_URL=https://vkwinzxslacteeqjpmne.supabase.co
```
**Purpose**: Required for Supabase authentication.

### 3. Supabase Anonymous Key
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrd2luenhzbGFjdGVlcWpwbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDUwNzYsImV4cCI6MjA3OTI4MTA3Nn0.peO1QUFc7UzPfd55RGW4fz2ThTUdMJ18VQ1fRYAyAnM
```
**Purpose**: Public key for Supabase client-side authentication.

### 4. Supabase Storage Bucket
```
NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET=ProfileDrawer
```
**Purpose**: Storage bucket name for profile documents.

---

## How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click on **Settings** tab
3. Click on **Environment Variables** in the left sidebar
4. Add each variable above with its corresponding value
5. Select which environments to apply to (Production, Preview, Development)
6. Click **Save**
7. Redeploy your application for changes to take effect

---

## API Base URL Fallback Logic

The frontend uses intelligent fallback logic for the API base URL:

```typescript
// Priority order:
1. NEXT_PUBLIC_API_BASE_URL env var (if set) ← RECOMMENDED FOR PRODUCTION
2. Auto-detect production URL if hostname is NOT localhost
3. Default to http://localhost:8000 for local development
```

### Local Development
- If `NEXT_PUBLIC_API_BASE_URL` is NOT set, defaults to `http://localhost:8000`
- Perfect for local development with backend running locally

### Production (Vercel)
- **MUST** set `NEXT_PUBLIC_API_BASE_URL` to your Cloud Run backend URL
- Without this, the app will try to auto-detect but may fail
- Always explicitly set this variable for production deployments

---

## Authentication Flow

The app uses **Supabase Auth** for user authentication:

1. **Landing Page** (`/`) - User signs up or signs in via Supabase
2. **Supabase** returns JWT access token
3. **Frontend** stores token in session
4. **Chat Interface** (`/signin`) - Protected by AuthGate component
5. **All API calls** to backend include `Authorization: Bearer <token>` header
6. **Backend** validates JWT and auto-creates user profile

**Important**: The landing page does NOT call the backend API directly. It only uses Supabase Auth. The backend is only called after authentication for chat and profile operations.

---

## Deployment Checklist

- [ ] Set `NEXT_PUBLIC_API_BASE_URL` in Vercel
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` in Vercel
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel
- [ ] Set `NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET` in Vercel
- [ ] Verify backend CORS allows your Vercel domain
- [ ] Test sign-up flow on production
- [ ] Test sign-in flow on production
- [ ] Test chat functionality on production
- [ ] Verify API calls are hitting the correct backend URL

---

## Troubleshooting

### "API base URL is not configured" error
- Check that `NEXT_PUBLIC_API_BASE_URL` is set in Vercel
- Redeploy after setting environment variables

### "Authentication service unavailable" error
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Verify Supabase project is active

### CORS errors
- Ensure backend `ALLOWED_ORIGINS` includes your Vercel deployment URL
- Backend should have regex pattern for `*.vercel.app` domains

### Redirect loop after sign-in
- Verify `/signin` route exists and renders `AuthGate` component
- Check browser console for errors

---

## Backend CORS Configuration (Read-Only Reference)

Your backend should already have CORS configured for Vercel deployments:

```python
# In backend/app/main.py
origin_regex = r"https://.*\.vercel\.app"

application.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,  # Allows all Vercel deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Do NOT modify backend code** - it's already correctly configured.

---

## Testing Production Deployment

After deploying to Vercel:

1. Visit your Vercel deployment URL
2. Open browser DevTools → Network tab
3. Try signing up with a test account
4. Verify you receive Supabase confirmation email
5. Sign in with your credentials
6. Check Network tab for API calls to your backend:
   - Should see calls to `https://scopic-legal-api-566998539930.us-central1.run.app/api/...`
   - All requests should include `Authorization: Bearer ...` header
   - Should receive 200 OK responses

---

## Local Development

For local development, you can use `.env.local`:

```env
# Local backend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Supabase (same for local and production)
NEXT_PUBLIC_SUPABASE_URL=https://vkwinzxslacteeqjpmne.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET=ProfileDrawer
```

Run the app:
```bash
npm run dev
```

The app will automatically use `localhost:8000` for the backend if the env var is not set.
