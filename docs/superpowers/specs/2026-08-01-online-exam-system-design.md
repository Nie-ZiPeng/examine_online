# 基于FastAPI的在线考试与阅卷系统 - 设计文档

## 1. 项目概述

### 1.1 项目背景
本科生毕业设计项目，开发一个支持多角色、多题型、具备防作弊功能的在线考试与阅卷系统。

### 1.2 核心目标
- 支持学生在线答题、老师出卷阅卷、管理员管理用户
- 支持单选、多选、判断、填空、简答/论述五种题型
- 客观题自动批改，主观题手动阅卷
- 具备切屏检测、随机组卷等防作弊能力
- 3-4周内完成开发

### 1.3 用户角色

| 角色 | 权限范围 |
|------|----------|
| 学生 | 参加考试、查看成绩、查询历史记录 |
| 老师 | 创建考试、管理题库、阅卷、查看统计 |
| 管理员 | 用户管理、系统配置、数据管理 |

---

## 2. 技术架构

### 2.1 技术栈

| 层 | 技术 | 版本 |
|---|------|------|
| 前端 | React | 18.x |
| UI库 | Ant Design | 5.x |
| 路由 | React Router | 6.x |
| HTTP客户端 | Axios | 1.x |
| 后端 | FastAPI | 0.100+ |
| ORM | SQLAlchemy | 2.0 |
| 数据校验 | Pydantic | 2.x |
| 数据库 | MySQL | 8.0 |
| 缓存 | Redis | 7.x |
| 认证 | JWT (python-jose) | - |

### 2.2 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx (80/443)                       │
│                    反向代理 + 静态资源                        │
└─────────────────────┬───────────────────┬───────────────────┘
                      │                   │
                      ▼                   ▼
        ┌─────────────────────┐ ┌─────────────────────┐
        │   React前端 (3000)  │ │  FastAPI后端 (8000) │
        │   - SPA应用         │ │  - RESTful API      │
        │   - Ant Design      │ │  - JWT认证           │
        └─────────────────────┘ └──────────┬──────────┘
                                           │
                                           ▼
                              ┌─────────────────────┐
                              │      MySQL 8.0      │
                              │    - 用户数据        │
                              │    - 考试数据        │
                              │    - 答题数据        │
                              └─────────────────────┘
                                           │
                                           ▼
                              ┌─────────────────────┐
                              │       Redis 7       │
                              │  - Token黑名单       │
                              │  - 考试倒计时        │
                              │  - 切屏记录         │
                              │  - 随机题目缓存      │
                              └─────────────────────┘
```

---

## 3. 数据库设计

### 3.1 ER图

```
┌──────────┐       ┌──────────┐       ┌──────────┐
│  users   │──────<│ courses  │──────<│  exams   │
└──────────┘       └──────────┘       └──────────┘
     │                                      │
     │                                      │
     └──────────────────────────────────────┼──────┐
                                           │      │
                                     ┌─────▼────┐ │
                                     │questions │ │
                                     └──────────┘ │
                                           │      │
                                           │      │
                                    ┌──────▼──────▼──┐
                                    │exam_records    │
                                    │   answers      │
                                    └────────────────┘
```

### 3.2 表结构定义

#### users - 用户表

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'teacher', 'admin') NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
);
```

#### courses - 课程表

```sql
CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    teacher_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);
```

#### exams - 考试表

```sql
CREATE TABLE exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration INT NOT NULL COMMENT '考试时长（分钟）',
    total_score INT NOT NULL DEFAULT 100,
    pass_score INT NOT NULL DEFAULT 60,
    random_order BOOLEAN DEFAULT TRUE COMMENT '题目是否随机排序',
    max_switch INT DEFAULT 3 COMMENT '最大切屏次数，超过强制交卷',
    status ENUM('draft', 'published', 'ongoing', 'finished') DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    INDEX idx_course (course_id),
    INDEX idx_status (status)
);
```

#### questions - 题目表

