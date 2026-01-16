# Background and Motivation
- Build the Scopic Legal backend (FastAPI + Supabase + OpenAI) so clients can run ChatGPT-style conversations with file/vision/deep research support while preserving all data for a future lawyer portal.
- Deliver production-ready artifacts (app code, schema, Dockerfile, README, env template) per detailed spec.
- 2025-12-18: Add a `tests/`-scoped, **non-streaming** “chat model” harness that mirrors the backend’s prompt + mode-selection + OpenAI call parameters so we can run evals and iterate prompts without touching production backend code.
- 2025-12-23: `lawyermvp` admin dashboard does not show/count “Upload Legal Docs” (profile library) files; it only shows/counts query attachments from `files` table. Need UI-only fix in `lawyermvp` (backend is read-only for this task) to merge both sources in lists and counts.
- 2025-12-23: Update the `tests/` eval runner to support **file input** (DOCX agreements in `tests/public/`) and run a new eval set of **5 contract-review questions (Q1–Q5)** against **5 files**, producing **25 answers per mode** (with vs without `tests/system_prompt.txt`) for a total of 50 answers saved to disk.
- 2025-11-24: Production signup flow still redirects to `http://localhost:3000` after Supabase magic-link confirmation; need to trace why deployed frontend/backend continue to emit local host-based redirect URLs.
- 2025-11-24: File-content extraction via OpenAI API appears to return hallucinated summaries rather than actual text from uploaded files; need to determine whether frontend upload, backend parsing, or OpenAI call is misconfigured.
- 2025-12-10: User wants all “Book a Meeting” CTAs to use the new Google booking page and ideally have `scopiclegal.com/meeting` redirect there after retiring HubSpot.
- 2025-12-17: After signup + accepting Terms of Use, the chat page should show a first-time onboarding “Scopic Intro” message (title + body) instructing the user how to start, and then the user can click “+ New Legal Query” to begin. This onboarding should only appear for new users.

# Key Challenges and Analysis
- Enforce conversation/file ownership while keeping the DB/API fast enough for ChatGPT-like latency.
- Implement Supabase JWT auth + auto profile upsert once, reusing it across all routers.
- Stream OpenAI tokens while persisting complete assistant responses and token metadata.
- Keep architecture extensible for upcoming lawyer portal (role-aware access, assigned_lawyer_id).
- Determine whether Supabase auth settings (`SITE_URL`, `redirectTo`, deep link config) or frontend environment variables still reference localhost, and confirm how production/frontend derives the email confirmation redirect target.
- Trace end-to-end file ingestion path (client upload -> Supabase storage -> backend fetch -> OpenAI request) to confirm exact payload sent to OpenAI and whether we ever extract actual file bytes/metadata before prompting.
- Need deterministic tests around file extraction to avoid subjective "hallucination" reports; devise sample input file and expected extracted text to assert behavior.
- Meeting redirect considerations:
  - Confirm domain control/hosting for `scopiclegal.com` (Next.js on Vercel?) to add a redirect/rewrites rule.
  - Decide between server-side redirect (Next.js `next.config` redirects) vs. lightweight landing page path that forwards to Google Calendar (helps analytics/utm).
  - Ensure legacy HubSpot links are removed to avoid conflicting CTAs; check any email templates or docs referencing old links.
- New-user onboarding considerations:
  - Detect “new user” reliably (not just “no conversations right now”); avoid showing onboarding repeatedly for returning users or users who deleted all chats.
  - Ensure onboarding appears only after Terms are accepted (`requiresTos === false`) and doesn’t flicker during initial loading.
  - Persist “has seen onboarding” across devices if possible (prefer Supabase Auth user metadata over localStorage).

## New-user onboarding UX spec (draft)

### When onboarding should show
- After signup + Terms acceptance, we seed a *real* conversation in the DB titled `Scopic Intro` containing the onboarding content, and auto-open it once.
- The seeded conversation remains in the sidebar as the “first chat” unless the user deletes it.
- On subsequent visits, the app should behave like it does today for all users: open to a fresh “new chat” view (no active conversation selected) while the seeded intro conversation remains selectable in the sidebar.

