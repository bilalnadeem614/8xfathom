import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.transcription import transcribe_audio
from app.supabase_client import get_supabase

router = APIRouter(prefix="/meetings", tags=["meetings"])

STORAGE_BUCKET = "meeting-audio"


def _parse_participants(raw: str | None) -> list[str]:
    if not raw or not raw.strip():
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(p).strip() for p in parsed if str(p).strip()]
    except json.JSONDecodeError:
        pass
    return [p.strip() for p in raw.split(",") if p.strip()]


def _process_meeting(meeting_id: str, storage_path: str, file_bytes: bytes, content_type: str) -> None:
    """Upload audio + transcribe. Kept as a standalone function so it can later be
    handed to FastAPI BackgroundTasks instead of being awaited inline."""
    supabase = get_supabase()
    supabase.storage.from_(STORAGE_BUCKET).upload(
        storage_path, file_bytes, file_options={"content-type": content_type}
    )

    segments = transcribe_audio(file_bytes)
    if segments:
        supabase.table("transcript_segments").insert(
            [{**seg, "meeting_id": meeting_id} for seg in segments]
        ).execute()

    supabase.table("meetings").update({"status": "ready"}).eq("id", meeting_id).execute()


@router.get("")
def list_meetings():
    return []


@router.get("/{meeting_id}")
def get_meeting(meeting_id: str):
    supabase = get_supabase()
    meeting_res = supabase.table("meetings").select("*").eq("id", meeting_id).maybe_single().execute()
    if not meeting_res.data:
        raise HTTPException(status_code=404, detail="Meeting not found")

    segments_res = (
        supabase.table("transcript_segments")
        .select("*")
        .eq("meeting_id", meeting_id)
        .order("start_time")
        .execute()
    )
    return {**meeting_res.data, "transcript_segments": segments_res.data}


@router.post("")
def create_meeting():
    return {"id": "stub", "status": "uploading"}


@router.post("/upload")
async def upload_meeting(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    participants: str | None = Form(None),
):
    supabase = get_supabase()
    meeting_id = str(uuid.uuid4())
    storage_path = f"{meeting_id}/{file.filename}"
    file_bytes = await file.read()

    meeting = {
        "id": meeting_id,
        "title": title or file.filename,
        "date": datetime.now(timezone.utc).isoformat(),
        "participants": _parse_participants(participants),
        "status": "processing",
        "audio_url": storage_path,
    }
    supabase.table("meetings").insert(meeting).execute()

    try:
        _process_meeting(meeting_id, storage_path, file_bytes, file.content_type or "application/octet-stream")
    except Exception as exc:
        supabase.table("meetings").update({"status": "failed"}).eq("id", meeting_id).execute()
        raise HTTPException(status_code=502, detail=f"Upload/transcription failed: {exc}") from exc

    return supabase.table("meetings").select("*").eq("id", meeting_id).single().execute().data
