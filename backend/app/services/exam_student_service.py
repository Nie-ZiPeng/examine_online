import json
import random
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.exam import Exam
from app.models.question import Question
from app.models.exam_record import ExamRecord
from app.models.answer import Answer
from app.redis_client import redis_client

async def start_exam(db: AsyncSession, exam_id: int, student_id: int):
    # 检查考试是否存在
    exam = await db.get(Exam, exam_id)
    if not exam or exam.status != "published":
        return None, "考试不存在或未发布"
    
    # 检查是否已参加过
    result = await db.execute(
        select(ExamRecord).where(
            ExamRecord.student_id == student_id,
            ExamRecord.exam_id == exam_id
        )
    )
    existing_record = result.scalar_one_or_none()
    if existing_record and existing_record.status == "ongoing":
        return existing_record, None
    
    if existing_record and existing_record.status == "submitted":
        return None, "已提交过该考试"
    
    # 创建考试记录
    record = ExamRecord(
        student_id=student_id,
        exam_id=exam_id,
        start_time=datetime.now(),
        status="ongoing"
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    
    # 获取题目并随机排序
    result = await db.execute(
        select(Question).where(Question.exam_id == exam_id)
    )
    questions = result.scalars().all()
    
    if exam.random_order:
        random.shuffle(questions)
    
    # 缓存试卷到Redis
    paper_data = {
        "exam_id": exam_id,
        "record_id": record.id,
        "questions": [{"id": q.id, "order": i} for i, q in enumerate(questions)]
    }
    await redis_client.set(
        f"exam:paper:{exam_id}:{student_id}",
        json.dumps(paper_data),
        ex=exam.duration * 60
    )
    
    return record, None

async def get_paper(db: AsyncSession, exam_id: int, student_id: int):
    # 从Redis获取缓存的试卷
    cached = await redis_client.get(f"exam:paper:{exam_id}:{student_id}")
    if not cached:
        return None, "考试未开始或已结束"
    
    paper_data = json.loads(cached)
    record_id = paper_data["record_id"]
    
    # 获取题目详情
    question_ids = [q["id"] for q in paper_data["questions"]]
    result = await db.execute(
        select(Question).where(Question.id.in_(question_ids))
    )
    questions = result.scalars().all()
    questions_map = {q.id: q for q in questions}
    
    # 按缓存顺序排列
    ordered_questions = []
    for q_ref in paper_data["questions"]:
        q = questions_map[q_ref["id"]]
        options = json.loads(q.options) if q.options else None
        ordered_questions.append({
            "id": q.id,
            "type": q.type,
            "content": q.content,
            "options": options,
            "score": q.score
        })
    
    # 获取已保存的答案
    result = await db.execute(
        select(Answer).where(Answer.record_id == record_id)
    )
    answers = result.scalars().all()
    saved_answers = {a.question_id: a.student_answer for a in answers}
    
    return {
        "record_id": record_id,
        "questions": ordered_questions,
        "saved_answers": saved_answers
    }, None

async def save_answers(db: AsyncSession, exam_id: int, student_id: int, answers: dict):
    # 获取考试记录
    result = await db.execute(
        select(ExamRecord).where(
            ExamRecord.student_id == student_id,
            ExamRecord.exam_id == exam_id,
            ExamRecord.status == "ongoing"
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        return False, "考试未进行中"
    
    # 保存答案到Redis（自动保存）
    await redis_client.set(
        f"exam:autosave:{exam_id}:{student_id}",
        json.dumps(answers),
        ex=3600
    )
    
    return True, None

async def submit_exam(db: AsyncSession, exam_id: int, student_id: int):
    # 获取考试记录
    result = await db.execute(
        select(ExamRecord).where(
            ExamRecord.student_id == student_id,
            ExamRecord.exam_id == exam_id,
            ExamRecord.status == "ongoing"
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        return None, "考试未进行中"
    
    # 从Redis获取保存的答案
    cached_answers = await redis_client.get(f"exam:autosave:{exam_id}:{student_id}")
    answers = json.loads(cached_answers) if cached_answers else {}
    
    # 获取题目
    result = await db.execute(
        select(Question).where(Question.exam_id == exam_id)
    )
    questions = result.scalars().all()
    questions_map = {q.id: q for q in questions}
    
    total_score = 0
    
    # 批改客观题
    for q in questions:
        student_answer = answers.get(str(q.id))
        # 多选题答案可能是列表，拼接为字符串以便入库和批改
        if isinstance(student_answer, list):
            student_answer = "".join(student_answer)
        
        answer = Answer(
            record_id=record.id,
            question_id=q.id,
            student_answer=student_answer
        )
        
        if q.type in ["single", "multiple", "judge"]:
            # 自动批改
            if student_answer and q.answer:
                is_correct = student_answer.upper() == q.answer.upper()
                answer.is_correct = is_correct
                answer.score = q.score if is_correct else 0
                total_score += answer.score
        
        db.add(answer)
    
    # 更新考试记录
    record.submit_time = datetime.now()
    record.score = total_score
    record.status = "submitted"
    
    await db.commit()
    await db.refresh(record)
    
    # 清理Redis缓存
    await redis_client.delete(f"exam:paper:{exam_id}:{student_id}")
    await redis_client.delete(f"exam:autosave:{exam_id}:{student_id}")
    await redis_client.delete(f"exam:countdown:{exam_id}:{student_id}")
    await redis_client.delete(f"exam:switch:{exam_id}:{student_id}")
    
    return record, None
