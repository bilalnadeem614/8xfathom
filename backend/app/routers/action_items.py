from fastapi import APIRouter

from app.supabase_client import get_supabase

router = APIRouter(prefix="/action-items", tags=["action-items"])


@router.get("")
def list_action_items():
    supabase = get_supabase()
    res = supabase.table("action_items").select("*, meeting:meetings(id, title, date)").execute()
    return sorted(res.data, key=lambda item: item["meeting"]["date"], reverse=True)
