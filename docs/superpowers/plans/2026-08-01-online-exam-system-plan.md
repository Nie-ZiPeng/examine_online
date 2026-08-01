# 基于FastAPI的在线考试与阅卷系统 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个支持多角色、多题型、具备防作弊功能的在线考试与阅卷系统

**Architecture:** 前后端分离架构，React + Ant Design前端，FastAPI + SQLAlchemy后端，MySQL存储数据，Redis做缓存和防作弊

**Tech Stack:** React 18, Ant Design 5, FastAPI, SQLAlchemy 2.0, MySQL 8.0, Redis 7, JWT

## Global Constraints

- Python 3.10+, Node.js 18+
- MySQL 8.0, Redis 7.x
- 前后端分离部署，Nginx反向代理
- 所有密码使用bcrypt加密
- JWT Token有效期2小时
- 每个Task完成后必须commit

## 环境配置（用户提供）

- **MySQL**: root / 060517，本机 3306，数据库名 `exam_system`（已创建，utf8mb4）
- **Redis**: 本机 6379，无密码
- **Python 依赖管理**: 使用 `uv`（v0.11.16），必须创建虚拟环境（`.venv`），依赖用 `uv add <package>` 安装，禁止 `pip install`
- **Node**: v22.12.0, npm 10.9.0

---

## Phase 1: 后端基础框架 (Week 1)

### Task 1: 后端项目初始化

**Files:**
- Create: `backend/pyproject.toml` (uv init)
- Create: `backend/.env`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/redis_client.py`

**Interfaces:**
- Produces: `get_db()` async generator, `redis_client` Redis实例, `settings` 配置对象

- [ ] **Step 1: 创建项目目录结构**

```bash
mkdir -p backend/app/{models,schemas,api,services,utils}
```

- [ ] **Step 2: 创建config.py**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 3: 创建.env文件**

```env
DATABASE_URL=mysql+asyncmy://root:060517@localhost:3306/exam_system
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=120
UPLOAD_DIR=./uploads
```

- [ ] **Step 4: 创建pyproject.toml并安装依赖（使用uv）**

```bash
cd backend
uv init
# 添加依赖（自动创建.venv虚拟环境）
uv add fastapi "uvicorn[standard]" sqlalchemy asyncmy "pydantic[email]" pydantic-settings "python-jose[cryptography]" "passlib[bcrypt]" python-multipart redis openpyxl python-dotenv
```

- [ ] **Step 5: 创建database.py**

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
```

- [ ] **Step 6: 创建redis_client.py**

```python
import redis.asyncio as redis
from app.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

async def get_redis():
    return redis_client
```

- [ ] **Step 7: 创建main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

app = FastAPI(title="在线考试系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
```

- [ ] **Step 8: 测试后端启动**

```bash
cd backend
uv run uvicorn app.main:app --reload
```

访问 http://localhost:8000/docs 查看Swagger文档

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat: 初始化后端项目框架"
```

---

### Task 2: 数据库模型

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/user.py`
- Create: `backend/app/models/course.py`
- Create: `backend/app/models/exam.py`
- Create: `backend/app/models/question.py`
- Create: `backend/app/models/exam_record.py`
- Create: `backend/app/models/answer.py`
- Modify: `backend/app/main.py` (添加数据库初始化)

**Interfaces:**
- Produces: `User`, `Course`, `Exam`, `Question`, `ExamRecord`, `Answer` SQLAlchemy模型

- [ ] **Step 1: 创建user.py**

```python
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum("student", "teacher", "admin"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100))
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

- [ ] **Step 2: 创建course.py**

```python
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    teacher = relationship("User", backref="courses")
```

- [ ] **Step 3: 创建exam.py**

```python
from sqlalchemy import Column, Integer, String, Text, Boolean, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    duration = Column(Integer, nullable=False, comment="考试时长（分钟）")
    total_score = Column(Integer, nullable=False, default=100)
    pass_score = Column(Integer, nullable=False, default=60)
    random_order = Column(Boolean, default=True, comment="题目是否随机排序")
    max_switch = Column(Integer, default=3, comment="最大切屏次数")
    status = Column(Enum("draft", "published", "ongoing", "finished"), default="draft", index=True)
    created_at = Column(DateTime, server_default=func.now())

    course = relationship("Course", backref="exams")
```

- [ ] **Step 4: 创建question.py**

```python
from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum("single", "multiple", "judge", "blank", "essay"), nullable=False, index=True)
    content = Column(Text, nullable=False, comment="题目内容")
    options = Column(Text, comment="选项JSON数组")
    answer = Column(Text, comment="正确答案")
    score = Column(Integer, nullable=False, default=1)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
```

- [ ] **Step 5: 创建exam_record.py**

```python
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class ExamRecord(Base):
    __tablename__ = "exam_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False)
    submit_time = Column(DateTime)
    score = Column(Integer, default=0)
    status = Column(Enum("ongoing", "submitted", "graded"), default="ongoing")
    switch_count = Column(Integer, default=0, comment="切屏次数")
    created_at = Column(DateTime, server_default=func.now())

    student = relationship("User", backref="exam_records")
    exam = relationship("Exam", backref="records")

    __table_args__ = (
        UniqueConstraint("student_id", "exam_id", name="uk_student_exam"),
    )
```

- [ ] **Step 6: 创建answer.py**

```python
from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(Integer, ForeignKey("exam_records.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    student_answer = Column(Text, comment="学生答案")
    score = Column(Integer, default=0, comment="得分")
    is_correct = Column(Boolean, comment="是否正确")
    graded_at = Column(DateTime, comment="阅卷时间")
    grader_id = Column(Integer, ForeignKey("users.id"), comment="阅卷老师ID")
    created_at = Column(DateTime, server_default=func.now())

    record = relationship("ExamRecord", backref="answers")
    question = relationship("Question", backref="answers")
    grader = relationship("User", backref="graded_answers")

    __table_args__ = (
        UniqueConstraint("record_id", "question_id", name="uk_record_question"),
    )
```

