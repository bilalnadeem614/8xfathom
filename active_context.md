# Active Context

Living doc — update this at the end of each work session so context survives across Claude Code sessions. Keep it short: current state, not history (history belongs in `progress.md`).

## Current phase

Phase 2 — Core pipeline

## Live URLs

- Frontend (Vercel): https://8xfrontend.vercel.app
- Backend (Render): https://eightxfathom.onrender.com (`/health` returns `{"status": "ok"}`)

## What's done

- Conda env `8x` created, Python 3.11
- Repo initialized with `.agent-logs/` capture hook configured and passing
- Supabase tables created: `meetings`, `transcript_segments`, `summaries`, `action_items`, `highlights`
- Stack decisions finalized (see below)
- Scaffold FastAPI project structure — routers for `/meetings`, `/transcripts`, `/summaries`, `/action-items`, `/highlights` (stub responses), Supabase client wiring, CORS, `/health`, `Procfile`, `requirements.txt` pinned. Verified locally: `uvicorn main:app` + `/health` returns `{"status": "ok"}`.
- Scaffold Next.js frontend — TypeScript + Tailwind, meetings list page at `/` fetches `backend/meetings` client-side and renders "No meetings yet". Verified locally against the running backend with no CORS errors.
- `db/schema.sql` added, mirroring the applied Supabase schema

## What's in progress

- Real-audio verification of the upload+transcribe pipeline (Phase 0 self-recorded Fathom call) — synthetic smoke test passed, real speech not yet run through it

- Backend deployed to Render (`https://eightxfathom.onrender.com`), frontend deployed to Vercel (`https://8xfrontend.vercel.app`) — both confirmed live
- Deepgram and Groq API keys created, set in Render env vars and local `.env`

## What's next

- Upload the real Phase 0 recording through `POST /meetings/upload` and sanity-check transcript quality (speaker labels, segment granularity) before building UI around it
- Phase 2 remaining: Groq summary generation (writes `summaries`) and action-item extraction (writes `action_items`) — not started. `app/services/transcription.py` deliberately stops after writing `transcript_segments`, does not call summary/action-item generation
- Phase 3: real UI (meeting list, meeting detail with transcript/summary/action-item panels) — not started, stub frontend only

## Resolved decisions

- Transcription provider: **Deepgram** (generous free credit, diarization included in the same call, simpler client than AssemblyAI's polling flow)
- LLM provider for summary/action-items: **Groq** (higher free tier limits, fast inference, no cost concern for this scope)
- Backend deploy target: **Render** (permanent free tier with fixed monthly compute hours, no card required; Railway's free tier is a one-time 30-day credit — wrong shape for a project that needs to stay live through review). Trade-off: cold starts after inactivity (~30-50s) — warm it before demoing.
- Frontend deploy target: **Vercel** (zero-config Next.js support)

## Known blockers

- (none yet)

## Notes for next session

- `conda run -n 8x pip install ...` silently resolves to a `~/.local/bin/pip` on this machine and installs into the wrong Python. Use `conda run -n 8x python -m pip install -r requirements.txt` instead.
- Deepgram SDK is v7 (Fern-generated) — API is `DeepgramClient(api_key=...).listen.v1.media.transcribe_file(request=bytes, ...)`, not the older `deepgram.transcription.prerecorded` style. Response is `response.results.utterances[i].{speaker,start,end,transcript}` when `utterances=True`.
