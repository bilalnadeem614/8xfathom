# Product Requirements Document — Fathom Clone (8x Assignment)

## Overview

Rebuild fathom.video, an AI meeting notetaker, as a working live product within a 24-hour window. Goal is not full feature parity — goal is a coherent, well-scoped product that demonstrates speed, product judgment, and UX quality.

## Reference product

[fathom.video](https://fathom.video) — records meetings, transcribes them, generates AI summaries, extracts action items, supports highlights, search across meetings, and shareable clips.

## Stack

- Backend: FastAPI (Python 3.11)
- Database: Supabase (Postgres)
- Frontend: Next.js (React)
- Transcription: Deepgram
- LLM (summary / action items): Groq
- Deploy: frontend → Vercel, backend → Render

## Grading criteria (from the brief)

1. **Speed** — how much working product got built in the time available.
2. **Product judgment** — what was chosen to build first, what was deliberately left out.
3. **UX/UI** — whether the shipped thing is good to use.

## In scope — core loop (build first)

- Upload an audio/video recording of a meeting (no live bot joining — see "Explicitly out of scope")
- Transcription with speaker labels (via Deepgram)
- AI-generated summary of the meeting (via Groq)
- Action item extraction (owner + task, linked back to the transcript moment it came from)
- Meeting detail page: transcript synced to audio/video playback, summary, and action items shown together

## In scope — differentiators (build if time allows, in priority order)

1. **Ask-the-call chat** — a small RAG-style chat that answers questions grounded in a specific meeting's transcript. Highest-signal feature for showing agentic/AI judgment, not just an API wrapper.
2. Multiple summary templates per meeting (e.g. "General", "Sales Call", "Standup"), switchable in the UI
3. Highlights — mark a moment mid-transcript, jump back to it by timestamp
4. Search across meetings (transcript + summary text)
5. Shareable public clip/summary link (also satisfies "opens for someone not signed in")
6. Meeting list, seeded with multiple meetings including one long, multi-speaker (~8 people, ~1 hour) transcript

## Explicitly out of scope (stub or skip, and say so in the walkthrough)

- Live meeting bot joining Zoom/Meet/Teams — stub this; explicitly allowed by the brief
- Real calendar OAuth (Google/Microsoft) — static "connect calendar" screen only
- Multi-user accounts, teams, permissions
- CRM sync (Salesforce, HubSpot, etc.)
- Video clip generation / editing

## Deliverables

- Live, deployed link (not localhost) — must open for a signed-out visitor
- Public GitHub repository with `.agent-logs/` committed incrementally
- A Loom (or similar) walkthrough, camera on, 5 minutes max, covering: what real Fathom does, what was built, what was deliberately cut and why

## Success criteria

- A visitor with no account can open the live link and see a populated, realistic meeting list (not empty)
- At least one meeting has a full transcript, summary, and action items generated from a real pipeline run (not hardcoded/fake data)
- The core loop works without errors end to end: upload → transcribe → summarize → view

## Operational notes

- Render's free tier cold-starts after inactivity (~30-50s). Warm the backend before the reviewer is likely to click the live link, and definitely before recording the walkthrough.