- [ ] **Step 7: 创建models/__init__.py**

```python
from app.models.user import User
from app.models.course import Course
from app.models.exam import Exam
from app.models.question import Question
from app.models.exam_record import ExamRecord
from app.models.answer import Answer

__all__ = ["User", "Course", "Exam", "Question", "ExamRecord", "Answer"]
```

- [ ] **Step 8: 修改main.py添加数据库初始化**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.models import *  # noqa: F403

app = FastAPI(title="在线考试系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
```

- [ ] **Step 9: 测试数据库创建**

```bash
cd backend
python -c "from app.database import engine, Base; from app.models import *; import asyncio; asyncio.run(engine.begin().__aenter__().then(lambda conn: conn.run_sync(Base.metadata.create_all)))"
```

或者直接启动服务，表会自动创建：

```bash
uvicorn app.main:app --reload
```

- [ ] **Step 10: Commit**

```bash
git add backend/app/models/
git commit -m "feat: 添加数据库模型"
```

---

### Task 3: Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/user.py`
- Create: `backend/app/schemas/course.py`
- Create: `backend/app/schemas/exam.py`
- Create: `backend/app/schemas/question.py`
- Create: `backend/app/schemas/exam_record.py`
- Create: `backend/app/schemas/answer.py`

**Interfaces:**
- Produces: 所有请求/响应的Pydantic模型

- [ ] **Step 1: 创建user.py**

```python
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    role: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

- [ ] **Step 2: 创建course.py**

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CourseBase(BaseModel):
    name: str
    description: Optional[str] = None

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class CourseResponse(CourseBase):
    id: int
    teacher_id: int
    created_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 3: 创建exam.py**

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExamBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    duration: int
    total_score: int = 100
    pass_score: int = 60
    random_order: bool = True
    max_switch: int = 3

class ExamCreate(ExamBase):
    course_id: int

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: Optional[int] = None
    total_score: Optional[int] = None
    pass_score: Optional[int] = None
    random_order: Optional[bool] = None
    max_switch: Optional[int] = None
    status: Optional[str] = None

class ExamResponse(ExamBase):
    id: int
    course_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 4: 创建question.py**

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class QuestionBase(BaseModel):
    type: str
    content: str
    options: Optional[List[str]] = None
    answer: Optional[str] = None
    score: int = 1
    sort_order: int = 0

class QuestionCreate(QuestionBase):
    pass

class QuestionUpdate(BaseModel):
    type: Optional[str] = None
    content: Optional[str] = None
    options: Optional[List[str]] = None
    answer: Optional[str] = None
    score: Optional[int] = None
    sort_order: Optional[int] = None

class QuestionResponse(QuestionBase):
    id: int
    exam_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class QuestionImport(BaseModel):
    questions: List[QuestionCreate]
```

- [ ] **Step 5: 创建exam_record.py**

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExamRecordBase(BaseModel):
    exam_id: int

class ExamRecordResponse(ExamRecordBase):
    id: int
    student_id: int
    start_time: datetime
    submit_time: Optional[datetime] = None
    score: int
    status: str
    switch_count: int
    created_at: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 6: 创建answer.py**

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AnswerBase(BaseModel):
    question_id: int
    student_answer: Optional[str] = None

class AnswerCreate(AnswerBase):
    pass

class AnswerUpdate(BaseModel):
    student_answer: Optional[str] = None
    score: Optional[int] = None
    is_correct: Optional[bool] = None

class AnswerResponse(AnswerBase):
    id: int
    record_id: int
    score: int
    is_correct: Optional[bool] = None
    graded_at: Optional[datetime] = None
    grader_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class GradeRequest(BaseModel):
    score: int
    is_correct: Optional[bool] = None
```

- [ ] **Step 7: 创建schemas/__init__.py**

```python
from app.schemas.user import *
from app.schemas.course import *
from app.schemas.exam import *
from app.schemas.question import *
from app.schemas.exam_record import *
from app.schemas.answer import *
```

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas/
git commit -m "feat: 添加Pydantic schemas"
```

---

### Task 4: 工具函数

**Files:**
- Create: `backend/app/utils/__init__.py`
- Create: `backend/app/utils/security.py`
- Create: `backend/app/utils/deps.py`
- Create: `backend/app/utils/response.py`

**Interfaces:**
- Produces: `hash_password()`, `verify_password()`, `create_access_token()`, `get_current_user()`, `success_response()`, `error_response()`

- [ ] **Step 1: 创建security.py**

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
```

- [ ] **Step 2: 创建deps.py**

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.utils.security import decode_access_token
from app.models.user import User

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的Token"
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的Token"
        )
    
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用"
        )
    
    return user

def require_role(roles: list):
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="权限不足"
            )
        return current_user
    return role_checker
```

- [ ] **Step 3: 创建response.py**

```python
from typing import Any, Optional

def success_response(data: Any = None, message: str = "success") -> dict:
    return {
        "code": 200,
        "message": message,
        "data": data
    }

def error_response(message: str = "error", code: int = 400) -> dict:
    return {
        "code": code,
        "message": message,
        "data": None
    }

def paginated_response(items: list, total: int, page: int, page_size: int) -> dict:
    return {
        "code": 200,
        "message": "success",
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size
        }
    }
```

- [ ] **Step 4: 创建utils/__init__.py**

```python
from app.utils.security import hash_password, verify_password, create_access_token, decode_access_token
from app.utils.deps import get_current_user, require_role
from app.utils.response import success_response, error_response, paginated_response
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/utils/
git commit -m "feat: 添加工具函数（认证、依赖注入、响应格式）"
```

---

### Task 5: 认证模块

**Files:**
- Create: `backend/app/services/auth_service.py`
- Create: `backend/app/api/auth.py`
- Modify: `backend/app/main.py` (注册路由)

**Interfaces:**
- Consumes: `User` model, `LoginRequest`, `TokenResponse` schemas
- Produces: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` endpoints

- [ ] **Step 1: 创建auth_service.py**

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.utils.security import verify_password, create_access_token
from app.redis_client import redis_client

async def authenticate_user(db: AsyncSession, username: str, password: str):
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user

async def create_token(user: User) -> str:
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role}
    )
    return access_token

async def logout_user(token: str):
    await redis_client.set(f"blacklist:token:{token}", "1", ex=7200)
```

- [ ] **Step 2: 创建auth.py路由**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.user import LoginRequest, TokenResponse, UserResponse
from app.services.auth_service import authenticate_user, create_token, logout_user
from app.utils.deps import get_current_user
from app.utils.response import success_response, error_response
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["认证"])

