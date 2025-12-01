# Scopic Legal Backend

FastAPI backend for **Scopic Legal**, a ChatGPT-style legal research assistant with:

- Supabase Postgres persistence for profiles, conversations, messages, and files
- Supabase Auth JWT verification
- OpenAI-powered chat, vision, file-aware, and deep-research responses with streaming output
- Architecture ready for a future lawyer portal (`assigned_lawyer_id`, role-aware access)

## Requirements

- Python 3.11
- Supabase project (Postgres + Auth + Storage)
- OpenAI API key (or compatible base URL)
- (Optional) Docker for containerized deployment

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` with your credentials:

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI (or compatible) API key |
| `OPENAI_BASE_URL` | Optional override for the OpenAI endpoint |
| `SUPABASE_DB_URL` | Supabase Postgres connection string (service role recommended) |
| `SUPABASE_JWKS_URL` | JWKS URL for validating Supabase Auth JWTs |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins (e.g. `http://localhost:3000`) |
| `APP_ENV` | `local` or `production` |
| `MAX_HISTORY_MESSAGES`, `MAX_OUTPUT_TOKENS` | Conversation + completion limits |
| `OPENAI_MODEL_CHAT/ VISION/ DEEP_RESEARCH` | Model names used per mode |
| `SUPABASE_STORAGE_PUBLIC_BASE_URL` | Base URL for public bucket access |
| `SUPABASE_STORAGE_BUCKET_NAME` | Bucket storing uploaded files |

Other fields in `.env.example` already match the required names.

## Database Migration

1. Log into the Supabase dashboard for your project.
2. Open the SQL editor (or connect via `psql` with your service key).
3. Run the statements in `db/schema.sql` to create:
   - `profiles`, `conversations`, `messages`, `files`, `message_files`
   - Indexes for fast queries and `gen_random_uuid()` defaults

Example `psql` invocation:

```bash
psql "$SUPABASE_DB_URL" -f db/schema.sql
```

The schema is idempotent, so it can be re-run safely.

## Running Locally

```bash
uvicorn app.main:app --reload
```

The server starts on `http://127.0.0.1:8000`. Key routes:

- `GET /health` — readiness probe (no auth)
- `GET /api/me` — Supabase-authenticated profile
- `POST /api/accept-tos` — mark Terms acceptance (required before chat)
- `GET /api/conversations` — list conversations for the current user
- `POST /api/files/register` — register Supabase Storage uploads
- `POST /api/chat` — streaming chat endpoint with auto mode routing

### Streaming Format

`/api/chat` returns newline-delimited JSON chunks:

```json
{"event":"token","delta":"partial text"}
{"event":"token","delta":"..."}
{"event":"done","conversation_id":"...","message_id":"..."}
```

Frontend clients should append `delta` values until the final `done` event arrives.

## Example Requests

```bash
# Health (unauthenticated)
curl http://127.0.0.1:8000/health

# Me (replace TOKEN with Supabase access token)
curl -H "Authorization: Bearer TOKEN" \
     http://127.0.0.1:8000/api/me

# Chat (non-stream testing via jq to show lines)
curl -N -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"conversation_id": null, "message": "Draft an NDA clause", "mode": "auto"}' \
     http://127.0.0.1:8000/api/chat
```

To include files, upload them via Supabase Storage on the frontend, call `/api/files/register` with the metadata, then reference the returned `file_ids` when hitting `/api/chat`.

## Tests

`backend/tests/test_document_text.py` verifies the document-ingestion helpers (PDF + DOCX extraction) using pytest + pytest-asyncio. Run with:

```
cd backend
PYTHONPATH=backend pytest tests/test_document_text.py
```

Smoke-test coverage for the public APIs is planned but not yet implemented.

## Docker

```bash
cd backend
docker build -t scopic-legal-backend .
docker run --env-file .env -p 8000:8000 scopic-legal-backend
```

## Troubleshooting

- Verify Supabase JWTs include `sub` and `email`.
- Ensure `.env` points to the same Supabase project where you ran `db/schema.sql`.
- If streaming seems slow, confirm outbound network access to OpenAI from your environment.
- Use FastAPI docs at `http://127.0.0.1:8000/docs` to explore routes interactively (requires a valid token for `/api/*`).

