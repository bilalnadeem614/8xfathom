# 8x Fathom Redesign

An AI meeting notetaker, using fathom.video as a reference rather than a blueprint.

**Product decision:** Fathom is meeting-first — you browse meetings, then dig in to find what to act on. This build is action-items-first: the home page is a cross-meeting inbox of tasks (owner, source meeting, timestamp), with meetings as a secondary view.

## Stack
- Backend: FastAPI (Python)
- Frontend: Next.js
- DB: Supabase (Postgres)
- Transcription: Deepgram
- LLM (summary, action items, chat): Groq
- Deploy: frontend on Vercel, backend on Render

## Structure
- `/frontend` — Next.js app
- `/backend` — FastAPI app
- `/db` — schema
- `.agent-logs/` — captured agent prompts/responses

## Live
See submission for live link, walkthrough, and intro video.