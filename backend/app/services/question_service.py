import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.question import Question

async def get_questions(db: AsyncSession, exam_id: int, page: int = 1, page_size: int = 10):
    query = select(Question).where(Question.exam_id == exam_id).order_by(Question.sort_order)
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    return result.scalars().all(), total

async def get_question(db: AsyncSession, question_id: int):
    result = await db.execute(select(Question).where(Question.id == question_id))
    return result.scalar_one_or_none()

async def create_question(db: AsyncSession, exam_id: int, question_data: dict):
    options = question_data.get("options")
    if options and isinstance(options, list):
        options = json.dumps(options, ensure_ascii=False)
    
    question = Question(
        exam_id=exam_id,
        type=question_data["type"],
        content=question_data["content"],
        options=options,
        answer=question_data.get("answer"),
        score=question_data.get("score", 1),
        sort_order=question_data.get("sort_order", 0),
        analysis=question_data.get("analysis"),
        grading_rubric=question_data.get("grading_rubric"),
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question

async def batch_create_questions(db: AsyncSession, exam_id: int, questions_data: list):
    questions = []
    for q_data in questions_data:
        question = await create_question(db, exam_id, q_data)
        questions.append(question)
    return questions

async def update_question(db: AsyncSession, question_id: int, question_data: dict):
    question = await get_question(db, question_id)
    if not question:
        return None
    
    if "options" in question_data:
        options = question_data["options"]
        if isinstance(options, list):
            question_data["options"] = json.dumps(options, ensure_ascii=False)
    
    for key, value in question_data.items():
        if value is not None:
            setattr(question, key, value)
    
    await db.commit()
    await db.refresh(question)
    return question

async def delete_question(db: AsyncSession, question_id: int):
    question = await get_question(db, question_id)
    if not question:
        return False
    await db.delete(question)
    await db.commit()
    return True