### “New user” vs existing users
- Easiest + cleanest: **only seed this intro on the Terms acceptance action** (`POST /api/accept-tos`), which effectively targets new signups (since existing users already accepted Terms won’t hit this path).
- Existing/older users: no retroactive seeding by default (keeps behavior unchanged and avoids duplicate/noisy chats). If we decide later that they should also get the intro, we can add an explicit one-time migration/endpoint.

### Seeding rules (to avoid re-creating after deletion)
- Persist a flag in our DB profile row (preferred) so we don’t recreate it if the user deletes it:
  - `profiles.intro_conversation_id` (UUID, nullable) and/or `profiles.intro_seeded_at` (timestamp, nullable)
- If `intro_conversation_id` is set, do nothing (even if the conversation later gets deleted).

### Onboarding content (exact copy)
- **Query Title**: `Scopic Intro`
- **Query Body**:
  - Welcome to Scopic Legal! Thanks for joining our private beta program. We designed this tool to explore your experience with "self-serving" legal work and to identify where you need the most help.
  - How to get started:
    - Ask Away: Type any legal question in a "+New Legal Query" or use the [prompts] in the sidebar for common use cases.
    - Meet Us: Book a free legal/fundraising strategy consultation with our CEO, Amit Bhanot (10+ years Corporate Lawyer & VC Partner) by clicking "+Book a Meeting".
    - Provide Context: To get the most out of that meeting, click "+Upload Legal Docs" to upload past or future agreements, so we'll be ready to help you.
  - We're thrilled to have you onboard and your feedback is crucial to shaping Scopic Legal. Let's get to work!
  - [Watch a quick welcome video from Amit] *(to be embedded once video is created)*
  - Important Note: Scopic Legal is an AI assistant, not a law firm. The responses are for informational purposes only and do not constitute legal advice. Please ensure critical documents are reviewed by a qualified professional, whom we can connect you with if needed.

### UI placement
- The onboarding is rendered as normal chat content inside the seeded conversation (recommended: a “system” or “assistant” message so it looks like a welcome post).
- Optional: include a CTA button inside the message card (“+ New Legal Query”) which triggers `startNewConversation()` (nice-to-have).

