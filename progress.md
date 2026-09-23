# Progress Log

Append-only log of completed work, most recent first. For current state, see `active_context.md`; for what's left, see `implementation_plan.md`.

---

### 2026-09-23 — Ask the call chat (Phase 4)
- Backend: `POST /meetings/{id}/ask` (`{"question": ...}` → `{"answer": ...}`) in `backend/app/routers/meetings.py`. Reuses the same `transcript_segments` fetch as `GET /meetings/{id}`; 409 with a clear detail message if the transcript is empty (meeting still processing). New `answer_question(segments, question)` in `app/services/summarization.py` reuses the existing `_format_transcript` helper — passes the full transcript as context, no embeddings/vector search (single meeting is short enough, over-engineering for this scope). System prompt instructs the model to answer only from the transcript and say clearly when something isn't covered rather than guess.
- Frontend: new "Ask the call" section on the meeting detail page (`frontend/app/meetings/[id]/page.tsx`) below action items — text input + submit, question/answer thread rendered from local `useState` (no DB persistence, per scope), "Thinking…" loading state, error message on failed request. New `askMeeting()` in `frontend/app/lib/api.ts`.
- **Tested against the real meeting (`310026c8-0814-41e4-9116-76dca0b09afe`) via `curl` against the local backend:**
  - Q: "What database did the team decide to use, and why?" → A: "The team decided to use **Postgres** instead of MongoDB. **Reason:** They need to perform relational joins across the transcript and action items, which Postgres supports." — correct, matches the actual decision in the transcript.
  - Q: "What are the blockers?" → A: listed (1) missing Deepgram API key from procurement, (2) Render deploy pipeline timing out on large audio files — both real blockers mentioned in the recording.
  - Q: "Who owns getting the API key?" → A: "Sarah is responsible for getting the API key." — matches the action-item owner (`Sarah — get the API key`).
  - Q: "What was discussed about the marketing budget?" (not in transcript) → A: "The transcript does not contain any discussion about the marketing budget." — correctly refused to hallucinate.
  - Empty-transcript case (random meeting id) → 409 `{"detail":"Transcript not ready for this meeting yet"}` instead of a broken prompt.
- `npx tsc --noEmit` clean on the frontend change.

### 2026-09-23 — Phase 3 core UI: meeting list, meeting detail, signed-URL audio playback
- Backend: `GET /meetings` was a stub returning `[]` — now returns real rows from `meetings`, ordered `date desc`. `GET /meetings/{id}` now also joins `summaries` and `action_items` (previously only `transcript_segments`), so the frontend gets meeting + transcript + summary + action items in one call. New `GET /meetings/{id}/audio-url` generates a Supabase Storage signed URL (`create_signed_url`, 1hr expiry) from the stored path — confirmed via `storage3`'s source that the sync client returns `{"signedURL": ..., "signedUrl": ...}`. The raw `audio_url` storage path (e.g. `310026c8.../test_audio.mp4`) is never sent to the frontend as a fetchable URL and the bucket stays private.
- Frontend: `frontend/app/page.tsx` (meeting list, cards with title/date/status pill, links into detail) and `frontend/app/meetings/[id]/page.tsx` (new — detail page) built with Next.js App Router client components (`useParams`). Detail page polls the meeting every 3s while `status` is `processing`/`uploading`; once `ready`, fetches the signed audio URL separately and renders a two-column layout: scrollable transcript with clickable per-segment timestamps (left), summary (markdown, via new `react-markdown` dependency) + action items (right).
- Sync: `<audio onTimeUpdate>` tracks `currentTime`; the transcript segment whose `[start_time, end_time)` contains it gets highlighted. `<audio onError>` re-fetches a fresh signed URL, handling the case where a viewer keeps the tab open past the 1hr expiry.
- Action items show `👥 Team` (grey badge) vs `👤 <name>` (indigo badge) based on `owner === "Team"`; clicking an item scrolls the transcript to `source_segment_id` and seeks the audio there.
- Markdown styling: added a small `.markdown-body` rule block in `globals.css` instead of pulling in `@tailwindcss/typography` — Tailwind v4's CSS-first config made a handful of manual rules (headings, lists, bold) cheaper than a new dependency for what's rendered (headers, bullets, numbered lists, bold — confirmed against the real Groq output).
- **Verified locally against the real meeting (`310026c8-0814-41e4-9116-76dca0b09afe`, via Playwright against the local backend + `.env.local` override, screenshots in `/tmp/list.png` and `/tmp/detail.png`):**
  - List page: shows the one real meeting, title/date/`Ready` badge, no errors
  - Detail page: all 29 transcript segments render with speaker + timestamp; summary renders as actual headings/bold/bullets (checked `innerText` has no literal `**`, and `<strong>`/`<li>` elements are present) — not raw markdown text
  - Action items: 5 items shown, `Bilal`/`Sarah`/`Speaker 0` get the 👤 badge, the unowned design-review item gets the 👥 Team badge, matching `progress.md`'s Phase 2 entry
  - Audio: `<audio src>` resolves to a real Supabase signed URL; clicking a transcript timestamp seeks (`currentTime` moved to match, confirmed after waiting for `loadedmetadata` — first attempt without that wait raced and no-opped, not an app bug); clicking the "finish the dashboard" action item scrolled the transcript and seeked to its `source_segment_id`'s timestamp (`16.7s`)
  - Sync highlighting: while playing, the transcript segment matching `currentTime` got the blue highlight class (confirmed via DOM query mid-playback)
- Not yet done: backend/frontend redeploy (Render/Vercel still serve the old stub), no upload UI in the frontend (out of scope for this pass — uploads still go through the API directly)

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

### 2026-09-23 — Upload UI + title rename
- `PATCH /meetings/{id}` added (`backend/app/routers/meetings.py`), updates `title`, 422 on blank, 404 if missing
- Frontend: "Upload meeting" button + modal on the list page (`frontend/app/page.tsx`), inline click-to-edit title on the list rows
- Tested live against the running local backend/frontend (not test data — the actual dev servers):
  - `PATCH /meetings/{id}` via curl on an existing row → title changed in the response, re-`GET` confirmed it persisted
  - `POST /meetings/upload` via curl with `test/test_audio.mp4` and a title → returned in ~14s with `status: "ready"`, real meeting id
  - `npx tsc --noEmit` clean, home page HTML fetched from the running `next dev` server contains the new "Upload meeting" button, no server error
  - Did not have a browser automation tool available in this session to click through the modal/inline-edit interactions visually — logic was verified by reading the code path end to end and confirming both API calls it depends on work correctly against the live servers

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
