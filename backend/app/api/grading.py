from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.answer import GradeRequest
from app.services.grading_service import get_exam_records, get_record_answers, grade_answer, finalize_record
from app.utils.deps import get_current_user, require_role
from app.utils.response import success_response
from app.models.user import User

router = APIRouter(tags=["阅卷管理"])

@router.get("/api/exams/{exam_id}/records")
async def list_exam_records(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    records = await get_exam_records(db, exam_id)
    records_data = [
        {
            "id": r.id,
            "student_id": r.student_id,
            "exam_id": r.exam_id,
            "score": r.score,
            "status": r.status,
            "switch_count": r.switch_count,
            "start_time": r.start_time,
            "submit_time": r.submit_time
        }
        for r in records
    ]
    return success_response(data=records_data)

@router.get("/api/records/{record_id}/answers")
async def list_record_answers(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    answers = await get_record_answers(db, record_id)
    return success_response(data=answers)

@router.put("/api/answers/{answer_id}/grade")
async def grade_single_answer(
    answer_id: int,
    grade_data: GradeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    answer = await grade_answer(
        db, answer_id, current_user.id, grade_data.score, grade_data.is_correct
    )
    if not answer:
        raise HTTPException(status_code=404, detail="答案不存在")
    return success_response(data={"id": answer.id, "score": answer.score})

@router.put("/api/records/{record_id}/finalize")
async def finalize_record_action(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    record = await finalize_record(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return success_response(data={"id": record.id, "status": record.status})
