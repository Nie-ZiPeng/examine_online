from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.exam_student_service import start_exam, get_paper, save_answers, submit_exam, get_my_records
from app.services.anti_cheat_service import record_switch, get_switch_status
from app.utils.deps import get_current_user, require_role
from app.utils.response import success_response, error_response
from app.models.user import User

router = APIRouter(tags=["学生考试"])

@router.get("/api/records")
async def list_my_records(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    records = await get_my_records(db, current_user.id)
    return success_response(data=records)

@router.post("/api/exams/{exam_id}/start")
async def start_exam_action(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    record, error = await start_exam(db, exam_id, current_user.id)
    if error:
        return error_response(message=error)
    return success_response(data={"record_id": record.id})

@router.get("/api/exams/{exam_id}/paper")
async def get_paper_action(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    paper, error = await get_paper(db, exam_id, current_user.id)
    if error:
        return error_response(message=error)
    return success_response(data=paper)

@router.post("/api/exams/{exam_id}/save")
async def save_answers_action(
    exam_id: int,
    answers: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    success, error = await save_answers(db, exam_id, current_user.id, answers)
    if not success:
        return error_response(message=error)
    return success_response(message="保存成功")

@router.post("/api/exams/{exam_id}/submit")
async def submit_exam_action(
    exam_id: int,
    payload: Optional[dict] = Body(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    submitted_answers = payload.get("answers") if payload else None
    record, error = await submit_exam(db, exam_id, current_user.id, submitted_answers)
    if error:
        return error_response(message=error)
    return success_response(data={"score": record.score})

@router.post("/api/exams/{exam_id}/switch")
async def record_switch_action(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    data, error = await record_switch(db, exam_id, current_user.id)
    if error:
        return error_response(message=error)
    return success_response(data=data)

@router.get("/api/exams/{exam_id}/switch-status")
async def get_switch_status_action(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    data = await get_switch_status(db, exam_id, current_user.id)
    if not data:
        return error_response(message="考试不存在")
    return success_response(data=data)
