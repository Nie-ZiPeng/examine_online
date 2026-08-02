# 在线考试系统 Online Exam System

一个基于 **FastAPI + React** 的前后端分离在线考试系统，支持学生、教师、管理员三种角色，覆盖考试发布、在线答题、自动阅卷、防作弊等完整流程。

## 功能特性

### 学生端
- 考试列表与开始考试（限定时段、考试时长）
- 在线答题：单选 / 多选 / 判断 / 填空 / 简答五种题型
- 自动保存答案（每 30s）、倒计时自动交卷
- 切屏检测（记录切换次数，超限影响成绩）
- 查看考试成绩记录

### 教师端
- 课程管理
- 考试管理：创建 / 编辑 / 发布考试，题目管理（五种题型、动态选项）
- 阅卷管理：逐题批改主观题、一键自动判分客观题、终评
- 支持考试数据导出

### 管理员端
- 用户管理（学生 / 教师 / 管理员账号的增删改查）

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 · Ant Design 6 · Tailwind CSS 3 · Zustand · React Router 7 |
| 后端 | FastAPI · SQLAlchemy 2.0（异步）· Pydantic v2 |
| 数据库 | MySQL（asyncmy 驱动） |
| 缓存 | Redis |
| 认证 | JWT（python-jose）+ bcrypt 密码加密 |

## 项目结构

```
graduate_project/
├── backend/                # FastAPI 后端
│   ├── app/
│   │   ├── api/            # 路由层（auth / users / courses / exams / questions / grading / statistics）
│   │   ├── models/         # SQLAlchemy 数据模型
│   │   ├── schemas/        # Pydantic 校验模型
│   │   ├── services/       # 业务逻辑层
│   │   ├── utils/          # 通用工具（JWT、权限、响应封装）
│   │   ├── config.py       # 环境配置
│   │   ├── database.py     # 数据库连接
│   │   └── main.py         # 应用入口
│   ├── pyproject.toml      # uv 依赖管理
│   └── .env.example        # 环境变量模板
└── frontend/               # React 前端（CRA）
    └── src/
        ├── api/            # 接口封装（axios）
        ├── components/     # 共享组件（Layout / PageHeader / QuestionRenderer 等）
        ├── pages/          # 页面（Admin / Teacher / Student / Login / Profile）
        ├── store/          # Zustand 状态管理
        └── App.js          # 路由与全局主题
```

## 快速开始

### 环境要求
- Python >= 3.12（推荐使用 [uv](https://docs.astral.sh/uv/) 管理依赖）
- Node.js >= 18
- MySQL 8.x、Redis

### 1. 后端启动

```bash
cd backend

# 安装依赖（uv）
uv sync

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 MySQL / Redis 连接信息

# 启动服务（自动建表，监听 http://localhost:8000）
uv run uvicorn app.main:app --reload --port 8000
```

接口文档（Swagger UI）：http://localhost:8000/docs

### 2. 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 开发模式（监听 http://localhost:3000）
npm start

# 生产构建
npm run build
```

### 3. 初始化账号

系统未内置默认账号，请通过管理员账号在「用户管理」中添加用户，或使用注册 / 导入功能创建学生账号。

## 环境变量说明

见 [backend/.env.example](backend/.env.example)：

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | MySQL 连接串，如 `mysql+asyncmy://user:pass@localhost:3306/exam_system` |
| `REDIS_URL` | Redis 连接串，如 `redis://localhost:6379/0` |
| `JWT_SECRET_KEY` | JWT 签名密钥，生产环境务必替换为强随机值 |
| `JWT_ALGORITHM` | JWT 算法，默认 `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Token 有效期（分钟） |
| `UPLOAD_DIR` | 上传文件目录 |

## 角色与权限

| 角色 | 权限 |
|---|---|
| `student` | 考试列表、在线答题、成绩记录 |
| `teacher` | 课程 / 考试 / 题目管理、阅卷、成绩导出 |
| `admin` | 用户管理、全部教师权限 |

## CI/CD

项目内置 GitHub Actions 工作流（`.github/workflows/ci.yml`），提交 / PR 时自动执行：
- 后端：安装依赖、编译检查
- 前端：安装依赖、生产构建

## 许可证

本项目为本科毕业设计项目，仅供学习交流使用。
