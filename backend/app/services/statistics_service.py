from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from app.models.exam_record import ExamRecord
from app.models.question import Question
from app.models.exam import Exam
from app.models.course import Course
from app.models.user import User
from app.models.answer import Answer

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

async def get_dashboard_data(db: AsyncSession, user: User) -> dict:
    now = datetime.now()

    if user.role == "student":
        exam_result = await db.execute(
            select(Exam)
            .where(Exam.status.in_(["published", "ongoing"]), Exam.end_time > now)
            .order_by(Exam.start_time.asc())
        )
        available = exam_result.scalars().all()
        available_exams = len(available)

        record_result = await db.execute(
            select(ExamRecord).where(ExamRecord.student_id == user.id)
        )
        records = record_result.scalars().all()
        my_exam_count = len(records)

        graded = [r for r in records if r.status in ("submitted", "graded") and r.score is not None]
        avg_score = round(sum(r.score for r in graded) / len(graded), 2) if graded else 0

        pass_result = await db.execute(
            select(ExamRecord, Exam.pass_score)
            .join(Exam, Exam.id == ExamRecord.exam_id)
            .where(ExamRecord.student_id == user.id, ExamRecord.status.in_(["submitted", "graded"]))
        )
        pass_rows = pass_result.all()
        passed = sum(1 for r, p in pass_rows if r.score is not None and r.score >= p)
        pass_rate = round(passed / len(pass_rows) * 100, 2) if pass_rows else 0

        upcoming = [
            {
                "id": e.id,
                "title": e.title,
                "start_time": e.start_time,
                "duration": e.duration,
            }
            for e in available[:2]
        ]

        recent = []
        for r in records[:5]:
            if r.status not in ("submitted", "graded"):
                continue
            p_result = await db.execute(
                select(Exam.pass_score).where(Exam.id == r.exam_id)
            )
            p = p_result.scalar_one_or_none() or 0
            t_result = await db.execute(select(Exam.title).where(Exam.id == r.exam_id))
            recent.append({
                "id": r.id,
                "exam_id": r.exam_id,
                "exam_title": t_result.scalar_one_or_none() or "",
                "score": r.score,
                "pass_score": p,
                "status": r.status,
                "submit_time": r.submit_time,
            })
            if len(recent) >= 5:
                break

        return {
            "role": user.role,
            "stats": {
                "available_exams": available_exams,
                "my_exam_count": my_exam_count,
                "avg_score": avg_score,
                "pass_rate": pass_rate,
            },
            "upcoming_exams": upcoming,
            "recent_records": recent,
        }

    if user.role == "teacher":
        course_result = await db.execute(
            select(Course).where(Course.teacher_id == user.id)
        )
        courses = course_result.scalars().all()
        course_ids = [c.id for c in courses]
        course_count = len(courses)

        exam_query = select(Exam)
        if course_ids:
            exam_query = exam_query.where(Exam.course_id.in_(course_ids))
        exam_result = await db.execute(exam_query)
        exams = exam_result.scalars().all()
        exam_ids = [e.id for e in exams]
        published_exams = sum(1 for e in exams if e.status in ("published", "ongoing"))

        total_records = 0
        pending_by_exam = {}
        if exam_ids:
            rec_result = await db.execute(
                select(ExamRecord).where(ExamRecord.exam_id.in_(exam_ids))
            )
            records = rec_result.scalars().all()
            total_records = len(records)
            record_ids = [r.id for r in records]
            if record_ids:
                ans_result = await db.execute(
                    select(Answer).where(
                        Answer.record_id.in_(record_ids),
                        Answer.grading_source == "pending",
                    )
                )
                answers = ans_result.scalars().all()
                record_map = {r.id: r for r in records}
                for a in answers:
                    exam_of_record = record_map[a.record_id]
                    pending_by_exam.setdefault(exam_of_record.exam_id, 0)
                    pending_by_exam[exam_of_record.exam_id] += 1

        pending_grading = []
        for e in exams:
            count = pending_by_exam.get(e.id, 0)
            if count > 0:
                pending_grading.append({
                    "exam_id": e.id,
                    "exam_title": e.title,
                    "pending_count": count,
                })
        pending_grading = pending_grading[:5]
        pending_grading_count = sum(i["pending_count"] for i in pending_grading)

        recent_exams = [
            {
                "id": e.id,
                "title": e.title,
                "status": e.status,
                "start_time": e.start_time,
            }
            for e in sorted(exams, key=lambda x: x.start_time, reverse=True)[:5]
        ]

        return {
            "role": user.role,
            "stats": {
                "published_exams": published_exams,
                "pending_grading_count": pending_grading_count,
                "course_count": course_count,
                "total_records": total_records,
            },
            "pending_grading": pending_grading,
            "recent_exams": recent_exams,
        }

    # admin
    user_result = await db.execute(select(User))
    all_users = user_result.scalars().all()
    exam_count = (
        await db.execute(select(func.count()).select_from(Exam))
    ).scalar_one()

    role_counts = {"student": 0, "teacher": 0, "admin": 0}
    for u in all_users:
        if u.role in role_counts:
            role_counts[u.role] += 1

    recent_users = [
        {
            "id": u.id,
            "username": u.username,
            "name": u.name,
            "role": u.role,
            "created_at": u.created_at,
        }
        for u in sorted(all_users, key=lambda x: x.created_at, reverse=True)[:5]
    ]

    return {
        "role": user.role,
        "stats": {
            "student_count": role_counts["student"],
            "teacher_count": role_counts["teacher"],
            "admin_count": role_counts["admin"],
            "exam_count": exam_count,
        },
        "role_distribution": [
            {"role": k, "count": v} for k, v in role_counts.items()
        ],
        "recent_users": recent_users,
    }
