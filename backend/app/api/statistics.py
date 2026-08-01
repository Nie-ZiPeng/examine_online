from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.statistics_service import get_exam_statistics, export_exam_scores
from app.utils.deps import get_current_user, require_role
from app.utils.response import success_response
from app.models.user import User

router = APIRouter(tags=["统计报表"])

@router.get("/api/statistics/exam/{exam_id}")
async def get_exam_stats(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    stats = await get_exam_statistics(db, exam_id)
    if not stats:
        return success_response(data={"message": "暂无数据"})
    return success_response(data=stats)

@router.get("/api/statistics/export/{exam_id}")
async def export_scores(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    data = await export_exam_scores(db, exam_id)
    return success_response(data=data)