```sql
CREATE TABLE questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_id INT NOT NULL,
    type ENUM('single', 'multiple', 'judge', 'blank', 'essay') NOT NULL,
    content TEXT NOT NULL COMMENT '题目内容，支持HTML/图片',
    options JSON COMMENT '选项数组，如["选项A","选项B","选项C","选项D"]',
    answer TEXT COMMENT '正确答案',
    score INT NOT NULL DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    INDEX idx_exam (exam_id),
    INDEX idx_type (type)
);
```

**字段说明：**
- `type`: single(单选), multiple(多选), judge(判断), blank(填空), essay(简答)
- `options`: JSON格式存储选项，判断题可存["对","错"]，其他题型为null
- `answer`: 
  - 选择题: "A" 或 "AB" 或 "ACD"
  - 判断题: "对" 或 "错"
  - 填空题: 文本内容（多空用|分隔，如"答案1|答案2"）
  - 简答题: 参考答案或null（由老师手动阅卷）

#### exam_records - 考试记录表

```sql
CREATE TABLE exam_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    exam_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    submit_time DATETIME,
    score INT DEFAULT 0,
    status ENUM('ongoing', 'submitted', 'graded') DEFAULT 'ongoing',
    switch_count INT DEFAULT 0 COMMENT '切屏次数',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (exam_id) REFERENCES exams(id),
    UNIQUE KEY uk_student_exam (student_id, exam_id),
    INDEX idx_student (student_id),
    INDEX idx_exam (exam_id)
);
```

#### answers - 答题表

```sql
CREATE TABLE answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    record_id INT NOT NULL,
    question_id INT NOT NULL,
    student_answer TEXT COMMENT '学生答案',
    score INT DEFAULT 0 COMMENT '得分',
    is_correct BOOLEAN COMMENT '是否正确（客观题）',
    graded_at DATETIME COMMENT '阅卷时间',
    grader_id INT COMMENT '阅卷老师ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (record_id) REFERENCES exam_records(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id),
    FOREIGN KEY (grader_id) REFERENCES users(id),
    UNIQUE KEY uk_record_question (record_id, question_id),
    INDEX idx_record (record_id)
);
```

---

## 4. API设计

### 4.1 认证模块

```
POST   /api/auth/login          # 登录
POST   /api/auth/logout         # 登出
POST   /api/auth/refresh        # 刷新Token
GET    /api/auth/me             # 获取当前用户信息
```

### 4.2 用户管理模块（管理员）

```
GET    /api/users               # 用户列表（分页、筛选）
POST   /api/users               # 创建用户
GET    /api/users/{id}          # 用户详情
PUT    /api/users/{id}          # 更新用户
DELETE /api/users/{id}          # 删除用户
POST   /api/users/batch         # 批量导入用户
```

### 4.3 课程管理模块（老师）

```
GET    /api/courses             # 课程列表
POST   /api/courses             # 创建课程
GET    /api/courses/{id}        # 课程详情
PUT    /api/courses/{id}        # 更新课程
DELETE /api/courses/{id}        # 删除课程
```

### 4.4 考试管理模块

```
GET    /api/exams               # 考试列表
POST   /api/exams               # 创建考试（老师）
GET    /api/exams/{id}          # 考试详情
PUT    /api/exams/{id}          # 更新考试
DELETE /api/exams/{id}          # 删除考试
PUT    /api/exams/{id}/publish  # 发布考试
```

### 4.5 题目管理模块

```
GET    /api/exams/{id}/questions     # 获取考试题目列表
POST   /api/exams/{id}/questions     # 批量添加题目
PUT    /api/questions/{id}           # 更新题目
DELETE /api/questions/{id}           # 删除题目
POST   /api/exams/{id}/questions/import  # 导入题目（Excel/JSON）
```

### 4.6 考试答题模块（学生）

```
POST   /api/exams/{id}/start         # 开始考试
GET    /api/exams/{id}/paper         # 获取试卷（随机排序）
POST   /api/exams/{id}/save          # 保存答案（自动保存）
POST   /api/exams/{id}/submit        # 交卷
GET    /api/records                  # 我的考试记录
GET    /api/records/{id}             # 考试详情（含答案）
```

### 4.7 阅卷模块（老师）

