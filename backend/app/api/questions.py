from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionResponse, QuestionImport
from app.services.question_service import get_questions, get_question, create_question, batch_create_questions, update_question, delete_question
from app.utils.deps import get_current_user, require_role
from app.utils.response import success_response, paginated_response
from app.models.user import User

router = APIRouter(tags=["题目管理"])

@router.get("/api/exams/{exam_id}/questions")
async def list_questions(
    exam_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    questions, total = await get_questions(db, exam_id, page, page_size)
    questions_data = [QuestionResponse.model_validate(q).model_dump() for q in questions]
    return paginated_response(questions_data, total, page, page_size)

@router.post("/api/exams/{exam_id}/questions")
async def create_new_question(
    exam_id: int,
    question_data: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    question = await create_question(db, exam_id, question_data.model_dump())
    return success_response(data=QuestionResponse.model_validate(question).model_dump())

@router.post("/api/exams/{exam_id}/questions/import")
async def import_questions(
    exam_id: int,
    import_data: QuestionImport,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    questions = await batch_create_questions(
        db, exam_id, [q.model_dump() for q in import_data.questions]
    )
    questions_data = [QuestionResponse.model_validate(q).model_dump() for q in questions]
    return success_response(data=questions_data)

@router.put("/api/questions/{question_id}")
async def update_question_info(
    question_id: int,
    question_data: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    question = await update_question(db, question_id, question_data.model_dump(exclude_unset=True))
    if not question:
        raise HTTPException(status_code=404, detail="题目不存在")
    return success_response(data=QuestionResponse.model_validate(question).model_dump())

@router.delete("/api/questions/{question_id}")
async def delete_question_info(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    success = await delete_question(db, question_id)
    if not success:
        raise HTTPException(status_code=404, detail="题目不存在")
    return success_response(message="删除成功")
