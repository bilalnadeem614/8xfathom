import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.summarization import extract_action_items, generate_summary
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


def _transcribe_and_store(meeting_id: str, storage_path: str, file_bytes: bytes, content_type: str) -> list[dict]:
    """Upload audio + transcribe, returns the inserted transcript_segment rows (with ids)."""
    supabase = get_supabase()
    supabase.storage.from_(STORAGE_BUCKET).upload(
        storage_path, file_bytes, file_options={"content-type": content_type}
    )

    segments = transcribe_audio(file_bytes)
    if not segments:
        return []

    inserted = (
        supabase.table("transcript_segments")
        .insert([{**seg, "meeting_id": meeting_id} for seg in segments])
        .execute()
    )
    return inserted.data


def summarize_and_store(meeting_id: str, transcript_segments: list[dict]) -> None:
    """Generate summary + action items and write them, then flip status to ready.
    A failure in one step doesn't skip the other -- both are attempted, and any
    failures are combined into a single error so the caller can mark status=failed
    with a clear reason."""
    supabase = get_supabase()
    errors: list[str] = []

    try:
        summary_text = generate_summary(transcript_segments, template_type="general")
        supabase.table("summaries").insert(
            {"meeting_id": meeting_id, "template_type": "general", "content": summary_text}
        ).execute()
    except Exception as exc:
        errors.append(f"summary generation failed: {exc}")

    try:
        action_items = extract_action_items(transcript_segments)
        if action_items:
            supabase.table("action_items").insert(
                [{**item, "meeting_id": meeting_id} for item in action_items]
            ).execute()
    except Exception as exc:
        errors.append(f"action item extraction failed: {exc}")

    if errors:
        raise RuntimeError("; ".join(errors))

    supabase.table("meetings").update({"status": "ready"}).eq("id", meeting_id).execute()


def _process_meeting(meeting_id: str, storage_path: str, file_bytes: bytes, content_type: str) -> None:
    """Full pipeline: transcribe, then summarize + extract action items. Kept as a
    standalone function so it can later be handed to FastAPI BackgroundTasks instead
    of being awaited inline. status stays "processing" for the whole run and only
    becomes "ready" once every step below has succeeded."""
    segments = _transcribe_and_store(meeting_id, storage_path, file_bytes, content_type)
    summarize_and_store(meeting_id, segments)


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
        raise HTTPException(status_code=502, detail=f"Meeting pipeline failed: {exc}") from exc

    return supabase.table("meetings").select("*").eq("id", meeting_id).single().execute().data