@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, request.username, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )
    token = await create_token(user)
    return success_response(
        data=TokenResponse(access_token=token).model_dump(),
        message="登录成功"
    )

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    # 实际项目中需要将token加入黑名单
    return success_response(message="登出成功")

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    user_data = UserResponse.model_validate(current_user).model_dump()
    return success_response(data=user_data)
```

- [ ] **Step 3: 修改main.py注册路由**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.models import *  # noqa: F403
from app.api.auth import router as auth_router

app = FastAPI(title="在线考试系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
```

- [ ] **Step 4: 测试认证接口**

```bash
cd backend
uvicorn app.main:app --reload
```

使用curl或Postman测试：
- POST http://localhost:8000/api/auth/login
- Body: {"username": "admin", "password": "123456"}

注意：需要先在数据库中创建用户，或者使用后续的用户管理接口

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/auth_service.py backend/app/api/auth.py
git commit -m "feat: 添加认证模块（登录、登出、获取用户信息）"
```

---

### Task 6: 用户管理模块

**Files:**
- Create: `backend/app/services/user_service.py`
- Create: `backend/app/api/users.py`
- Modify: `backend/app/main.py` (注册路由)

**Interfaces:**
- Consumes: `User` model, `UserCreate`, `UserUpdate`, `UserResponse` schemas
- Produces: `/api/users` CRUD endpoints

- [ ] **Step 1: 创建user_service.py**

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.user import User
from app.utils.security import hash_password

async def get_users(db: AsyncSession, page: int = 1, page_size: int = 10, role: str = None):
    query = select(User)
    if role:
        query = query.where(User.role == role)
    
    # 获取总数
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()
    
    # 分页
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()
    
    return users, total

async def get_user(db: AsyncSession, user_id: int):
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()

async def create_user(db: AsyncSession, user_data: dict):
    user = User(
        username=user_data["username"],
        password_hash=hash_password(user_data["password"]),
        role=user_data["role"],
        name=user_data["name"],
        email=user_data.get("email"),
        phone=user_data.get("phone")
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def update_user(db: AsyncSession, user_id: int, user_data: dict):
    user = await get_user(db, user_id)
    if not user:
        return None
    
    for key, value in user_data.items():
        if value is not None:
            setattr(user, key, value)
    
    await db.commit()
    await db.refresh(user)
    return user

async def delete_user(db: AsyncSession, user_id: int):
    user = await get_user(db, user_id)
    if not user:
        return False
    
    await db.delete(user)
    await db.commit()
    return True
```

- [ ] **Step 2: 创建users.py路由**

```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.user_service import get_users, get_user, create_user, update_user, delete_user
from app.utils.deps import require_role
from app.utils.response import success_response, error_response, paginated_response
from app.models.user import User

router = APIRouter(prefix="/api/users", tags=["用户管理"])

@router.get("")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    users, total = await get_users(db, page, page_size, role)
    users_data = [UserResponse.model_validate(u).model_dump() for u in users]
    return paginated_response(users_data, total, page, page_size)

@router.post("")
async def create_new_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    user = await create_user(db, user_data.model_dump())
    return success_response(data=UserResponse.model_validate(user).model_dump())

@router.get("/{user_id}")
async def get_user_detail(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    user = await get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return success_response(data=UserResponse.model_validate(user).model_dump())

@router.put("/{user_id}")
async def update_user_info(
    user_id: int,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    user = await update_user(db, user_id, user_data.model_dump(exclude_unset=True))
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return success_response(data=UserResponse.model_validate(user).model_dump())

@router.delete("/{user_id}")
async def delete_user_account(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    success = await delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="用户不存在")
    return success_response(message="删除成功")
```

- [ ] **Step 3: 修改main.py注册路由**

```python
from app.api.auth import router as auth_router
from app.api.users import router as users_router

app.include_router(auth_router)
app.include_router(users_router)
```

- [ ] **Step 4: 创建初始管理员用户**

```python
# 在main.py的startup事件中添加
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # 创建默认管理员
    async with async_session() as db:
        from sqlalchemy import select
        result = await db.execute(select(User).where(User.username == "admin"))
        if not result.scalar_one_or_none():
            admin = User(
                username="admin",
                password_hash=hash_password("admin123"),
                role="admin",
                name="管理员"
            )
            db.add(admin)
            await db.commit()
```

- [ ] **Step 5: 测试用户管理接口**

```bash
# 1. 先登录获取token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 2. 使用token访问用户列表
curl http://localhost:8000/api/users \
  -H "Authorization: Bearer <token>"
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/user_service.py backend/app/api/users.py
git commit -m "feat: 添加用户管理模块"
```

---

## Phase 2: 考试核心模块 (Week 2)

