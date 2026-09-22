# Backend

FastAPI app, Python 3.11, conda env `8x`.

## Local dev

```
conda activate 8x
pip install -r requirements.txt
cp .env.example .env   # fill in real values
uvicorn main:app --reload
```

`/health` returns `{"status": "ok"}`.

## Render deploy

- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT` (also in `Procfile`)
- Set env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEEPGRAM_API_KEY`, `GROQ_API_KEY`, `FRONTEND_ORIGIN`) in Render's dashboard — never commit them.

Render's free tier cold-starts after inactivity (~30-50s) — expected, not a bug. Warm it before demos.
