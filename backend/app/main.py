import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.models import *  # noqa: F403
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.courses import router as courses_router
from app.api.exams import router as exams_router
from app.api.questions import router as questions_router
from app.api.exam_student import router as exam_student_router
from app.api.grading import router as grading_router
from app.api.statistics import router as statistics_router
from app.workers.ai_grading_worker import run_worker

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    worker_task = asyncio.create_task(run_worker())
    yield
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass

app = FastAPI(title="在线考试系统", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(courses_router)
app.include_router(exams_router)
app.include_router(questions_router)
app.include_router(exam_student_router)
app.include_router(grading_router)
app.include_router(statistics_router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
