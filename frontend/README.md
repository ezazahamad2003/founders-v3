# Scopic Frontend

Next.js App Router frontend for **Scopic**. It renders the chat workspace, handles Supabase authentication on the public landing page at `/`, uploads files to Supabase Storage, and streams responses from the FastAPI backend.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # run production build locally
```

## Environment Variables

Create `frontend/.env.local` (never commit secrets) with:

```
NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
NEXT_PUBLIC_API_BASE_URL="http://localhost:8000"
```

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` power Supabase auth + storage uploads.
- `NEXT_PUBLIC_API_BASE_URL` should point at the FastAPI backend (local `http://localhost:8000` or deployed URL).

### Auth notes

- Signup and sign-in live on the public landing page at `/` (no separate `/login` route).
- Signup stores `name` and `law_firm_name` in Supabase user metadata and inserts a matching `profiles` row.
- **TODO:** Re-enable Supabase email confirmations when production-ready. For immediate post-signup access, disable email confirmations in the Supabase Auth dashboard (Authentication → Providers → Email).
- Apply `backend/db/migrations/005_profiles_client_insert_policy.sql` in Supabase if browser-side profile inserts fail under RLS.

## Notes
- UI lives in `src/app` (App Router) and `src/components`.
- `src/hooks/useChat.ts` coordinates streaming chat events and calls the backend via `src/lib/api.ts`.
- Tailwind CSS utilities are defined in `src/app/globals.css` and `tailwind.config.ts`.