# High-level Task Breakdown
1. **bootstrap-structure** — Create backend skeleton (`app/`, routers/ services folders, infra files, db schema stub, Dockerfile, requirements, README, .env.example). *Success:* repo tree matches spec; FastAPI imports resolve.
2. **core-infra-modules** — Implement config, db engine/session, auth (Supabase JWT), Pydantic schemas, and OpenAI client wrappers. *Success:* `uvicorn app.main:app` can start (with stub creds) and modules import cleanly.
3. **services-implementation** — Build conversation/message/file service helpers with ownership checks and history logic. *Success:* Routers can rely on services to enforce invariants and return structured data.
4. **routers-and-streaming** — Implement all routers and chat streaming endpoint plus `main.py` wiring (CORS, exception handlers). *Success:* `/health` works unauthenticated; `/api/*` enforce auth+TOS; `/api/chat` streams and persists.
5. **docs-and-validation** — Finalize `db/schema.sql`, `.env.example`, README instructions, and any sanity checks. *Success:* Another engineer can provision DB, configure env, run server, and hit sample endpoints.
6. **magic-link-redirect-audit** — Inventory all environment variables/config files (frontend, backend, Supabase) influencing auth redirect URLs; document current values and identify lingering localhost references. *Success:* We know exactly which setting keeps pointing to localhost and why production inherits it.
7. **prod-redirect-fix** — Update the offending config (code or Supabase settings) to use the production domain, add any missing env plumbing/tests, and outline verification steps (e.g., Supabase dashboard setting screenshots or automated test). *Success:* After deploying, magic-link redirects land on the correct production URL; instructions exist for future envs.
8. **file-extraction-audit** — Locate every module/function handling uploaded files, especially those invoking OpenAI file APIs, and capture the exact prompts/payloads being sent. *Success:* Documented flowchart plus identification of potential breakpoints where actual file contents are dropped or ignored.
9. **file-extraction-tests** — Add regression tests (unit or integration) with a real sample file ensuring extraction uses actual content and not hallucinated text; include fixtures and instructions for running tests locally. *Success:* Tests fail under current behavior and pass once the fix lands, preventing regressions.
10. **meeting-redirect-plan** — Decide redirect approach for `scopiclegal.com/meeting` to the Google booking page, including hosting constraints, analytics, and rollback. *Success:* Approved plan with chosen mechanism and deployment steps.
11. **meeting-redirect-implementation** — Implement the redirect (config or page), remove legacy HubSpot links, and validate in production. *Success:* Visiting `scopiclegal.com/meeting` forwards to the Google booking link; no residual HubSpot CTAs.
12. **og-preview-plan** — Plan updates to Open Graph/LinkedIn preview (title, description, image) so shares show the site tagline instead of the current “ChatGPT-style legal research assistant...” text. *Success:* Approved target OG title/description/tagline and image source; decide files to edit and validation steps.
13. **og-preview-implementation** — Implement OG/meta changes (likely in `frontend/src/app/layout.tsx` or route metadata), ensure image asset exists, deploy and verify via LinkedIn post inspector. *Success:* LinkedIn preview shows requested tagline/title after cache refresh.
14. **new-user-onboarding-plan** — Define the exact gating + persistence rules for showing onboarding only for new users, and the final “Scopic Intro” content formatting. *Success:* Written spec in scratchpad with acceptance criteria and manual test plan.
15. **new-user-onboarding-implementation** — Implement onboarding UI on chat page for first-time users only, and hide it once the user starts their first real query. *Success:* New signup sees onboarding; returning user does not; onboarding never reappears after first query (even after logout/login); no regressions to chat/send/stream.
16. **tos-copy-alignment (optional)** — Update Terms acceptance modal copy to remove “observe your behavior” phrasing and align with the new non-intrusive legal disclaimer language. *Success:* Modal copy matches updated legal guidance and is approved.
17. **tests-evals-runner-file-input (plan+impl)** — Extend `tests/run_eval.py` to load each file in `tests/public/`, extract text, and prepend it to each question prompt; update `tests/questions.txt` to the new Q1–Q5 set; save outputs as two files (with/without system prompt) each containing 25 answers labeled by file + question. *Success:* One command generates `outputs/with_prompt.*` and `outputs/without_prompt.*` with 25 answers each, clearly grouped by file and question, and logs progress without crashing on large DOCX files.

### Acceptance criteria for **new-user-onboarding-implementation**
- Fresh user signs up → logs in → accepts Terms → lands in chat and sees “Scopic Intro” onboarding card immediately.
- Clicking “+ New Legal Query” still works normally (no regression); user can type and send messages.
- After the user creates a new query and later revisits the site, the default view is a fresh new chat (no active conversation selected), while the `Scopic Intro` conversation remains in the sidebar unless they delete it.
- Existing/older users are unchanged (no auto-created intro) unless we explicitly opt-in to backfill later.

# Project Status Board
- [x] bootstrap-structure
- [x] core-infra-modules
- [x] services-implementation
- [x] routers-and-streaming
- [x] docs-and-validation
- [x] magic-link-redirect-audit
- [x] prod-redirect-fix
- [x] file-extraction-audit
- [x] file-extraction-tests
- [x] update-book-meeting-link
- [ ] meeting-redirect-plan
- [ ] meeting-redirect-implementation
- [x] og-preview-plan
- [x] og-preview-implementation
- [ ] new-user-onboarding-plan
- [ ] new-user-onboarding-implementation
- [ ] tos-copy-alignment (optional)
- [ ] tests-chat-model-harness (non-streaming)
- [ ] tests-evals-runner (follow-up; evals will call the harness)
- [ ] tests-evals-runner-file-input (Q1–Q5 × 5 files × with/without system prompt)
- [ ] lawyermvp-merge-profile-and-query-docs