### Task 7: 课程管理模块

**Files:**
- Create: `backend/app/services/course_service.py`
- Create: `backend/app/api/courses.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces: `/api/courses` CRUD endpoints

- [ ] **Step 1: 创建course_service.py**

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.course import Course

async def get_courses(db: AsyncSession, teacher_id: int = None):
    query = select(Course)
    if teacher_id:
        query = query.where(Course.teacher_id == teacher_id)
    result = await db.execute(query)
    return result.scalars().all()

async def get_course(db: AsyncSession, course_id: int):
    result = await db.execute(select(Course).where(Course.id == course_id))
    return result.scalar_one_or_none()

async def create_course(db: AsyncSession, course_data: dict, teacher_id: int):
    course = Course(
        name=course_data["name"],
        description=course_data.get("description"),
        teacher_id=teacher_id
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course

async def update_course(db: AsyncSession, course_id: int, course_data: dict):
    course = await get_course(db, course_id)
    if not course:
        return None
    for key, value in course_data.items():
        if value is not None:
            setattr(course, key, value)
    await db.commit()
    await db.refresh(course)
    return course

async def delete_course(db: AsyncSession, course_id: int):
    course = await get_course(db, course_id)
    if not course:
        return False
    await db.delete(course)
    await db.commit()
    return True
```

- [ ] **Step 2: 创建courses.py路由**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.services.course_service import get_courses, get_course, create_course, update_course, delete_course
from app.utils.deps import get_current_user, require_role
from app.utils.response import success_response
from app.models.user import User

router = APIRouter(prefix="/api/courses", tags=["课程管理"])

@router.get("")
async def list_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    courses = await get_courses(db, current_user.id if current_user.role == "teacher" else None)
    courses_data = [CourseResponse.model_validate(c).model_dump() for c in courses]
    return success_response(data=courses_data)

