# Frontend-Backend Connection Guide

## Architecture Overview

The application uses a **Supabase-based authentication** flow where:
1. Frontend authenticates users via Supabase Auth
2. Frontend receives JWT access tokens from Supabase
3. Frontend sends these tokens to the FastAPI backend
4. Backend validates tokens and auto-creates user profiles

## Current Setup

### Frontend (Next.js 14.2.4)
- **Port**: 3003 (auto-selected, can be 3000-3003)
- **Framework**: Next.js with App Router
- **Auth**: Supabase Auth (client-side)
- **API Client**: Custom fetch wrapper in `src/lib/api.ts`

### Backend (FastAPI)
- **Port**: 8000
- **Framework**: FastAPI with async SQLAlchemy
- **Auth**: JWT validation via Supabase JWKS
- **Database**: PostgreSQL (Supabase-hosted)

## Environment Configuration

### Frontend `.env.local`
```env
# Backend API
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://vkwinzxslacteeqjpmne.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET=ProfileDrawer
```

### Backend `.env`
```env
# Supabase Database
SUPABASE_DB_URL=postgresql://postgres:...@db.vkwinzxslacteeqjpmne.supabase.co:5432/postgres

# Supabase Auth
SUPABASE_JWKS_URL=https://vkwinzxslacteeqjpmne.supabase.co/auth/v1/certs
SUPABASE_JWT_SECRET=W0MAFNAMTuM...
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003
```

## Authentication Flow

### 1. User Sign-Up/Sign-In (Frontend)
```typescript
// In LandingPage.tsx or AuthGate.tsx
const supabase = supabaseBrowserClient();

// Sign Up
await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
  options: {
    data: {
      full_name: formData.fullName,
      company_name: formData.companyName,
      referral_source: formData.referralSource,
    },
  },
});

// Sign In
await supabase.auth.signInWithPassword({
  email: formData.email,
  password: formData.password,
});
```

### 2. Token Management (Frontend)
```typescript
// Get session and access token
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.access_token;
```

### 3. API Requests (Frontend)
```typescript
// All API calls include the JWT token
const response = await fetch(`${API_BASE_URL}/api/me`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
});
```

### 4. Token Validation (Backend)
```python
# In app/auth.py
async def get_current_user(
    authorization: str = Header(..., alias="Authorization"),
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    # Extract token from "Bearer <token>"
    token = _extract_bearer_token(authorization)
    
    # Verify JWT using Supabase JWKS or secret
    claims = await verify_jwt(token, settings)
    
    # Extract user info from claims
    user_id = UUID(claims["sub"])
    email = claims.get("email")
    user_metadata = claims.get("user_metadata", {})
    
    # Auto-create profile if doesn't exist
    profile = await _get_or_create_profile(db, user_id, email, user_metadata)
    
    return CurrentUser(
        id=user_id,
        email=profile["email"],
        role=profile["role"],
        accepted_tos_at=profile["accepted_tos_at"],
    )
```

## API Endpoints

### User Endpoints
- `GET /api/me` - Get current user profile
- `POST /api/accept-tos` - Accept terms of service

### Conversation Endpoints
- `GET /api/conversations` - List user's conversations
- `GET /api/conversations/{id}` - Get conversation details
- `DELETE /api/conversations/{id}` - Delete conversation

### Chat Endpoints
- `POST /api/chat` - Stream chat responses (SSE)

### File Endpoints
- `POST /api/files/upload` - Upload file to OpenAI + Supabase
- `POST /api/files/register` - Register existing files

## CORS Configuration

The backend allows requests from:
- `http://localhost:3000-3003` (development)
- `http://127.0.0.1:3000-3003` (development)
- `https://*.vercel.app` (production - regex pattern)
- Custom origins from `ALLOWED_ORIGINS` env var

## Database Schema

### Profiles Table
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,  -- Matches Supabase auth.users.id
    email TEXT,
    full_name TEXT,
    company_name TEXT,
    referral_source TEXT,
    role TEXT DEFAULT 'client',
    accepted_tos_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

The backend automatically creates/updates profiles when users authenticate for the first time.

## Running the Application

### Start Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### Start Frontend
```bash
cd frontend
npm run dev
```

The frontend will auto-select an available port (3000-3003).

## Key Files

### Frontend
- `src/lib/supabase/client.ts` - Supabase client initialization
- `src/lib/api.ts` - API client with auth headers
- `src/components/LandingPage.tsx` - Landing page with sign-up/sign-in
- `src/components/AuthGate.tsx` - Auth wrapper for chat interface
- `src/components/ChatLayout.tsx` - Main chat interface

### Backend
- `app/main.py` - FastAPI app initialization and CORS
- `app/auth.py` - JWT validation and user management
- `app/routers/user.py` - User profile endpoints
- `app/routers/chat.py` - Chat streaming endpoints
- `app/routers/conversations.py` - Conversation management

## Troubleshooting

### "Module not found: Can't resolve '@/lib/supabase/client'"
- Ensure `src/lib/supabase/client.ts` exists
- Check that `supabaseBrowserClient` is exported as a function

### "CORS error"
- Verify backend is running on port 8000
- Check `ALLOWED_ORIGINS` includes your frontend port
- Ensure frontend URL matches exactly (http vs https, port number)

### "Authentication service unavailable"
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Verify Supabase project is active

### "INVALID_TOKEN" from backend
- Check `SUPABASE_JWT_SECRET` and `SUPABASE_JWKS_URL` are correct
- Ensure token is being sent in Authorization header
- Verify token hasn't expired

## Production Deployment

### Frontend (Vercel)
- Set environment variables in Vercel dashboard
- Update `NEXT_PUBLIC_API_BASE_URL` to production backend URL

### Backend (Google Cloud Run)
- Deploy using `deploy-cloudrun.ps1`
- Update frontend `NEXT_PUBLIC_API_BASE_URL` to Cloud Run URL
- Ensure CORS includes Vercel deployment URL

## Security Notes

1. **Never commit `.env` files** - Use `.env.example` as template
2. **JWT tokens are short-lived** - Supabase handles refresh automatically
3. **Backend validates all tokens** - No trust in frontend
4. **User metadata is extracted from JWT** - Stored in profiles table
5. **CORS is strictly configured** - Only allowed origins can access API
