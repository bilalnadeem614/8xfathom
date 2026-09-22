from fastapi import APIRouter

router = APIRouter(prefix="/action-items", tags=["action-items"])


@router.get("/{meeting_id}")
def list_action_items(meeting_id: str):
    return []
