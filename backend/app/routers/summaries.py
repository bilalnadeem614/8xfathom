from fastapi import APIRouter

router = APIRouter(prefix="/summaries", tags=["summaries"])


@router.get("/{meeting_id}")
def get_summary(meeting_id: str):
    return None
