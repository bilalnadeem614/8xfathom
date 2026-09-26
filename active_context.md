# Active Context

Living doc — update this at the end of each work session so context survives across Claude Code sessions. Keep it short: current state, not history (history belongs in `progress.md`).

## Current phase

Phase 4 — Ask the call (chat)

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

- **Action-items-first restructure (2026-09-26):** `/` is now a cross-meeting action items inbox (group by owner/meeting, owner filter, rows deep-link to `/meetings/{id}?segment=...`); meeting list moved to `/meetings`; sidebar nav replaces top header. Backed by new `GET /action-items` (FK-embedded meeting title/date). Reasoning: after a call, users return for commitments, not recordings — meetings are the evidence behind each task, so they're the secondary view. See progress.md for details + test results.

## What's in progress

- (update here as work starts)

- Backend deployed to Render (`https://eightxfathom.onrender.com`), frontend deployed to Vercel (`https://8xfrontend.vercel.app`) — both confirmed live locally-tested changes not yet redeployed, see below
- Deepgram and Groq API keys created, set in Render env vars and local `.env`
- **Phase 3 core UI built and verified locally against real data (meeting `310026c8...`):**
  - `GET /meetings` (`backend/app/routers/meetings.py`) was a stub returning `[]` — now returns all meetings ordered by `date desc`
  - `GET /meetings/{id}` now also returns `summaries` and `action_items` arrays alongside `transcript_segments`, so the frontend makes one call instead of four
  - New `GET /meetings/{id}/audio-url` — looks up the stored path, calls Supabase Storage `create_signed_url(path, expires_in=3600)`, returns `{url, expires_at}`. Raw `audio_url` storage path is never sent to the frontend as something to fetch directly.
  - Frontend: meeting list page (`frontend/app/page.tsx`) — cards with title/date/duration/status pill, links to detail page
  - Meeting detail page (`frontend/app/meetings/[id]/page.tsx`) — polls `GET /meetings/{id}` every 3s while `status` is `processing`/`uploading`, fetches signed audio URL once `ready`, two-column layout: transcript (left, scrollable, clickable timestamps) + summary/action-items (right). `<audio>` `onTimeUpdate` drives active-segment highlighting (`currentTime` within `[start_time, end_time)`); `onError` re-fetches a fresh signed URL if the link expires mid-session.
  - Summary rendered via `react-markdown` (new dependency — no markdown lib existed, needed a real parser rather than hand-rolling one) into a `.markdown-body`-scoped set of plain CSS rules in `globals.css` (skipped `@tailwindcss/typography` since Tailwind v4's CSS-based config makes a few manual rules just as cheap and one less dependency)
  - Action items distinguish `owner === "Team"` (👥 grey badge) from a named person (👤 indigo badge); clicking an item scrolls the transcript to its `source_segment_id` and seeks the audio there
  - Verified end-to-end with Playwright against the local backend (see progress.md entry for what was checked)

- **Ask the call chat done:** `POST /meetings/{id}/ask` (`backend/app/routers/meetings.py`) — reuses the same `transcript_segments` fetch as `GET /meetings/{id}`, 409 if empty (not ready yet), else calls `answer_question(segments, question)` in `app/services/summarization.py` (reuses existing `_format_transcript`, whole transcript passed raw — no embeddings/vector DB, disproportionate for single-meeting scope). Frontend: new "Ask the call" section on the meeting detail page (`frontend/app/meetings/[id]/page.tsx`), question/answer thread in local React state only (no DB persistence), loading + error states. Verified against real meeting `310026c8...` — see `progress.md` for the actual Q&A tested.

- **Upload UI + rename done:** `PATCH /meetings/{id}` (`backend/app/routers/meetings.py`) accepts `{"title": ...}`, 422 on empty title, 404 if no row updated. Frontend list page (`frontend/app/page.tsx`) got an "Upload meeting" button opening a modal (title + file input, `POST /meetings/upload` via `uploadMeeting()` in `lib/api.ts`), and inline title editing (click title → input, save on Enter/blur, cancel on Escape, `renameMeeting()` PATCH). Since `/meetings/upload` blocks until the whole pipeline finishes, the modal closes immediately on submit and the list refetches once ~1.5s later (catches the row while it's still `processing`, since the DB insert happens before transcription starts) and again when the upload promise settles; polls every 3s afterward while any row is `processing`/`uploading` (same idea as the detail page's polling, just at the list level).

## What's next

- Redeploy both (Render + Vercel) so the live URLs have the action-items-first layout and `GET /action-items`; warm Render before recording the walkthrough.

- Redeploy backend (Render) and frontend (Vercel) — current live URLs are still serving the old stub `/meetings` list and old detail response, and don't have the upload/rename UI yet
- Consider: `summarize_and_store` and `_transcribe_and_store` in `app/routers/meetings.py` are split out so they're easy to hand to `BackgroundTasks` later — upload requests currently block on the full pipeline (transcription + Groq calls), which is slow for a real recording. Worth revisiting since it's now user-triggered from the UI, not just curl.

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
