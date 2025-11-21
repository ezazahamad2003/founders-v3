# Background and Motivation
- Build the Scopic Legal backend (FastAPI + Supabase + OpenAI) so clients can run ChatGPT-style conversations with file/vision/deep research support while preserving all data for a future lawyer portal.
- Deliver production-ready artifacts (app code, schema, Dockerfile, README, env template) per detailed spec.

# Key Challenges and Analysis
- Enforce conversation/file ownership while keeping the DB/API fast enough for ChatGPT-like latency.
- Implement Supabase JWT auth + auto profile upsert once, reusing it across all routers.
- Stream OpenAI tokens while persisting complete assistant responses and token metadata.
- Keep architecture extensible for upcoming lawyer portal (role-aware access, assigned_lawyer_id).

# High-level Task Breakdown
1. **bootstrap-structure** — Create backend skeleton (`app/`, routers/ services folders, infra files, db schema stub, Dockerfile, requirements, README, .env.example). *Success:* repo tree matches spec; FastAPI imports resolve.
2. **core-infra-modules** — Implement config, db engine/session, auth (Supabase JWT), Pydantic schemas, and OpenAI client wrappers. *Success:* `uvicorn app.main:app` can start (with stub creds) and modules import cleanly.
3. **services-implementation** — Build conversation/message/file service helpers with ownership checks and history logic. *Success:* Routers can rely on services to enforce invariants and return structured data.
4. **routers-and-streaming** — Implement all routers and chat streaming endpoint plus `main.py` wiring (CORS, exception handlers). *Success:* `/health` works unauthenticated; `/api/*` enforce auth+TOS; `/api/chat` streams and persists.
5. **docs-and-validation** — Finalize `db/schema.sql`, `.env.example`, README instructions, and any sanity checks. *Success:* Another engineer can provision DB, configure env, run server, and hit sample endpoints.

# Project Status Board
- [x] bootstrap-structure
- [x] core-infra-modules
- [x] services-implementation
- [x] routers-and-streaming
- [x] docs-and-validation

# Current Status / Progress Tracking
- 2025-11-21: Executor mode engaged, preparing to start **bootstrap-structure**.
- 2025-11-21: Completed filesystem scaffolding, placeholder modules, env template, Dockerfile, requirements, and README per **bootstrap-structure** (awaiting review).
- 2025-11-21: Implemented config, DB session factory, Supabase JWT auth/upsert, full Pydantic schemas, and OpenAI wrappers (standard + vision/files/deep research + streaming) for **core-infra-modules**.
- 2025-11-21: Delivered conversation/message/file services + all routers (health/user/conversations/files/chat) with streaming `/api/chat` that routes between chat/vision/files/deep research and persists assistant metadata.
- 2025-11-21: Finalized `db/schema.sql`, expanded `README.md` with step-by-step setup/run instructions, and confirmed `.env.example` env var coverage for **docs-and-validation**.
- 2025-11-21: Added optional `tests/` folder with smoke tests + README so QA scripts remain isolated and can be deleted when not needed.
- 2025-11-21: Executor investigating Supabase Storage RLS upload failures from ChatInput; updated uploader to derive path prefix from `supabase.auth.getSession()` but Supabase Storage still returning 400. Need actual policy listing to verify configuration.
- 2025-11-21: Added profile document drawer in sidebar allowing authenticated users to upload/view personal files separately from chat attachments using Supabase Storage.

# Executor's Feedback or Assistance Requests
- Supabase Storage insert policies still blocking uploads; advised user to keep only one `to public` policy with `auth.role()='authenticated'` but waiting on confirmation.

# Lessons
- Include debugging-friendly info in program output/logs.
- Always read files before editing them.
- Run `npm audit` if terminal output hints at vulnerabilities (not applicable yet but keep in mind).
- Never use `git push -f` / `--force` without explicit approval.

