from fastapi import APIRouter

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.get("")
def list_meetings():
    return []


@router.get("/{meeting_id}")
def get_meeting(meeting_id: str):
    return {"id": meeting_id, "status": "processing"}


@router.post("")
def create_meeting():
    return {"id": "stub", "status": "uploading"}