@router.post("")
async def create_new_course(
    course_data: CourseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    course = await create_course(db, course_data.model_dump(), current_user.id)
    return success_response(data=CourseResponse.model_validate(course).model_dump())

@router.get("/{course_id}")
async def get_course_detail(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    course = await get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")
    return success_response(data=CourseResponse.model_validate(course).model_dump())

@router.put("/{course_id}")
async def update_course_info(
    course_id: int,
    course_data: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    course = await update_course(db, course_id, course_data.model_dump(exclude_unset=True))
    if not course:
        raise HTTPException(status_code=404, detail="课程不存在")
    return success_response(data=CourseResponse.model_validate(course).model_dump())

@router.delete("/{course_id}")
async def delete_course_info(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    success = await delete_course(db, course_id)
    if not success:
        raise HTTPException(status_code=404, detail="课程不存在")
    return success_response(message="删除成功")
```

- [ ] **Step 3: 注册路由并测试**

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/course_service.py backend/app/api/courses.py
git commit -m "feat: 添加课程管理模块"
```

---

### Task 8: 考试管理模块

**Files:**
- Create: `backend/app/services/exam_service.py`
- Create: `backend/app/api/exams.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces: `/api/exams` CRUD + publish endpoints

- [ ] **Step 1: 创建exam_service.py**

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.exam import Exam

async def get_exams(db: AsyncSession, course_id: int = None, status: str = None):
    query = select(Exam)
    if course_id:
        query = query.where(Exam.course_id == course_id)
    if status:
        query = query.where(Exam.status == status)
    result = await db.execute(query)
    return result.scalars().all()

async def get_exam(db: AsyncSession, exam_id: int):
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    return result.scalar_one_or_none()

async def create_exam(db: AsyncSession, exam_data: dict):
    exam = Exam(**exam_data)
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return exam

async def update_exam(db: AsyncSession, exam_id: int, exam_data: dict):
    exam = await get_exam(db, exam_id)
    if not exam:
        return None
    for key, value in exam_data.items():
        if value is not None:
            setattr(exam, key, value)
    await db.commit()
    await db.refresh(exam)
    return exam

async def publish_exam(db: AsyncSession, exam_id: int):
    exam = await get_exam(db, exam_id)
    if not exam:
        return None
    exam.status = "published"
    await db.commit()
    await db.refresh(exam)
    return exam

async def delete_exam(db: AsyncSession, exam_id: int):
    exam = await get_exam(db, exam_id)
    if not exam:
        return False
    await db.delete(exam)
    await db.commit()
    return True
```

- [ ] **Step 2: 创建exams.py路由**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse
from app.services.exam_service import get_exams, get_exam, create_exam, update_exam, publish_exam, delete_exam
from app.utils.deps import get_current_user, require_role
from app.utils.response import success_response
from app.models.user import User

router = APIRouter(prefix="/api/exams", tags=["考试管理"])

@router.get("")
async def list_exams(
    course_id: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exams = await get_exams(db, course_id, status)
    exams_data = [ExamResponse.model_validate(e).model_dump() for e in exams]
    return success_response(data=exams_data)

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
```

- [ ] **Step 3: 注册路由并测试**

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/exam_service.py backend/app/api/exams.py
git commit -m "feat: 添加考试管理模块"
```

---

### Task 9: 题目管理模块

**Files:**
- Create: `backend/app/services/question_service.py`
- Create: `backend/app/api/questions.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces: `/api/exams/{id}/questions` CRUD endpoints

- [ ] **Step 1: 创建question_service.py**

```python
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.question import Question

async def get_questions(db: AsyncSession, exam_id: int):
    result = await db.execute(
        select(Question).where(Question.exam_id == exam_id).order_by(Question.sort_order)
    )
    return result.scalars().all()

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
        sort_order=question_data.get("sort_order", 0)
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
```

- [ ] **Step 2: 创建questions.py路由**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionResponse, QuestionImport
from app.services.question_service import get_questions, get_question, create_question, batch_create_questions, update_question, delete_question
from app.utils.deps import get_current_user, require_role
from app.utils.response import success_response
from app.models.user import User

router = APIRouter(tags=["题目管理"])

@router.get("/api/exams/{exam_id}/questions")
async def list_questions(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    questions = await get_questions(db, exam_id)
    questions_data = [QuestionResponse.model_validate(q).model_dump() for q in questions]
    return success_response(data=questions_data)

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
```

- [ ] **Step 3: 注册路由并测试**

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/question_service.py backend/app/api/questions.py
git commit -m "feat: 添加题目管理模块"
```

---

## Phase 3: 考试答题模块 (Week 2-3)

### Task 10: 学生考试模块

**Files:**
- Create: `backend/app/services/exam_student_service.py`
- Create: `backend/app/api/exam_student.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces: `/api/exams/{id}/start`, `/api/exams/{id}/paper`, `/api/exams/{id}/submit` endpoints
- Uses: Redis缓存试卷和答案

- [ ] **Step 1: 创建exam_student_service.py**

```python
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
```

- [ ] **Step 2: 创建exam_student.py路由**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.exam_student_service import start_exam, get_paper, save_answers, submit_exam
from app.utils.deps import get_current_user, require_role
from app.utils.response import success_response, error_response
from app.models.user import User

router = APIRouter(tags=["学生考试"])

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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["student"]))
):
    record, error = await submit_exam(db, exam_id, current_user.id)
    if error:
        return error_response(message=error)
    return success_response(data={"score": record.score})
```

- [ ] **Step 3: 注册路由并测试**

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/exam_student_service.py backend/app/api/exam_student.py
git commit -m "feat: 添加学生考试模块（开始、答题、保存、交卷）"
```

---

## Phase 4: 阅卷与防作弊 (Week 3)

### Task 11: 阅卷模块

**Files:**
- Create: `backend/app/services/grading_service.py`
- Create: `backend/app/api/grading.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces: `/api/exams/{id}/records`, `/api/records/{id}/answers`, `/api/answers/{id}/grade` endpoints

- [ ] **Step 1: 创建grading_service.py**

```python
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.exam_record import ExamRecord
from app.models.answer import Answer
from app.models.question import Question

async def get_exam_records(db: AsyncSession, exam_id: int):
    result = await db.execute(
        select(ExamRecord).where(ExamRecord.exam_id == exam_id)
    )
    return result.scalars().all()

async def get_record_answers(db: AsyncSession, record_id: int):
    result = await db.execute(
        select(Answer).where(Answer.record_id == record_id)
    )
    answers = result.scalars().all()
    
    # 获取题目信息
    question_ids = [a.question_id for a in answers]
    result = await db.execute(
        select(Question).where(Question.id.in_(question_ids))
    )
    questions = {q.id: q for q in result.scalars().all()}
    
    answers_with_questions = []
    for a in answers:
        q = questions[a.question_id]
        answers_with_questions.append({
            "id": a.id,
            "question_id": a.question_id,
            "student_answer": a.student_answer,
            "score": a.score,
            "is_correct": a.is_correct,
            "graded_at": a.graded_at,
            "question": {
                "type": q.type,
                "content": q.content,
                "options": q.options,
                "answer": q.answer,
                "score": q.score
            }
        })
    
    return answers_with_questions

async def grade_answer(db: AsyncSession, answer_id: int, grader_id: int, score: int, is_correct: bool = None):
    result = await db.execute(select(Answer).where(Answer.id == answer_id))
    answer = result.scalar_one_or_none()
    if not answer:
        return None
    
    answer.score = score
    answer.is_correct = is_correct
    answer.graded_at = datetime.now()
    answer.grader_id = grader_id
    
    await db.commit()
    
    # 重新计算总分
    await recalculate_total_score(db, answer.record_id)
    
    await db.refresh(answer)
    return answer

async def recalculate_total_score(db: AsyncSession, record_id: int):
    result = await db.execute(
        select(Answer).where(Answer.record_id == record_id)
    )
    answers = result.scalars().all()
    total_score = sum(a.score for a in answers)
    
    result = await db.execute(select(ExamRecord).where(ExamRecord.id == record_id))
    record = result.scalar_one_or_none()
    if record:
        record.score = total_score
        record.status = "graded"
        await db.commit()

async def finalize_record(db: AsyncSession, record_id: int):
    result = await db.execute(select(ExamRecord).where(ExamRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        return None
    
    record.status = "graded"
    await db.commit()
    await db.refresh(record)
    return record
```

- [ ] **Step 2: 创建grading.py路由**

```python
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
```

- [ ] **Step 3: 注册路由并测试**

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/grading_service.py backend/app/api/grading.py
git commit -m "feat: 添加阅卷模块（自动/手动批改）"
```

---

### Task 12: 防作弊模块

**Files:**
- Create: `backend/app/services/anti_cheat_service.py`
- Modify: `backend/app/api/exam_student.py` (添加切屏接口)
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces: `/api/exams/{id}/switch`, `/api/exams/{id}/switch-status` endpoints

- [ ] **Step 1: 创建anti_cheat_service.py**

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.exam import Exam
from app.models.exam_record import ExamRecord
from app.redis_client import redis_client

async def record_switch(db: AsyncSession, exam_id: int, student_id: int):
    # 增加切屏次数
    count = await redis_client.incr(f"exam:switch:{exam_id}:{student_id}")
    
    # 获取考试信息
    exam = await db.get(Exam, exam_id)
    if not exam:
        return None, "考试不存在"
    
    # 设置过期时间（如果还没设置）
    ttl = await redis_client.ttl(f"exam:switch:{exam_id}:{student_id}")
    if ttl == -1:
        await redis_client.expire(f"exam:switch:{exam_id}:{student_id}", exam.duration * 60)
    
    # 更新数据库中的切屏次数
    result = await db.execute(
        select(ExamRecord).where(
            ExamRecord.student_id == student_id,
            ExamRecord.exam_id == exam_id,
            ExamRecord.status == "ongoing"
        )
    )
    record = result.scalar_one_or_none()
    if record:
        record.switch_count = count
        await db.commit()
    
    # 检查是否超过最大次数
    should_force_submit = count >= exam.max_switch
    
    return {
        "switch_count": count,
        "max_switch": exam.max_switch,
        "should_force_submit": should_force_submit
    }, None

async def get_switch_status(db: AsyncSession, exam_id: int, student_id: int):
    count = await redis_client.get(f"exam:switch:{exam_id}:{student_id}")
    count = int(count) if count else 0
    
    exam = await db.get(Exam, exam_id)
    if not exam:
        return None
    
    return {
        "switch_count": count,
        "max_switch": exam.max_switch
    }
```

- [ ] **Step 2: 在exam_student.py中添加切屏接口**

```python
# 在exam_student.py中添加
from app.services.anti_cheat_service import record_switch, get_switch_status

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
```

- [ ] **Step 3: 测试切屏功能**

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/anti_cheat_service.py backend/app/api/exam_student.py
git commit -m "feat: 添加防作弊模块（切屏检测）"
```

---

### Task 13: 统计报表模块

**Files:**
- Create: `backend/app/services/statistics_service.py`
- Create: `backend/app/api/statistics.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces: `/api/statistics/exam/{id}`, `/api/statistics/export/{id}` endpoints

- [ ] **Step 1: 创建statistics_service.py**

```python
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.exam_record import ExamRecord
from app.models.question import Question
from app.models.answer import Answer

async def get_exam_statistics(db: AsyncSession, exam_id: int):
    # 获取考试记录
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
```

- [ ] **Step 2: 创建statistics.py路由**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.statistics_service import get_exam_statistics, export_exam_scores
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
```

- [ ] **Step 3: 注册路由并测试**

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/statistics_service.py backend/app/api/statistics.py
git commit -m "feat: 添加统计报表模块"
```

---

## Phase 5: 前端基础框架 (Week 3)

### Task 14: 前端项目初始化

**Files:**
- Create: `frontend/` (React项目)
- Create: `frontend/src/api/axios.js`
- Create: `frontend/src/api/auth.js`
- Create: `frontend/src/store/auth.js`
- Create: `frontend/src/utils/auth.js`

**Interfaces:**
- Produces: Axios实例、认证相关API、用户状态管理

- [ ] **Step 1: 创建React项目**

```bash
cd frontend
npx create-react-app .
npm install antd @ant-design/icons axios react-router-dom dayjs
```

- [ ] **Step 2: 创建axios.js**

```javascript
import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
});

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

instance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance;
```

- [ ] **Step 3: 创建auth.js API**

```javascript
import axios from './axios';

export const login = (username, password) =>
  axios.post('/api/auth/login', { username, password });

export const logout = () => axios.post('/api/auth/logout');

export const getMe = () => axios.get('/api/auth/me');
```

- [ ] **Step 4: 创建auth store**

```javascript
import { create } from 'zustand';
import { getMe } from '../api/auth';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },
  
  fetchUser: async () => {
    try {
      const res = await getMe();
      set({ user: res.data });
    } catch (error) {
      localStorage.removeItem('token');
      set({ token: null, user: null });
    }
  },
}));