# Current Status / Progress Tracking
- 2025-11-21: Executor mode engaged, preparing to start **bootstrap-structure**.
- 2025-11-21: Completed filesystem scaffolding, placeholder modules, env template, Dockerfile, requirements, and README per **bootstrap-structure** (awaiting review).
- 2025-11-21: Implemented config, DB session factory, Supabase JWT auth/upsert, full Pydantic schemas, and OpenAI wrappers (standard + vision/files/deep research + streaming) for **core-infra-modules**.
- 2025-11-21: Delivered conversation/message/file services + all routers (health/user/conversations/files/chat) with streaming `/api/chat` that routes between chat/vision/files/deep research and persists assistant metadata.
- 2025-11-21: Finalized `db/schema.sql`, expanded `README.md` with step-by-step setup/run instructions, and confirmed `.env.example` env var coverage for **docs-and-validation**.
- 2025-11-21: Added optional `tests/` folder with smoke tests + README so QA scripts remain isolated and can be deleted when not needed.
- 2025-11-21: Executor investigating Supabase Storage RLS upload failures from ChatInput; updated uploader to derive path prefix from `supabase.auth.getSession()` but Supabase Storage still returning 400. Need actual policy listing to verify configuration.
- 2025-11-21: Added profile document drawer in sidebar allowing authenticated users to upload/view personal files separately from chat attachments using Supabase Storage.
- 2025-11-24: Planner analyzing Supabase email confirmation redirect continuing to point at localhost in production; new tasks logged for audit/fix.
- 2025-11-24: Planner notes new bug where file content extraction seems disconnected from real file data; planning deeper audit plus automated tests before implementing fixes.
- 2025-11-24: User confirmed Supabase magic-link redirect now points to production domain after updating Supabase `SITE_URL`; no further Planner action needed on that item.
- 2025-11-24: Executor (file-extraction-audit) traced the `/api/chat` "files" mode to `openai_client.chat_with_files`, which only appends metadata about Supabase paths and never downloads/extracts actual document text—explains hallucinated answers.
- 2025-11-24: Executor implemented `app.services.document_text` to download Supabase files + extract PDF/text content and updated `openai_client.chat_with_files` to inject real excerpts; added regression tests backed by `backend/test/Dawood CV.pdf`.
- 2025-11-24: Pytest now covers document extraction flow via `backend/tests/test_document_text.py`; run with `PYTHONPATH=backend pytest backend/tests/test_document_text.py`.
- 2025-11-24: Executor awaiting guidance on next priority now that file extraction + tests are in place; ready to pick up the next task once user identifies it.
- 2025-11-24: Executor expanded document parsing to cover DOCX uploads (using `python-docx`) plus new regression tests that synthesize DOCX fixtures; PDF coverage retained to ensure chat integrity with real excerpts.
- 2025-12-10: Executor updated frontend sidebar CTA to point "Book a Meeting" to `https://calendar.app.google/kwcmoD8roNmkBqdT9`.
- 2025-12-10: Planner engaged to design a clean `scopiclegal.com/meeting` redirect to the new Google booking link after retiring HubSpot; no code changes yet.
- 2025-12-10: Planner reviewing project `.md` docs for freshness; spotted outdated meeting links (Runway6/Calendly), older backend URLs, and legacy route references needing alignment with current code.
- 2025-12-10: Executor updated sidebar CTA again to the latest Google booking URL `https://calendar.google.com/calendar/u/0/appointments/AcZssZ0Kntrw_2jzyJwypoDvkeY1nCAaNdy6XUsKB4A=`.
- 2025-12-10: Planner engaged to update LinkedIn/OG preview (title/description/tagline) for `scopiclegal.com`; need plan before implementation.
- 2025-12-10: Executor updated OG metadata (title/description/twitter/openGraph) in `frontend/src/app/layout.tsx` to use the new “agentic frameworks” messaging and existing `/images/image.png` asset.
- 2025-12-10: Executor added cache-busting query param to OG image (`/images/image.png?v=2`) to force LinkedIn to fetch the new preview.
- 2025-12-10: Executor fixed scrolling issue during streaming in `MessageList.tsx` - users can now scroll up to read earlier content while responses are being generated. Auto-scroll only occurs when user is near the bottom (within 100px threshold), allowing manual scrolling during streaming without interruption.
- 2025-12-17: Planner engaged to design first-time onboarding (“Scopic Intro”) that displays after signup + Terms acceptance, before the user starts their first query.
- 2025-12-17: Executor implementing seeding of a real `Scopic Intro` conversation on `/api/accept-tos` (first acceptance only) and auto-opening it in the frontend after Terms are accepted.
- 2025-12-17: Executor reverted backend changes (per request) and implemented a frontend-only one-time “Scopic Intro” onboarding message that displays immediately after Terms acceptance, then hides once the user starts a query. Persisted via localStorage keyed by user id.
- 2025-12-18: Executor implemented `tests/chat_model.py` non-streaming chat harness + `tests/test_chat_model_unit.py` unit tests; local pytest run passes (3 tests).
- 2025-12-18: Executor added `tests/run_evals.py` and `tests/evals/questions_founder_legal.txt` to run the harness over the provided question set and store outputs as JSONL.
- 2025-12-23: Executor started `lawyermvp-merge-profile-and-query-docs`: added `lawyermvp` API routes to list profile uploads from Supabase Storage (service role) and generate signed URLs, and updated `lawyermvp` user/dashboard document counts to include both sources. Pending: run lint/build and have user verify in UI.
- 2025-12-23: Executor updated `lawyermvp` conversation detail page to show query-level attachments (“Documents attached in those queries”) with View links, using signed URLs.
- 2025-12-23: Executor restored `lawyermvp` admin access: added `/login`, `/api/admin/login`, `/api/admin/logout`, and `middleware.ts` so the CRM and all API routes (including profile-doc signed-url endpoints) are protected behind the `admin_session` cookie.
- 2025-12-23: Planner engaged to extend `tests/run_eval.py` to support file input (DOCX in `tests/public/`) and run the new Q1–Q5 contract-review evals with/without `tests/system_prompt.txt` (target output: 2 files × 25 answers).
- 2025-12-23: Executor implementing `tests` eval runner changes: replaced `tests/questions.txt` with Q1–Q5, added DOCX extraction + file looping to `tests/run_eval.py`, and will run it to generate `tests/outputs/with_prompt.txt` and `tests/outputs/without_prompt.txt`.
- 2026-01-07: Executor completed UI text updates: changed "Contract Review" to "Document Review" and "Upload Legal Docs" to "Document Vault" across frontend (Sidebar, ChatInput, useChat hook). All changes linted successfully with no errors.
- 2026-01-07: Executor implemented Document Review modal workflow: created `DocumentReviewModal.tsx` with file upload, required client role input, and optional prompt textarea. Updated `Sidebar.tsx` to open modal instead of direct contract review start. Modified `ChatLayout.tsx` to handle document review submission by uploading file, starting contract review mode, and sending structured message with all context. No database changes required - all data flows through existing chat message system.
- 2026-01-10: Executor updated Document Review modal copy (subheader, role/context labels, placeholders, helper text) and aligned validation error message to match “role as defined in the document”.
- 2026-01-10: Executor traced end-to-end Document Review inputs→outputs (modal → `/api/files/upload` → `/api/chat` streaming) and captured the exact payloads/mode selection (auto→files, contract_review system prompt) for explanation/debugging.
- 2026-01-13: Executor created and switched to git branch `blind-spot-analysis` (git does not allow spaces in branch names like "blind spot analysis").
- 2026-01-13: Executor added a new left-sidebar item "Blind Spot Analysis" (in chat sidebar) that navigates to `/blind-spot-analysis`, plus a placeholder page for that route.
- 2026-01-13: Executor updated the Blind Spot Analysis page with 3 cards (Incorporation/Funding/Operations), each showing Purpose + checklist + blind-spot risks.
- 2026-01-16: Executor hid the "Blind Spot Analysis" feature by commenting out the sidebar navigation button until requirements are finalized. The page and components remain in the codebase at `/blind-spot-analysis` but are no longer accessible via UI.

