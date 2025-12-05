# Quick Reference - Scopic Legal Frontend

## 🚀 Vercel Deployment (Copy-Paste Ready)

### Environment Variables
```
NEXT_PUBLIC_API_BASE_URL=https://scopic-legal-api-566998539930.us-central1.run.app
NEXT_PUBLIC_SUPABASE_URL=https://vkwinzxslacteeqjpmne.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrd2luenhzbGFjdGVlcWpwbW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDUwNzYsImV4cCI6MjA3OTI4MTA3Nn0.peO1QUFc7UzPfd55RGW4fz2ThTUdMJ18VQ1fRYAyAnM
NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET=ProfileDrawer
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/lib/api.ts` | Centralized API client with smart URL detection |
| `src/components/LandingPage.tsx` | Landing page with sign-up/sign-in (uses Supabase Auth) |
| `src/components/AuthGate.tsx` | Auth wrapper for chat interface |
| `src/hooks/useChat.ts` | Chat functionality (uses API client) |
| `.env.local` | Local development environment variables |
| `.env.example` | Template for environment variables |

## 🔄 API Base URL Logic

```
Priority Order:
1. NEXT_PUBLIC_API_BASE_URL env var (if set) ← RECOMMENDED
2. Auto-detect: If hostname ≠ localhost → Use production URL
3. Default: localhost:8000 (local development)
```

## 🔐 Authentication Flow

```
Landing Page (/) 
  ↓ Supabase Auth
JWT Token
  ↓ Store in session
Chat Interface (/signin)
  ↓ AuthGate validates
API Calls with Bearer token
  ↓ Backend validates JWT
User Profile & Chat
```

## 🛠️ Local Development

```bash
# Start backend (in backend folder)
python -m uvicorn app.main:app --reload --port 8000

# Start frontend (in frontend folder)
npm run dev
```

## ✅ Deployment Checklist

- [ ] Set 4 environment variables in Vercel
- [ ] Deploy to Vercel
- [ ] Test sign-up flow
- [ ] Test sign-in flow
- [ ] Verify API calls hit Cloud Run backend
- [ ] Check browser console for errors

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "API base URL not configured" | Set `NEXT_PUBLIC_API_BASE_URL` in Vercel |
| "Authentication service unavailable" | Check Supabase env vars are set |
| CORS errors | Backend already configured - check URL is correct |
| Redirect loop | Verify `/signin` route exists |

## 📞 API Endpoints (Backend)

All require `Authorization: Bearer <token>` header:

- `GET /api/me` - User profile
- `POST /api/accept-tos` - Accept TOS
- `GET /api/conversations` - List conversations
- `POST /api/chat` - Stream chat
- `POST /api/files/upload` - Upload file

## 📚 Documentation

- `VERCEL_DEPLOYMENT.md` - Full deployment guide
- `API_CONNECTION_FIX_SUMMARY.md` - What was fixed and why
- `.env.example` - Environment variable template
