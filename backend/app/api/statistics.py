from io import BytesIO
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.statistics_service import get_exam_statistics, export_exam_scores, get_dashboard_data
from app.services.dashboard_export_service import (
    DashboardExportError,
    allowed_datasets_for_role,
    get_dashboard_export_datasets,
    render_dashboard_export,
)
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

@router.get("/api/statistics/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = await get_dashboard_data(db, current_user)
    return success_response(data=data)


@router.get("/api/statistics/dashboard/export")
async def export_dashboard_file(
    file_format: Literal["csv", "xlsx"],
    dataset: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    selected_dataset = dataset or "summary"
    if file_format == "csv" and selected_dataset not in allowed_datasets_for_role(
        current_user.role
    ):
        raise HTTPException(status_code=400, detail="当前角色不支持该导出数据集")

    try:
        datasets = await get_dashboard_export_datasets(db, current_user)
        content, media_type, filename = render_dashboard_export(
            datasets,
            file_format,
            selected_dataset if file_format == "csv" else None,
        )
    except DashboardExportError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return StreamingResponse(
        BytesIO(content),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