export default useAuthStore;
```

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: 初始化前端项目"
```

---

### Task 15: 前端登录页面

**Files:**
- Create: `frontend/src/pages/Login/index.js`
- Modify: `frontend/src/App.js` (添加路由)

**Interfaces:**
- Produces: 登录页面

- [ ] **Step 1: 创建Login页面**

```javascript
import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login } from '../../api/auth';
import useAuthStore from '../../store/auth';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { setToken } = useAuthStore();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await login(values.username, values.password);
      setToken(res.data.access_token);
      message.success('登录成功');
      navigate('/');
    } catch (error) {
      message.error(error.response?.data?.detail || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: '#f0f2f5'
    }}>
      <Card title="在线考试系统" style={{ width: 400 }}>
        <Form onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
```

- [ ] **Step 2: 修改App.js添加路由**

```javascript
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Login from './pages/Login';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
```

- [ ] **Step 3: 测试登录页面**

```bash
cd frontend
npm start
```

访问 http://localhost:3000

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Login/ frontend/src/App.js
git commit -m "feat: 添加登录页面"
```

---

## Phase 6: 前端功能页面 (Week 4)

### Task 16: 前端用户管理页面

**Files:**
- Create: `frontend/src/pages/Admin/UserManage/index.js`
- Create: `frontend/src/api/users.js`

**Interfaces:**
- Produces: 用户管理页面（管理员）

- [ ] **Step 1: 创建users.js API**

```javascript
import axios from '../axios';

export const getUsers = (params) => axios.get('/api/users', { params });
export const createUser = (data) => axios.post('/api/users', data);
export const updateUser = (id, data) => axios.put(`/api/users/${id}`, data);
export const deleteUser = (id) => axios.delete(`/api/users/${id}`);
```

- [ ] **Step 2: 创建UserManage页面**

```javascript
import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getUsers, createUser, updateUser, deleteUser } from '../../../api/users';

const UserManage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setUsers(res.data.items);
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingUser(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteUser(id);
      message.success('删除成功');
      fetchUsers();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        await updateUser(editingUser.id, values);
        message.success('更新成功');
      } else {
        await createUser(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '角色', dataIndex: 'role', key: 'role' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ marginBottom: 16 }}>
        添加用户
      </Button>
      <Table columns={columns} dataSource={users} loading={loading} rowKey="id" />
      
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input disabled={!!editingUser} />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: !editingUser }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="student">学生</Select.Option>
              <Select.Option value="teacher">老师</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManage;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Admin/ frontend/src/api/users.js
