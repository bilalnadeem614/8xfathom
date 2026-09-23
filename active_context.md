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
- `POST /meetings/upload` — real-audio verified against a test standup recording (29 diarized transcript segments)
- `app/services/summarization.py` — Groq (`openai/gpt-oss-120b`) generates the meeting summary (per-template prompt: general/sales_call/standup) and extracts structured action items (JSON mode, defensive parsing, best-effort match to a `transcript_segment` id). Wired into the upload pipeline after transcription.
- `extract_action_items` prompt now also catches unowned proposals ("let's schedule X", "we should do Y") — owner set to `"Team"` instead of skipping them.
- `extract_action_items` prompt refined further: explicit rule separates first-person commitments ("I'll do X" → owner = that line's speaker label, e.g. "Speaker 0") from collective/unassigned proposals ("let's do X", no one named → owner = "Team"). Transcript lines are already prefixed with speaker labels, so the model has what it needs to tell the two apart. Confirmed on the test meeting: the two "I'll..." items are back on `Speaker 0`, design-review item stayed `Team`.
- Fixed status flow: `meetings.status` stays `processing` through transcription AND summary/action-item generation, only flips to `ready` once both have written successfully; `failed` (with reason) if any step throws. No new enum value added — `processing` covers the whole pipeline, kept simple rather than adding a DB migration for `transcribing`/`summarizing` granularity.

## What's in progress

- (update here as work starts)

- Backend deployed to Render (`https://eightxfathom.onrender.com`), frontend deployed to Vercel (`https://8xfrontend.vercel.app`) — both confirmed live
- Deepgram and Groq API keys created, set in Render env vars and local `.env`

## What's next

- Phase 3: real UI (meeting list, meeting detail with transcript/summary/action-item panels) — not started, stub frontend only
- Consider: `summarize_and_store` and `_transcribe_and_store` in `app/routers/meetings.py` are split out so they're easy to hand to `BackgroundTasks` later — upload requests currently block on the full pipeline (transcription + Groq calls), which is slow for a real recording. Worth revisiting once the frontend needs a snappier upload response.

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
- Groq's model catalog on this account has no `llama-3.x` models — checked live via `client.models.list()`. Chat-capable options are `openai/gpt-oss-120b` / `openai/gpt-oss-20b` (both support `json_mode`/`structured_outputs`/`tools`). Using `gpt-oss-120b` for both summary and action-item extraction. Re-check `client.models.list()` before assuming a model name still exists — this catalog moves.
- Fixed: unowned action items (e.g. "schedule the design review") were being skipped — prompt now explicitly tells the model to keep them with `owner: "Team"` rather than dropping them. Re-ran on the test meeting: 5th item now appears.
- Fixed follow-on regression: widening the net had also pulled two first-person commitments ("I'll chase the Deepgram API", "I'll fix the upload timeout") onto `owner: "Team"` instead of the speaker who said them. Prompt now has an explicit first-person-vs-collective rule (owner = the transcript line's speaker label for "I'll...", "Team" only for "let's.../we should..." with no one named). Re-ran: both items are back on `Speaker 0`, design-review item still correctly `Team`.
