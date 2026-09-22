# CLAUDE.md

This file gives Claude Code the context it needs to work in this repo. Read this first, then `prd.md`, `implementation_plan.md`, and `active_context.md` before making changes.

## Project

A clone of [fathom.video](https://fathom.video) — an AI meeting notetaker — built as a timed take-home assignment for 8x (Software Engineer role). Full scope, constraints, and grading criteria are in `prd.md`.

## Skills / Plugins

Use the `graphify`, `cave-man`, and `ponytail` skills/plugins for responses in this project, where applicable to the task at hand.

## Stack (finalized)

- Backend: FastAPI (Python 3.11, conda env `8x`)
- Database: Supabase (Postgres)
- Frontend: Next.js (React)
- Transcription: Deepgram (diarization included in the same call)
- LLM (summary / action items): Groq
- Deploy: frontend → Vercel, backend → Render

## Environment

- Conda env name: `8x`, Python 3.11
- Activate with: `conda activate 8x`
- Install backend deps with `pip install -r requirements.txt` inside the env

## Working conventions

- Follow the data model and phase order in `implementation_plan.md` — don't jump ahead to polish before the core ingest → transcribe → summarize pipeline works end to end.
- Log agent prompts/responses into `.agent-logs/` as you go (already configured — don't remove or bypass the hook).
- Commit `.agent-logs/` incrementally, not in one lump at the end.
- Update `progress.md` and `active_context.md` after each meaningful chunk of work, so context survives across sessions.
- Keep scope disciplined: see "Explicitly out of scope" in `prd.md` before building anything not already listed there.
- Render's free tier cold-starts after inactivity (~30-50s to wake). Warm the backend before demoing/recording — don't let a reviewer's first click hit a cold start.

## Do not

- Do not build real calendar OAuth (Google/Microsoft) — a static "connect calendar" UI is sufficient.
- Do not attempt to make the meeting bot actually join a live Zoom/Meet/Teams call — this is explicitly allowed to be stubbed per the assignment brief.
- Do not add multi-user auth, teams, or CRM sync — out of scope for this assignment.