git commit -m "feat: 添加用户管理页面"
```

---

### Task 17: 前端考试管理页面

**Files:**
- Create: `frontend/src/pages/Teacher/ExamManage/index.js`
- Create: `frontend/src/pages/Teacher/ExamEdit/index.js`
- Create: `frontend/src/api/exams.js`

**Interfaces:**
- Produces: 考试列表、考试编辑页面

- [ ] **Step 1: 创建exams.js API**

```javascript
import axios from '../axios';

export const getExams = (params) => axios.get('/api/exams', { params });
export const createExam = (data) => axios.post('/api/exams', data);
export const updateExam = (id, data) => axios.put(`/api/exams/${id}`, data);
export const deleteExam = (id) => axios.delete(`/api/exams/${id}`);
export const publishExam = (id) => axios.put(`/api/exams/${id}/publish`);
export const getExamQuestions = (examId) => axios.get(`/api/exams/${examId}/questions`);
export const createQuestion = (examId, data) => axios.post(`/api/exams/${examId}/questions`, data);
export const updateQuestion = (id, data) => axios.put(`/api/questions/${id}`, data);
export const deleteQuestion = (id) => axios.delete(`/api/questions/${id}`);
```

- [ ] **Step 2: 创建ExamManage页面**

```javascript
import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getExams, deleteExam, publishExam } from '../../../api/exams';