```
GET    /api/exams/{id}/records       # 考试记录列表
GET    /api/records/{id}/answers     # 获取答题详情
PUT    /api/answers/{id}/grade       # 批改单题
POST   /api/records/{id}/batch-grade # 批量阅卷
PUT    /api/records/{id}/finalize    # 确认成绩
```

### 4.8 防作弊模块

```
POST   /api/exams/{id}/switch        # 记录切屏
GET    /api/exams/{id}/switch-status # 获取切屏状态
```

### 4.9 统计报表模块

```
GET    /api/statistics/exam/{id}     # 考试统计（平均分、及格率、分数分布）
GET    /api/statistics/course/{id}   # 课程统计
GET    /api/statistics/student/{id}  # 学生统计
GET    /api/statistics/export/{id}   # 导出成绩（Excel）
```

---

## 5. 核心业务流程

### 5.1 学生考试流程

```
┌─────────────┐
│  查看考试列表 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  点击开始考试 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 系统生成试卷 │ ← 随机排序题目、打乱选项
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  学生答题    │ ← 自动保存到Redis（每30秒）
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  点击交卷    │ 或 倒计时结束自动交卷
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ 客观题自动批改│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  成绩记录    │
└─────────────┘
```

### 5.2 老师阅卷流程

```
┌─────────────┐
│  查看考试记录 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  筛选待阅卷  │ ← 只显示有主观题的记录
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  逐题批改    │ ← 显示学生答案、参考答案
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  确认成绩    │ ← 自动计算总分
└─────────────┘
```

### 5.3 防作弊机制

```
切屏检测：
1. 学生进入考试页面时，前端监听visibilitychange事件
2. 检测到切屏时，调用API记录到Redis
3. 每次切屏更新计数，超过max_switch次强制交卷

随机组卷：
1. 考试开始时，系统从题库中随机抽取题目
2. 题目顺序随机排列
3. 选择题的选项顺序随机打乱
4. 试卷缓存到Redis，保证同一考生看到的顺序一致
```

---

## 6. Redis使用场景

### 6.1 Token黑名单

```
Key: blacklist:token:{jti}
Value: 1
TTL: Token有效期
用途: 用户登出时将Token加入黑名单
```

### 6.2 考试倒计时

```
Key: exam:countdown:{exam_id}:{student_id}
Value: 剩余秒数
TTL: 考试时长
用途: 学生开始考试时设置，交卷时删除
```

### 6.3 切屏记录

```
Key: exam:switch:{exam_id}:{student_id}
Value: 切屏次数
TTL: 考试时长
用途: 记录学生切屏次数，超过阈值触发强制交卷
```

### 6.4 随机试卷缓存

```
Key: exam:paper:{exam_id}:{student_id}
Value: JSON格式的题目ID列表
TTL: 考试时长
用途: 缓存学生本次考试的题目顺序和选项顺序
```

### 6.5 答案自动保存

```
Key: exam:autosave:{exam_id}:{student_id}
Value: JSON格式的答案数据
TTL: 考试时长
用途: 学生答题过程中自动保存，防止意外丢失
```

---

## 7. 项目目录结构

