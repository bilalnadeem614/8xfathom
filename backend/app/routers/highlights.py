from fastapi import APIRouter

router = APIRouter(prefix="/highlights", tags=["highlights"])


@router.get("/{meeting_id}")
def list_highlights(meeting_id: str):
    return []


@router.post("/{meeting_id}")
def create_highlight(meeting_id: str):
    return {"id": "stub", "meeting_id": meeting_id}
