from fastapi import APIRouter, Depends
from services.auth import verify_token

router = APIRouter(tags=["investments"])


@router.get("/")
def investments_status(uid: str = Depends(verify_token)):
    return {"status": "planned", "message": "Investment portfolio tracking is on the roadmap for Phase 4"}
