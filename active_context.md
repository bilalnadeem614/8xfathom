# Active Context

Living doc — update this at the end of each work session so context survives across Claude Code sessions. Keep it short: current state, not history (history belongs in `progress.md`).

## Current phase

Phase 1 — Environment & skeleton

## What's done

- Conda env `8x` created, Python 3.11
- Repo initialized with `.agent-logs/` capture hook configured and passing
- Supabase tables created: `meetings`, `transcript_segments`, `summaries`, `action_items`, `highlights`
- Stack decisions finalized (see below)
- Scaffold FastAPI project structure — routers for `/meetings`, `/transcripts`, `/summaries`, `/action-items`, `/highlights` (stub responses), Supabase client wiring, CORS, `/health`, `Procfile`, `requirements.txt` pinned. Verified locally: `uvicorn main:app` + `/health` returns `{"status": "ok"}`.
- Scaffold Next.js frontend — TypeScript + Tailwind, meetings list page at `/` fetches `backend/meetings` client-side and renders "No meetings yet". Verified locally against the running backend with no CORS errors.
- `db/schema.sql` added, mirroring the applied Supabase schema

## What's in progress

- (update here as work starts)

## What's next

- Deploy backend to Render, frontend to Vercel — confirm live URLs work
- Create Deepgram and Groq API keys, add to `.env`
- Phase 2: upload endpoint + real transcription/summary pipeline (not yet started — stub routers only return placeholder data)

## Resolved decisions

- Transcription provider: **Deepgram** (generous free credit, diarization included in the same call, simpler client than AssemblyAI's polling flow)
- LLM provider for summary/action-items: **Groq** (higher free tier limits, fast inference, no cost concern for this scope)
- Backend deploy target: **Render** (permanent free tier with fixed monthly compute hours, no card required; Railway's free tier is a one-time 30-day credit — wrong shape for a project that needs to stay live through review). Trade-off: cold starts after inactivity (~30-50s) — warm it before demoing.
- Frontend deploy target: **Vercel** (zero-config Next.js support)

## Known blockers

- (none yet)

## Notes for next session

- (update here)
