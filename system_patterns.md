# System Patterns

Architectural decisions and conventions for this project. Keep this updated if a decision changes — don't let it drift from what's actually built.

## Architecture

```
Next.js frontend (Vercel)
        |
        v
FastAPI backend (Render)
        |
        +--> Supabase Postgres (data)
        +--> Deepgram (transcription + diarization)
        +--> Groq (summary + action-item generation)
```

## Stack rationale

- **Render over Railway**: Render offers a permanent free tier with fixed monthly compute hours, no card required. Railway's free tier is a one-time credit that expires after 30 days — wrong fit for a project that needs to stay live through the review window. Trade-off: Render cold-starts after inactivity (~30-50s to wake) — warm the backend before demos.
- **Deepgram over AssemblyAI**: more generous free credit for prototyping, diarization (speaker labels) included in the same transcription call, simpler client integration than AssemblyAI's polling-based flow.
- **Groq**: higher free tier limits than alternatives, fast inference, no cost concern for this scope.

## Data model

### meetings
| column | type | notes |
|---|---|---|
| id | uuid, pk | |
| title | text | |
| date | timestamptz | |
| duration_seconds | integer | |
| participants | jsonb | array of names |
| status | enum | uploading \| processing \| ready \| failed |
| audio_url | text | storage location |
| created_at | timestamptz | |

### transcript_segments
| column | type | notes |
|---|---|---|
| id | uuid, pk | |
| meeting_id | uuid, fk -> meetings | |
| speaker | text | |
| start_time | float | seconds |
| end_time | float | seconds |
| text | text | |

### summaries
| column | type | notes |
|---|---|---|
| id | uuid, pk | |
| meeting_id | uuid, fk -> meetings | |
| template_type | text | "general" \| "sales_call" \| "standup" |
| content | text | |
| generated_at | timestamptz | |

### action_items
| column | type | notes |
|---|---|---|
| id | uuid, pk | |
| meeting_id | uuid, fk -> meetings | |
| owner | text | |
| task | text | |
| due_date | date | nullable |
| source_segment_id | uuid, fk -> transcript_segments | nullable |

### highlights
| column | type | notes |
|---|---|---|
| id | uuid, pk | |
| meeting_id | uuid, fk -> meetings | |
| timestamp | float | seconds |
| note | text | nullable |
| created_at | timestamptz | |

## Conventions

- Backend: FastAPI routers grouped by resource (`/meetings`, `/transcripts`, `/summaries`, `/action-items`, `/highlights`)
- All timestamps in seconds as floats, relative to the start of the recording
- `Meeting.status` drives frontend UI state — always check status before rendering transcript/summary panels
- Auth: none (single-tenant, service-role Supabase key from backend only) — no Supabase RLS policies needed
- No calendar OAuth — static UI only
- No live meeting bot — upload-based ingest only

## Environment

- Python 3.11, conda env `8x`
- Secrets (API keys for Supabase, Deepgram, Groq) via `.env`, never committed
- Backend deployed on Render; remember cold starts (~30-50s) after idle periods