const ExamManage = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await getExams();
      setExams(res.data);
    } catch (error) {
      message.error('获取考试列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteExam(id);
      message.success('删除成功');
      fetchExams();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handlePublish = async (id) => {
    try {
      await publishExam(id);
      message.success('发布成功');
      fetchExams();
    } catch (error) {
      message.error('发布失败');
    }
  };

  const statusMap = {
    draft: { color: 'default', text: '草稿' },
    published: { color: 'success', text: '已发布' },
    ongoing: { color: 'processing', text: '进行中' },
    finished: { color: 'default', text: '已结束' },
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '考试标题', dataIndex: 'title', key: 'title' },
    { title: '时长(分钟)', dataIndex: 'duration', key: 'duration' },
    { title: '总分', dataIndex: 'total_score', key: 'total_score' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/exams/${record.id}/edit`)}>
            编辑
          </Button>
          {record.status === 'draft' && (
            <Button type="link" icon={<SendOutlined />} onClick={() => handlePublish(record.id)}>
              发布
            </Button>
          )}
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/exams/new')} style={{ marginBottom: 16 }}>
        创建考试
      </Button>
      <Table columns={columns} dataSource={exams} loading={loading} rowKey="id" />
    </div>
  );
};

export default ExamManage;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Teacher/ frontend/src/api/exams.js
git commit -m "feat: 添加考试管理页面"
```

---

### Task 18: 前端学生考试页面

**Files:**
- Create: `frontend/src/pages/Student/ExamList/index.js`
- Create: `frontend/src/pages/Student/ExamTaking/index.js`
- Create: `frontend/src/pages/Student/MyRecords/index.js`
- Create: `frontend/src/components/QuestionRenderer/index.js`

**Interfaces:**
- Produces: 考试列表、答题页面、考试记录页面

- [ ] **Step 1: 创建ExamList页面**

```javascript
import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getExams } from '../../../api/exams';

const ExamList = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await getExams({ status: 'published' });
      setExams(res.data);
    } catch (error) {
      message.error('获取考试列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const columns = [
    { title: '考试标题', dataIndex: 'title', key: 'title' },
    { title: '考试时长', dataIndex: 'duration', key: 'duration', render: (v) => `${v}分钟` },
    { title: '总分', dataIndex: 'total_score', key: 'total_score' },
    { title: '及格分', dataIndex: 'pass_score', key: 'pass_score' },
    {
      title: '考试时间',
      key: 'time',
      render: (_, record) => (
        `${new Date(record.start_time).toLocaleString()} - ${new Date(record.end_time).toLocaleString()}`
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" onClick={() => navigate(`/exams/${record.id}/take`)}>
          开始考试
        </Button>
      ),
    },
  ];

  return <Table columns={columns} dataSource={exams} loading={loading} rowKey="id" />;
};

export default ExamList;
```

- [ ] **Step 2: 创建ExamTaking页面**

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Radio, Checkbox, Input, Button, Space, Modal, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { getPaper, saveAnswers, submitExam, recordSwitch } from '../../../api/exams';
import QuestionRenderer from '../../../components/QuestionRenderer';

const ExamTaking = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [paper, setPaper] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // 切屏检测
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        await recordSwitch(examId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [examId]);

  // 自动保存
  useEffect(() => {
    const timer = setInterval(async () => {
      if (Object.keys(answers).length > 0) {
        await saveAnswers(examId, answers);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [answers, examId]);

  // 倒计时
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        const res = await getPaper(examId);
        setPaper(res.data);
        setAnswers(res.data.saved_answers || {});
      } catch (error) {
        message.error('获取试卷失败');
        navigate('/');
      }
    };
    fetchPaper();
  }, [examId, navigate]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    Modal.confirm({
      title: '确认交卷？',
      content: '交卷后将无法修改答案',
      onOk: async () => {
        setLoading(true);
        try {
          const res = await submitExam(examId);
          message.success(`交卷成功，得分：${res.data.score}`);
          navigate('/my-records');
        } catch (error) {
          message.error('交卷失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  if (!paper) return null;

  return (
    <div style={{ padding: 24 }}>
      <Card title="考试进行中" extra={
        <Button type="primary" danger onClick={handleSubmit} loading={loading}>
          交卷
        </Button>
      }>
        {paper.questions.map((q, index) => (
          <QuestionRenderer
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(value) => handleAnswerChange(q.id, value)}
          />
        ))}
      </Card>
    </div>
  );
};

export default ExamTaking;
```

- [ ] **Step 3: 创建QuestionRenderer组件**

```javascript
import React from 'react';
import { Radio, Checkbox, Input, Typography } from 'antd';

const { Text } = Typography;

const QuestionRenderer = ({ question, value, onChange }) => {
  const { type, content, options, score } = question;

  const renderAnswerInput = () => {
    switch (type) {
      case 'single':
        return (
          <Radio.Group value={value} onChange={(e) => onChange(e.target.value)}>
            {options?.map((opt, index) => (
              <Radio key={index} value={String.fromCharCode(65 + index)}>
                {String.fromCharCode(65 + index)}. {opt}
              </Radio>
            ))}
          </Radio.Group>
        );
      case 'multiple':
        return (
          <Checkbox.Group value={value || []} onChange={onChange}>
            {options?.map((opt, index) => (
              <Checkbox key={index} value={String.fromCharCode(65 + index)}>
                {String.fromCharCode(65 + index)}. {opt}
              </Checkbox>
            ))}
          </Checkbox.Group>
        );
      case 'judge':
        return (
          <Radio.Group value={value} onChange={(e) => onChange(e.target.value)}>
            <Radio value="对">对</Radio>
            <Radio value="错">错</Radio>
          </Radio.Group>
        );
      case 'blank':
        return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="请输入答案" />;
      case 'essay':
        return <Input.TextArea value={value} onChange={(e) => onChange(e.target.value)} rows={4} placeholder="请输入答案" />;
      default:
        return null;
    }
  };

  return (
    <div style={{ marginBottom: 24, padding: 16, border: '1px solid #d9d9d9', borderRadius: 8 }}>
      <Text strong>{content}</Text>
      <Text type="secondary" style={{ marginLeft: 8 }}>({score}分)</Text>
      <div style={{ marginTop: 12 }}>
        {renderAnswerInput()}
      </div>
    </div>
  );
};

export default QuestionRenderer;
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Student/ frontend/src/components/QuestionRenderer/
git commit -m "feat: 添加学生考试页面"
```

---

## Phase 7: 完成与测试 (Week 4)

### Task 19: 完善前端路由和布局

**Files:**
- Modify: `frontend/src/App.js`
- Create: `frontend/src/components/Layout/index.js`

**Interfaces:**
- Produces: 完整的前端路由和布局

- [ ] **Step 1: 创建Layout组件**

```javascript
import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/auth';

const { Header, Content, Sider } = Layout;

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const getMenuItems = () => {
    if (user?.role === 'admin') {
      return [
        { key: '/users', label: '用户管理' },
      ];
    }
    if (user?.role === 'teacher') {
      return [
        { key: '/courses', label: '课程管理' },
        { key: '/exams', label: '考试管理' },
        { key: '/grading', label: '阅卷管理' },
      ];
    }
    return [
      { key: '/exams', label: '考试列表' },
      { key: '/my-records', label: '我的记录' },
    ];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div style={{ height: 32, margin: 16, background: 'rgba(255,255,255,0.2)', borderRadius: 6 }} />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <span>{user?.name}</span>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
```

- [ ] **Step 2: 修改App.js添加完整路由**

```javascript
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Login from './pages/Login';
import AppLayout from './components/Layout';
import useAuthStore from './store/auth';

// 管理员页面
import UserManage from './pages/Admin/UserManage';

// 老师页面
import ExamManage from './pages/Teacher/ExamManage';

// 学生页面
import ExamList from './pages/Student/ExamList';
import ExamTaking from './pages/Student/ExamTaking';
import MyRecords from './pages/Student/MyRecords';

const PrivateRoute = ({ children }) => {
  const { token } = useAuthStore();
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  const { fetchUser, token } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token, fetchUser]);

  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/exams" replace />} />
            <Route path="users" element={<UserManage />} />
            <Route path="exams" element={<ExamManage />} />
            <Route path="exams/:examId/edit" element={<div>考试编辑</div>} />
            <Route path="exams/:examId/take" element={<ExamTaking />} />
            <Route path="my-records" element={<MyRecords />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.js frontend/src/components/Layout/
git commit -m "feat: 完善前端路由和布局"
```

---

### Task 20: 最终测试与文档

**Files:**
- Create: `README.md`

**Interfaces:**
- Produces: 项目文档

- [ ] **Step 1: 创建README.md**

```markdown
# 基于FastAPI的在线考试与阅卷系统

## 技术栈

- **后端**: FastAPI + SQLAlchemy + MySQL + Redis
- **前端**: React + Ant Design
- **认证**: JWT

## 快速开始

### 后端

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 前端

```bash
cd frontend
npm install
npm start
```

## 功能模块

- 用户管理（管理员）
- 课程管理（老师）
- 考试管理（老师）
- 学生考试（学生）
- 阅卷管理（老师）
- 统计报表（老师/管理员）
- 防作弊功能（切屏检测）

## API文档

启动后端后访问: http://localhost:8000/docs
```

- [ ] **Step 2: 测试所有功能**

```bash
# 后端
cd backend
uvicorn app.main:app --reload

# 前端
cd frontend
npm start
```

- [ ] **Step 3: 最终Commit**

```bash
git add .
git commit -m "feat: 完成在线考试系统开发"
```

---

**计划完成！**

你可以选择执行方式：
1. **Subagent-Driven** - 每个Task派发一个子代理执行
2. **Inline Execution** - 在当前会话中逐步执行

**请选择执行方式？**
