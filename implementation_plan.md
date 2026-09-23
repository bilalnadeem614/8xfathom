# Implementation Plan

Build in this order. Don't move to the next phase until the current one works end to end — a working, smaller product beats a half-built, larger one, given "speed" and "what you chose to build first" are both graded directly.

## Phase 0 — Research (done before any code)

- [X] Sign up for real fathom.video free plan
- [X] Connect a calendar
- [ ] Run a real self-call (Zoom/Meet/Teams) with the Fathom bot recording
- [ ] Walk every flow: playback vs transcript, AI summary, template switching, action items, highlight a moment, search across meetings, share a clip
- [ ] Screenshot each flow for reference during the walkthrough recording

## Phase 1 — Environment & skeleton

- [X] Conda env `8x`, Python 3.11 (done)
- [X] Supabase project created, tables created from `system_patterns.md` schema (done)
- [X] FastAPI project scaffolded (`/meetings`, `/transcripts`, `/summaries`, `/action-items`, `/highlights` routers)
- [X] Next.js project scaffolded with a blank meetings list page
- [X] Backend deployed to Render, frontend deployed to Vercel — confirm a live URL loads before writing any feature code
- [X] Deepgram account created, API key in `.env`
- [X] Groq account created, API key in `.env`

## Phase 2 — Core pipeline

- [ ] Upload endpoint: accept an audio/video file, store it, create a `Meeting` row with status `processing`
- [ ] Transcription integration (Deepgram): send audio, receive segments with speaker + timestamps, write to `TranscriptSegment`
- [ ] Summary generation (Groq): prompt the LLM with the full transcript, write result to `Summary`
- [ ] Action item extraction (Groq): prompt the LLM for structured owner/task output, write to `ActionItem`, link to nearest `TranscriptSegment` where possible
- [ ] Update `Meeting.status` to `ready` once all steps complete; handle `failed` state on error

## Phase 3 — Core UI

- [ ] Meeting list page (real data, not mocked)
- [ ] Meeting detail page: transcript panel synced to audio/video playback, summary panel, action items panel
- [ ] Loading/processing state shown correctly while a meeting is still being transcribed/summarized

## Phase 4 — Differentiators (priority order, stop when time runs out)

- [ ] Ask-the-call chat (RAG over the single meeting's transcript, via Groq)
- [ ] Multiple summary templates, switchable
- [ ] Highlights (mark timestamp, jump to it)
- [ ] Search across meetings
- [ ] Public shareable link for a meeting summary/clip

## Phase 5 — Seed data & polish

- [ ] Seed several realistic meetings, including one long multi-speaker (~8 people, ~1hr) transcript
- [ ] Confirm the live link works fully signed out
- [ ] Warm the Render backend before any reviewer is likely to click through (cold start ~30-50s)
- [ ] UI pass: spacing, empty states, error states
- [ ] Confirm `.agent-logs/` has been committed incrementally throughout, not just at the end

## Phase 6 — Walkthrough & submission

- [ ] Record Loom, camera on, under 5 minutes: what real Fathom does → what was built → what was deliberately cut and why
- [ ] Confirm repo is public
- [ ] Paste live link + repo link into the application, each labeled