# Executor's Feedback or Assistance Requests
- Supabase Storage insert policies still blocking uploads; advised user to keep only one `to public` policy with `auth.role()='authenticated'` but waiting on confirmation.
- Attempting `pip install -r backend/requirements.txt` on Windows/Python 3.13 fails while compiling `asyncpg==0.29.0`; installed only `pypdf`/`pytest`/`pytest-asyncio` ad-hoc to keep tests running. Need guidance if we should pin Python 3.12 or swap to `psycopg` to avoid wheel issues.
- DOCX extraction relies on `python-docx`; `.doc` binaries are still unsupported (logged and skipped). If `.doc` ingestion is a must, we’ll need heavier tooling (e.g., LibreOffice conversion service). Let me know if we should explore that path.
- Please run the new `tests` unit test locally to confirm the harness is wired correctly before we add eval runners and start prompt iteration.
- Next step (once you confirm): add a small eval runner that calls `tests.chat_model.run_chat(...)` over your eval dataset and writes outputs to disk for comparison.
- The eval runner supports reading env vars from a repo-root `.env` file via `--env-file ./.env` (or you can set env vars in PowerShell). Please confirm you can run it end-to-end with your OpenAI key.
- Attempted to run `tests/run_evals.py` end-to-end, but `OPENAI_API_KEY` is not set in the environment. The runner now fails fast with a clear message until the key is provided (via PowerShell env var or repo-root `.env` + `--env-file`).
- 2025-12-23: Installed `python-docx` into `tests/venv` (required to extract DOCX agreements in `tests/public/`). The full eval run (`tests/run_eval.py`) was started but cancelled mid-run (it will take time + OpenAI tokens/cost). Please confirm you want me to rerun the full 5 files × 5 questions × 2 modes and that `OPENAI_API_KEY` is set.
- 2025-12-23: Confirmed the current shell environment shows `OPENAI_API_KEY=MISSING`, so `tests/run_eval.py` will fail fast until the key is provided (either as an env var or via a `.env` file that `python-dotenv` can load).
- For `lawyermvp-merge-profile-and-query-docs`: I will implement new `lawyermvp` API routes that use `SUPABASE_SERVICE_ROLE_KEY` to (a) list profile-library objects (from likely bucket names) and (b) create signed URLs so the admin can view them. Then I’ll update the `lawyermvp` dashboard/user pages to merge counts and display both “Query attachments” and “Profile uploads”.
- Note: backend `FileMeta` includes `openai_file_id`, but `frontend/src/lib/types.ts` `FileMeta` currently ignores it. That’s OK for UI, but it can be useful to expose later for debugging whether PDFs are using OpenAI Files API vs text-extraction fallback.

# Lessons
- Include debugging-friendly info in program output/logs.
- Always read files before editing them.
- Run `npm audit` if terminal output hints at vulnerabilities (not applicable yet but keep in mind).
- Never use `git push -f` / `--force` without explicit approval.
- Git branch names cannot contain spaces; use hyphens (e.g., `blind-spot-analysis`).
- On Windows PowerShell, use `;` instead of `&&` to separate commands.
- For streaming chat UIs, only auto-scroll when user is near bottom (e.g., within 100px threshold). Track scroll position via scroll events and respect user-initiated scrolls during streaming to allow reading earlier content while new content is generated.

