# Progress Log

Append-only log of completed work, most recent first. For current state, see `active_context.md`; for what's left, see `implementation_plan.md`.

---

### 2026-09-23 — Distinguish self-assigned vs. team-proposed action items
- `extract_action_items` prompt in `app/services/summarization.py` gained an explicit owner rule: first-person commitments ("I'll do X", "I will handle Y") → owner is that transcript line's speaker label (e.g. "Speaker 0"), not "Team". Collective/unassigned proposals ("let's do X", "we should do Y", no one named) → owner = "Team". Transcript lines are already formatted as `speaker: text`, so the model has the speaker label to point back to.
- Fixes a regression from the previous prompt change (catching unowned items) which had also swept two legitimate first-person commitments onto `"Team"`.
- Re-ran on the test meeting (`310026c8-0814-41e4-9116-76dca0b09afe`): still 5 action items, status `ready`. Final list:
  - Bilal — finish the dashboard
  - Speaker 0 — chase Deepgram API
  - Sarah — get the API key
  - Speaker 0 — fix the upload timeout
  - Team — schedule a design review for the dashboard

### 2026-09-23 — Catch unowned action items
- `extract_action_items` prompt in `app/services/summarization.py` now explicitly keeps commitments with no single named owner ("let's schedule X", "we should do Y") instead of dropping them — owner set to `"Team"`.
- Re-ran on the test meeting (`310026c8-0814-41e4-9116-76dca0b09afe`): action items went from 4 → 5, new row is `Team — schedule a design review for the dashboard`. Status stayed `ready`.
- Trade-off noticed: `chase Deepgram API from procurement` and `fix upload timeout` flipped from `Speaker 0` to `Team` in this run too — the wider net made owner attribution slightly noisier on ambiguous cases. Not incorrect (no individual is actually named in either line) but flagged in `active_context.md` to watch on future recordings.
- Full updated list:
  - Bilal — finish the dashboard
  - Team — chase Deepgram API from procurement
  - Sarah — get the API key
  - Team — fix upload timeout
  - Team — schedule a design review for the dashboard

### 2026-09-23 — Groq summary + action-item generation (Phase 2 core pipeline complete)
- `app/services/summarization.py`: `generate_summary(segments, template_type)` (distinct prompt per `general`/`sales_call`/`standup`) and `extract_action_items(segments)` (Groq `response_format={"type":"json_object"}`, defensive parsing that strips markdown fences/prose before `json.loads`, best-effort word-overlap match to a `transcript_segment.id`) — model `openai/gpt-oss-120b`, picked by querying `client.models.list()` live rather than assuming a model string (this Groq account's catalog has no `llama-3.x` models)
- Fixed premature status flip: `meetings.status` now stays `processing` through transcription AND summary/action-item generation, `ready` only after both write successfully; `failed` with a combined error message if either step throws (both steps are attempted independently so one failing doesn't silently skip the other)
- Wired into `POST /meetings/upload` via `_transcribe_and_store` → `summarize_and_store`, both split out of the old `_process_meeting` so each stage stays swappable for a `BackgroundTasks` move later
- Re-ran the full pipeline on the existing test meeting (`310026c8-0814-41e4-9116-76dca0b09afe`, 29 diarized segments from a standup recording) directly against `summarize_and_store` — no re-upload needed since transcript segments already existed. Status reached `ready`, summary and action items read back with real content (see below)
- Sample output: summary correctly grouped status updates/decision/blockers/action items by section; 4 action items extracted (`Bilal — finish the dashboard`, `Speaker 0 — chase Deepgram API key from procurement`, `Sarah — get the API key`, `Speaker 0 — fix upload timeout`), each matched to a plausible source transcript segment. One summary bullet (scheduling a design review) didn't get its own action-item row — noted in `active_context.md` as a possible prompt tweak later.

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
