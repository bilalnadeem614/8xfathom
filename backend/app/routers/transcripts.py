from fastapi import APIRouter

router = APIRouter(prefix="/transcripts", tags=["transcripts"])


@router.get("/{meeting_id}")
def get_transcript(meeting_id: str):
    return []
