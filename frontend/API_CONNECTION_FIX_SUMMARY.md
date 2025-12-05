# API Connection Fix Summary

## Problem Identified

The frontend was missing a robust API base URL fallback mechanism for production deployments. While the API client (`lib/api.ts`) was correctly structured, it only relied on the `NEXT_PUBLIC_API_BASE_URL` environment variable without any fallback logic.

### Issues Found:
1. **No production fallback**: If env var wasn't set on Vercel, API calls would fail
2. **No auto-detection**: App couldn't automatically determine if running in production vs local
3. **Unclear documentation**: `.env.example` didn't clearly explain deployment requirements

## What Was Broken

- **API client** (`lib/api.ts`): Only read from env var, no fallback logic
- **Environment config**: Insufficient documentation for Vercel deployment
- **No centralized URL helper**: Missing `getApiBaseUrl()` function with smart detection

## Files Modified

### 1. `src/lib/api.ts`
**Changes:**
- Added `getApiBaseUrl()` function with intelligent fallback logic
- Exported `API_BASE_URL` constant for use across the app
- Added priority system: env var → production URL → local dev URL
- Added comprehensive comments explaining the logic

**Key Addition:**
```typescript
export const getApiBaseUrl = (): string => {
  // 1. Prefer explicit env var if set
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  // 2. In browser, detect if we're in production
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return PROD_API_URL; // Cloud Run URL
    }
  }

  // 3. Default to local development
  return DEFAULT_LOCAL_API_URL; // localhost:8000
};
```

### 2. `.env.example`
**Changes:**
- Added comprehensive documentation for each environment variable
- Added Vercel deployment instructions section
- Clarified which variables are required vs optional
- Added examples and explanations

### 3. `VERCEL_DEPLOYMENT.md` (NEW)
**Purpose:** Complete guide for deploying to Vercel
**Contents:**
- Required environment variables with exact values
- Step-by-step Vercel configuration instructions
- Authentication flow explanation
- Deployment checklist
- Troubleshooting guide
- Testing instructions

## Files NOT Modified (Correctly Using API Client)

These files are already correctly implemented:

- ✅ `src/components/LandingPage.tsx` - Uses Supabase Auth (correct, no backend API needed)
- ✅ `src/components/AuthGate.tsx` - Uses Supabase Auth (correct)
- ✅ `src/hooks/useChat.ts` - Imports from `@/lib/api` (correct)
- ✅ `src/app/signin/page.tsx` - Renders AuthGate (correct)

## How It Works Now

### Local Development
```
1. Developer runs `npm run dev`
2. getApiBaseUrl() detects hostname = 'localhost'
3. Returns DEFAULT_LOCAL_API_URL = 'http://localhost:8000'
4. All API calls go to local backend
```

### Production (Vercel)
```
1. User visits Vercel deployment (e.g., scopic-legal.vercel.app)
2. getApiBaseUrl() checks NEXT_PUBLIC_API_BASE_URL env var
3. If set: Uses that value (recommended)
4. If not set: Detects hostname !== 'localhost', returns PROD_API_URL
5. All API calls go to Cloud Run backend
```

## Vercel Environment Variables Required

Set these in Vercel project settings:

```env
NEXT_PUBLIC_API_BASE_URL=https://scopic-legal-api-566998539930.us-central1.run.app
NEXT_PUBLIC_SUPABASE_URL=https://vkwinzxslacteeqjpmne.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET=ProfileDrawer
```

## Authentication Flow (No Changes Needed)

The authentication flow is **already correct** and was not modified:

1. **Landing Page** (`/`) → User signs up/in via **Supabase Auth**
2. Supabase returns JWT access token
3. Frontend stores token in session
4. User redirected to `/signin` (chat interface)
5. **AuthGate** component verifies authentication
6. **All API calls** to backend include `Authorization: Bearer <token>` header
7. Backend validates JWT and returns data

**Important**: The landing page does NOT call the backend API. It only uses Supabase for authentication. The backend is only called AFTER authentication for chat operations.

## API Endpoints Used (Reference)

The frontend calls these backend endpoints (all require JWT token):

- `GET /api/me` - Get current user profile
- `POST /api/accept-tos` - Accept terms of service
- `GET /api/conversations` - List conversations
- `GET /api/conversations/{id}` - Get conversation details
- `POST /api/chat` - Stream chat responses
- `POST /api/files/upload` - Upload files
- `DELETE /api/conversations/{id}` - Delete conversation

## CORS Configuration (Backend - Read Only)

The backend is already correctly configured with CORS:

```python
# Allows all Vercel deployments
origin_regex = r"https://.*\.vercel\.app"

# Allows localhost for development
origins = [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://localhost:3002",
    "http://localhost:3003"
]
```

**No backend changes needed** - CORS is already set up correctly.

## Testing Checklist

### Local Development
- [x] Backend running on `localhost:8000`
- [x] Frontend running on `localhost:3003`
- [x] API calls go to `http://localhost:8000`
- [x] Sign-up/sign-in works via Supabase
- [x] Chat interface loads after authentication

### Production (Vercel)
- [ ] Set all environment variables in Vercel
- [ ] Deploy to Vercel
- [ ] Test sign-up flow
- [ ] Test sign-in flow
- [ ] Verify API calls go to Cloud Run backend
- [ ] Check browser console for errors
- [ ] Test chat functionality

## Summary

### What Was Fixed
✅ Added intelligent API base URL detection  
✅ Created production fallback mechanism  
✅ Improved environment variable documentation  
✅ Created comprehensive Vercel deployment guide  

### What Was NOT Changed (Already Correct)
✅ Landing page authentication flow (uses Supabase)  
✅ API client structure and endpoints  
✅ Backend CORS configuration  
✅ Component imports and routing  

### Next Steps
1. Set environment variables in Vercel (see `VERCEL_DEPLOYMENT.md`)
2. Deploy to Vercel
3. Test production deployment
4. Monitor for any CORS or API connection issues

---

**Status**: ✅ Frontend API connectivity is now properly configured for both local development and production deployment.
