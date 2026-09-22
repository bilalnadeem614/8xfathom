import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import action_items, highlights, meetings, summaries, transcripts

load_dotenv()

app = FastAPI(title="Fathom Clone API")

frontend_origin = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
allowed_origins = {frontend_origin, "http://localhost:3000"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(allowed_origins),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings.router)
app.include_router(transcripts.router)
app.include_router(summaries.router)
app.include_router(action_items.router)
app.include_router(highlights.router)


@app.get("/health")
def health():
    return {"status": "ok"}