### 7.1 后端目录

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI应用入口
│   ├── config.py               # 配置管理
│   ├── database.py             # 数据库连接
│   ├── redis_client.py         # Redis连接
│   │
│   ├── models/                 # SQLAlchemy模型
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── course.py
│   │   ├── exam.py
│   │   ├── question.py
│   │   ├── exam_record.py
│   │   └── answer.py
│   │
│   ├── schemas/                # Pydantic模型
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── course.py
│   │   ├── exam.py
│   │   ├── question.py
│   │   ├── exam_record.py
│   │   └── answer.py
│   │
│   ├── api/                    # 路由
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── courses.py
│   │   ├── exams.py
│   │   ├── questions.py
│   │   ├── exam_student.py
│   │   ├── grading.py
│   │   └── statistics.py
│   │
│   ├── services/               # 业务逻辑
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── course_service.py
│   │   ├── exam_service.py
│   │   ├── question_service.py
│   │   ├── grading_service.py
│   │   └── statistics_service.py
│   │
│   └── utils/                  # 工具函数
│       ├── __init__.py
│       ├── security.py         # 密码加密、JWT生成
│       ├── deps.py             # 依赖注入
│       └── response.py         # 统一响应格式
│
├── alembic/                    # 数据库迁移
│   └── ...
├── alembic.ini
├── requirements.txt
└── .env                        # 环境变量
```

### 7.2 前端目录

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── index.js                # 入口文件
│   ├── App.js                  # 根组件
│   │
│   ├── api/                    # API调用
│   │   ├── axios.js            # Axios配置
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── courses.js
│   │   ├── exams.js
│   │   └── statistics.js
│   │
│   ├── components/             # 公共组件
│   │   ├── Layout/
│   │   ├── AuthRoute/
│   │   └── QuestionRenderer/   # 题目渲染组件
│   │
│   ├── pages/                  # 页面
│   │   ├── Login/
│   │   ├── Student/
│   │   │   ├── ExamList/
│   │   │   ├── ExamTaking/
│   │   │   └── MyRecords/
│   │   ├── Teacher/
│   │   │   ├── CourseList/
│   │   │   ├── ExamManage/
│   │   │   ├── ExamEdit/
│   │   │   └── Grading/
│   │   └── Admin/
│   │       ├── UserManage/
│   │       └── SystemSettings/
│   │
│   ├── store/                  # 状态管理
│   │   └── auth.js             # 用户状态
│   │
│   └── utils/                  # 工具函数
│       ├── auth.js
│       └── helpers.js
│
├── package.json
└── .env
```

---

## 8. 安全设计

### 8.1 认证安全
- 密码使用bcrypt加密存储
- JWT Token设置合理过期时间（2小时）
- 登出时Token加入Redis黑名单

### 8.2 接口安全
- 所有API需要JWT认证
- 不同角色通过依赖注入控制权限
- 敏感操作（删除、批量操作）需要二次确认

### 8.3 考试安全
- 开始考试时生成唯一试卷，缓存到Redis
- 答案提交后立即批改，防止篡改
- 切屏检测记录到服务端，前端无法绕过

---

## 9. 开发计划

### 第1周：基础框架
- Day 1-2: 后端项目搭建、数据库设计、用户认证
- Day 3-4: 前端项目搭建、登录页面、路由配置
- Day 5-7: 用户管理模块（CRUD）

### 第2周：考试核心
- Day 1-2: 课程管理、考试管理
- Day 3-4: 题目管理、题库功能
- Day 5-7: 学生考试流程（开始、答题、交卷）

### 第3周：阅卷与防作弊
- Day 1-2: 自动批改、手动阅卷
- Day 3-4: 防作弊功能（切屏、随机组卷）
- Day 5-7: 统计报表

### 第4周：测试与优化
- Day 1-2: 功能测试、Bug修复
- Day 3-4: 性能优化、界面美化
- Day 5-7: 部署上线、文档编写

---

## 10. 扩展性考虑

### 10.1 后续可扩展功能
- 题库管理（独立于考试的题库）
- 试卷模板（复用试卷结构）
- 在线监考（视频监控集成）
- 学习分析（答题行为分析）
- 移动端适配

### 10.2 技术扩展
- Celery异步任务（大规模批改）
- WebSocket实时通信（在线监考）
- Elasticsearch全文搜索（题库搜索）

---

## 附录A：环境变量配置

```env
# 数据库
DATABASE_URL=mysql+asyncmy://user:password@localhost:3306/exam_system

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=120

# 文件上传
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=10MB
```

## 附录B：依赖清单

### 后端依赖 (requirements.txt)
```
fastapi==0.100.0
uvicorn[standard]==0.23.0
sqlalchemy==2.0.0
asyncmy==0.2.9
pydantic[email]==2.0.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
redis==4.6.0
openpyxl==3.1.2
```

### 前端依赖 (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.0",
    "antd": "^5.8.0",
    "@ant-design/icons": "^5.1.0",
    "axios": "^1.4.0",
    "dayjs": "^1.11.9",
    "file-saver": "^2.0.5",
    "xlsx": "^0.18.5"
  }
}
```

---

**文档版本**: v1.0  
**创建日期**: 2026-08-01  
**最后更新**: 2026-08-01  
