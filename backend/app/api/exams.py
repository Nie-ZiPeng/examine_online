from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse
from app.services.exam_service import get_exams, get_exam, create_exam, update_exam, publish_exam, delete_exam
from app.utils.deps import get_current_user, require_role
from app.utils.response import success_response, paginated_response
from app.models.user import User

router = APIRouter(prefix="/api/exams", tags=["考试管理"])

@router.get("")
async def list_exams(
    course_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "student":
        from app.services.exam_service import get_student_eligible_exams
        exams, total = await get_student_eligible_exams(
            db, current_user.id, page, page_size, status
        )
        exams_data = [ExamResponse.model_validate(e).model_dump() for e in exams]
        return paginated_response(exams_data, total, page, page_size)
    exams, total = await get_exams(db, course_id, status, page, page_size)
    exams_data = [ExamResponse.model_validate(e).model_dump() for e in exams]
    return paginated_response(exams_data, total, page, page_size)

@router.post("")
async def create_new_exam(
    exam_data: ExamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    exam = await create_exam(db, exam_data.model_dump())
    return success_response(data=ExamResponse.model_validate(exam).model_dump())

@router.get("/{exam_id}")
async def get_exam_detail(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exam = await get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    return success_response(data=ExamResponse.model_validate(exam).model_dump())

@router.put("/{exam_id}")
async def update_exam_info(
    exam_id: int,
    exam_data: ExamUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    exam = await update_exam(db, exam_id, exam_data.model_dump(exclude_unset=True))
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    return success_response(data=ExamResponse.model_validate(exam).model_dump())

@router.put("/{exam_id}/publish")
async def publish_exam_action(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    exam = await publish_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="考试不存在")
    return success_response(data=ExamResponse.model_validate(exam).model_dump())

@router.delete("/{exam_id}")
async def delete_exam_info(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    success = await delete_exam(db, exam_id)
    if not success:
        raise HTTPException(status_code=404, detail="考试不存在")
    return success_response(message="删除成功")
