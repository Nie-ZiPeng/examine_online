from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.exam_record import ExamRecord
from app.models.question import Question

async def get_exam_statistics(db: AsyncSession, exam_id: int):
    result = await db.execute(
        select(ExamRecord).where(ExamRecord.exam_id == exam_id)
    )
    records = result.scalars().all()
    
    if not records:
        return None
    
    # 计算统计数据
    scores = [r.score for r in records]
    total_students = len(records)
    avg_score = sum(scores) / total_students if total_students > 0 else 0
    
    # 获取及格分数
    result = await db.execute(select(Question).where(Question.exam_id == exam_id))
    questions = result.scalars().all()
    total_score = sum(q.score for q in questions)
    pass_score = total_score * 0.6  # 假设60%及格
    
    pass_count = sum(1 for s in scores if s >= pass_score)
    pass_rate = (pass_count / total_students * 100) if total_students > 0 else 0
    
    # 分数分布
    distribution = {
        "0-59": 0,
        "60-69": 0,
        "70-79": 0,
        "80-89": 0,
        "90-100": 0
    }
    
    for s in scores:
        if s < 60:
            distribution["0-59"] += 1
        elif s < 70:
            distribution["60-69"] += 1
        elif s < 80:
            distribution["70-79"] += 1
        elif s < 90:
            distribution["80-89"] += 1
        else:
            distribution["90-100"] += 1
    
    return {
        "total_students": total_students,
        "avg_score": round(avg_score, 2),
        "max_score": max(scores),
        "min_score": min(scores),
        "pass_rate": round(pass_rate, 2),
        "distribution": distribution
    }

async def export_exam_scores(db: AsyncSession, exam_id: int):
    result = await db.execute(
        select(ExamRecord).where(ExamRecord.exam_id == exam_id)
    )
    records = result.scalars().all()
    
    export_data = []
    for r in records:
        export_data.append({
            "student_id": r.student_id,
            "score": r.score,
            "status": r.status,
            "start_time": r.start_time.isoformat() if r.start_time else None,
            "submit_time": r.submit_time.isoformat() if r.submit_time else None
        })
    
    return export_data
