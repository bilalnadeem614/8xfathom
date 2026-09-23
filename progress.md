# Progress Log

Append-only log of completed work, most recent first. For current state, see `active_context.md`; for what's left, see `implementation_plan.md`.

---

### 2026-09-23 — Upload endpoint + Deepgram transcription (Phase 2 core pipeline)
- `POST /meetings/upload`: multipart file + optional `title`/`participants`, uploads to Supabase Storage bucket `meeting-audio` at `{meeting_id}/{filename}`, inserts `meetings` row (`status=processing`), transcribes synchronously, writes `transcript_segments`, flips status to `ready`; any failure flips status to `failed` and returns 502 instead of leaving it stuck
- `app/services/transcription.py`: Deepgram SDK v7 (`client.listen.v1.media.transcribe_file`), model `nova-3`, `diarize=True` + `utterances=True` + `smart_format`/`punctuate` — uses Deepgram's own utterance grouping (speaker turns) instead of manual word-by-word grouping
- `GET /meetings/{id}` now returns the meeting row joined with its `transcript_segments` (ordered by `start_time`) for manual verification without the frontend
- Verified locally end to end with a synthetic silent WAV: meeting created, storage upload succeeded, Deepgram call succeeded (empty transcript as expected for silence), status reached `ready`, then cleaned up the test row/object
- Real-audio verification (Phase 0 recording) still pending — see `active_context.md`

### 2026-09-23 — Backend + frontend deployed
- Backend live on Render: https://eightxfathom.onrender.com (`/health` confirmed 200)
- Frontend live on Vercel: https://8xfrontend.vercel.app
- Render env vars set (Supabase, Deepgram, Groq keys, `FRONTEND_ORIGIN`); Vercel env var `NEXT_PUBLIC_API_URL` set to the Render URL

### 2026-09-23 — Backend + frontend scaffold
- Backend: FastAPI app at `/backend`, routers for `meetings`, `transcripts`, `summaries`, `action_items`, `highlights` (stub CRUD, mock responses), Supabase client (service-role key), CORS for localhost:3000 + `*.vercel.app`, `/health` endpoint, `Procfile` for Render, `requirements.txt` pinned to versions available now
- Frontend: Next.js (TypeScript, Tailwind) app at `/frontend`, meetings list page fetches backend `/meetings` client-side, shows "No meetings yet" on empty
- `db/schema.sql` added mirroring the Supabase schema in `system_patterns.md`
- Root `.gitignore` covering Python/Node/env/OS artifacts
- `.env.example` in both `/backend` and `/frontend` (no root-level mixed file)
- Verified end to end locally: `uvicorn` serves `/health` and `/meetings`, Next dev server calls it with no CORS errors

---

### [date/time here] — Stack decisions finalized
- Backend host: Render (permanent free tier, chosen over Railway's expiring credit)
- Transcription: Deepgram (chosen over AssemblyAI for free-tier generosity and simpler diarization)
- LLM: Groq (chosen for higher free tier limits, no cost concern)
- Frontend host: Vercel
- Updated `CLAUDE.md`, `prd.md`, `implementation_plan.md`, `system_patterns.md`, `active_context.md` to reflect finalized stack

### [date/time here] — Project setup
- Created conda env `8x`, Python 3.11
- Initialized repo, confirmed `.agent-logs/` capture hook passes
- Created planning docs: `prd.md`, `implementation_plan.md`, `active_context.md`, `system_patterns.md`, `progress.md`

### [date/time here] — Database
- Created Supabase project
- Ran schema script: `meetings`, `transcript_segments`, `summaries`, `action_items`, `highlights` tables + indexes
