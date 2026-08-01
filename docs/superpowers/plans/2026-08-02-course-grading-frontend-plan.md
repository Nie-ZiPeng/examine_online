# 课程管理与阅卷管理前端实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现课程管理、阅卷管理两个前端页面，并对后端 4 个列表接口做分页改造、阅卷记录接口嵌套返回学生完整信息。

**Architecture:** 前后端分离。后端 FastAPI 将 `courses/exams/questions/records` 列表接口改为 `paginated_response` 分页返回，records 额外嵌套 student 完整用户信息；前端新建 `api/grading.js`、实现 CourseManage 与 Grading 页面（Drawer 打分），并适配 ExamManage/ExamList/ExamEdit 的分页结构变化，统一全局主题色（藏青蓝）。

**Tech Stack:** React 19, antd 6.5.3, react-router 7, @ant-design/icons 6, axios, FastAPI, SQLAlchemy 2.0

## Global Constraints

- 后端 Python 3.12，`uv` 管理依赖与虚拟环境（`backend/.venv`），启动：`cd backend; uv run uvicorn app.main:app --reload --port 8000`
- 前端：`cd frontend; npm start`（开发），`npm run build`（编译校验，react-scripts）
- 后端无测试框架，改动用 API 手工验证（先登录拿 token）
- 分页约定：`page` 默认 1、`ge=1`；`page_size` 默认 10、`ge=1, le=100`；列表返回 `paginated_response(items, total, page, page_size)`
- 响应包装：axios 拦截器已解包响应体，前端通过 `res.data` 取后端 `data`；分页列表取 `res.data.items` / `res.data.total`（与 UserManage 现状一致）
- 全局主题色：`#3D5A80`（藏青蓝），通过 `App.js` 的 `ConfigProvider theme.token.colorPrimary` 设置
- 每个 Task 完成后必须 commit；仅提交本任务相关文件

---

## Task 1: 后端 courses/exams/questions 列表接口分页改造

**Files:**
- Modify: `backend/app/services/course_service.py`
- Modify: `backend/app/api/courses.py`
- Modify: `backend/app/services/exam_service.py`
- Modify: `backend/app/api/exams.py`
- Modify: `backend/app/services/question_service.py`
- Modify: `backend/app/api/questions.py`

**Interfaces:**
- Produces:
  - `get_courses(db, teacher_id=None, page=1, page_size=10) -> (list[Course], int)`
  - `get_exams(db, course_id=None, status=None, page=1, page_size=10) -> (list[Exam], int)`
  - `get_questions(db, exam_id, page=1, page_size=10) -> (list[Question], int)`
- 三个 GET 列表接口均接受 `page`/`page_size` 查询参数，返回 `paginated_response(items, total, page, page_size)`

- [ ] **Step 1: 改造 `course_service.get_courses` 支持分页**

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.course import Course

async def get_courses(db: AsyncSession, teacher_id: int = None, page: int = 1, page_size: int = 10):
    query = select(Course)
    if teacher_id:
        query = query.where(Course.teacher_id == teacher_id)
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    return result.scalars().all(), total
```

- [ ] **Step 2: 改造 `courses.py` 的 GET /api/courses 返回分页**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.services.course_service import get_courses, get_course, create_course, update_course, delete_course
from app.utils.deps import get_current_user, require_role
from app.utils.response import success_response, paginated_response
from app.models.user import User

@router.get("")
async def list_courses(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    courses, total = await get_courses(
        db, current_user.id if current_user.role == "teacher" else None, page, page_size
    )
    courses_data = [CourseResponse.model_validate(c).model_dump() for c in courses]
    return paginated_response(courses_data, total, page, page_size)
```

- [ ] **Step 3: 改造 `exam_service.get_exams` 支持分页**

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.exam import Exam

async def get_exams(db: AsyncSession, course_id: int = None, status: str = None, page: int = 1, page_size: int = 10):
    query = select(Exam)
    if course_id:
        query = query.where(Exam.course_id == course_id)
    if status:
        query = query.where(Exam.status == status)
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    return result.scalars().all(), total
```

- [ ] **Step 4: 改造 `exams.py` 的 GET /api/exams 返回分页**

在 `exams.py` 的 `list_exams` 中：增加 `page`/`page_size` Query 参数；`exams, total = await get_exams(db, course_id, status, page, page_size)`；返回 `paginated_response(exams_data, total, page, page_size)`。并在 import 中把 `paginated_response` 从 `app.utils.response` 一并导入（`success_response` 继续保留供其他路由使用）。

- [ ] **Step 5: 改造 `question_service.get_questions` 支持分页**

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.question import Question

async def get_questions(db: AsyncSession, exam_id: int, page: int = 1, page_size: int = 10):
    query = select(Question).where(Question.exam_id == exam_id).order_by(Question.sort_order)
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    return result.scalars().all(), total
```

- [ ] **Step 6: 改造 `questions.py` 的 GET /api/exams/{exam_id}/questions 返回分页**

在 `list_questions` 中：增加 `page`/`page_size` Query 参数；`questions, total = await get_questions(db, exam_id, page, page_size)`；返回 `paginated_response(questions_data, total, page, page_size)`；import 增加 `Query`、`paginated_response`。

- [ ] **Step 7: 启动后端验证三个接口分页返回**

在 `backend/` 目录执行：
```powershell
uv run uvicorn app.main:app --reload --port 8000
```
另开终端（用系统已有 teacher/admin 账号登录）：
```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/auth/login" -ContentType "application/json" -Body '{"username":"<教师用户名>","password":"<密码>"}'
$h = @{ Authorization = "Bearer $($login.data.access_token)" }
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/courses?page=1&page_size=10" -Headers $h | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/exams?page=1&page_size=10" -Headers $h | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/exams/<考试ID>/questions?page=1&page_size=10" -Headers $h | ConvertTo-Json -Depth 5
```
Expected: 三者均返回 `{code:200, data:{items:[...], total:<n>, page:1, page_size:10}}`

- [ ] **Step 8: 提交**

```bash
git add backend/app/services/course_service.py backend/app/api/courses.py backend/app/services/exam_service.py backend/app/api/exams.py backend/app/services/question_service.py backend/app/api/questions.py
git commit -m "feat: 课程/考试/题目列表接口改为服务端分页"
```

---

## Task 2: 后端阅卷记录接口分页 + student 嵌套信息

**Files:**
- Modify: `backend/app/services/grading_service.py`
- Modify: `backend/app/api/grading.py`

**Interfaces:**
- Produces: `get_exam_records(db, exam_id, page=1, page_size=10) -> (list[dict], int)`，每条 dict 含记录字段 + 嵌套 `student`（完整用户信息）
- Consumes: `get_exam_records` 现有签名（Task 2 改造后唯一调用方是 `grading.py` 的 `list_exam_records`）

- [ ] **Step 1: 重写 `grading_service.get_exam_records` 支持分页与 student 嵌套**

```python
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.exam_record import ExamRecord
from app.models.question import Question
from app.models.answer import Answer
from app.models.user import User

async def get_exam_records(db: AsyncSession, exam_id: int, page: int = 1, page_size: int = 10):
    query = select(ExamRecord).where(ExamRecord.exam_id == exam_id).order_by(ExamRecord.submit_time.desc())
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    records = result.scalars().all()

    student_ids = [r.student_id for r in records]
    students = {}
    if student_ids:
        res = await db.execute(select(User).where(User.id.in_(student_ids)))
        students = {u.id: u for u in res.scalars().all()}

    items = []
    for r in records:
        s = students.get(r.student_id)
        items.append({
            "id": r.id,
            "student_id": r.student_id,
            "exam_id": r.exam_id,
            "score": r.score,
            "status": r.status,
            "switch_count": r.switch_count,
            "start_time": r.start_time,
            "submit_time": r.submit_time,
            "student": {
                "id": s.id,
                "username": s.username,
                "role": s.role,
                "name": s.name,
                "email": s.email,
                "phone": s.phone,
                "is_active": s.is_active,
                "created_at": s.created_at
            } if s else None
        })
    return items, total
```

- [ ] **Step 2: 改造 `grading.py` 的 GET /api/exams/{exam_id}/records**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.answer import GradeRequest
from app.services.grading_service import get_exam_records, get_record_answers, grade_answer, finalize_record
from app.utils.deps import get_current_user, require_role
from app.utils.response import success_response, paginated_response
from app.models.user import User

@router.get("/api/exams/{exam_id}/records")
async def list_exam_records(
    exam_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    records, total = await get_exam_records(db, exam_id, page, page_size)
    return paginated_response(records, total, page, page_size)
```

- [ ] **Step 3: 验证 records 接口分页与 student 嵌套**

后端继续运行中，另开终端：
```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/auth/login" -ContentType "application/json" -Body '{"username":"<教师用户名>","password":"<密码>"}'
$h = @{ Authorization = "Bearer $($login.data.access_token)" }
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/exams/<有记录的考试ID>/records?page=1&page_size=10" -Headers $h | ConvertTo-Json -Depth 6
```
Expected: `data.items[].student` 包含 `username/name/email/phone/is_active` 等字段，`data.total` 为记录总数。

- [ ] **Step 4: 提交**

```bash
git add backend/app/services/grading_service.py backend/app/api/grading.py
git commit -m "feat: 阅卷记录接口分页并返回学生完整信息"
```

---

## Task 3: 前端 API 层 + 全局主题色

**Files:**
- Create: `frontend/src/api/grading.js`
- Modify: `frontend/src/api/exams.js`
- Modify: `frontend/src/App.js`

**Interfaces:**
- Produces:
  - `getExamRecords(examId, params) -> Promise<{data:{items,total,page,page_size}}>`
  - `getRecordAnswers(recordId) -> Promise<{data: Array}>`
  - `gradeAnswer(answerId, data) -> Promise<{data:{id,score}}>`
  - `finalizeRecord(recordId) -> Promise<{data:{id,status}}>`
  - `getExamQuestions(examId, params)`（参数可选）
- 这些 API 被 Task 7/8 消费

- [ ] **Step 1: 新建 `frontend/src/api/grading.js`**

```js
import axios from './axios';

export const getExamRecords = (examId, params) => axios.get(`/api/exams/${examId}/records`, { params });
export const getRecordAnswers = (recordId) => axios.get(`/api/records/${recordId}/answers`);
export const gradeAnswer = (answerId, data) => axios.put(`/api/answers/${answerId}/grade`, data);
export const finalizeRecord = (recordId) => axios.put(`/api/records/${recordId}/finalize`);
```

- [ ] **Step 2: `exams.js` 的 `getExamQuestions` 支持 params**

把：
```js
export const getExamQuestions = (examId) => axios.get(`/api/exams/${examId}/questions`);
```
改为：
```js
export const getExamQuestions = (examId, params) => axios.get(`/api/exams/${examId}/questions`, { params });
```

- [ ] **Step 3: `App.js` 增加全局主题色**

把：
```jsx
<ConfigProvider locale={zhCN}>
```
改为：
```jsx
<ConfigProvider
  locale={zhCN}
  theme={{ token: { colorPrimary: '#3D5A80', borderRadius: 6 } }}
>
```

- [ ] **Step 4: 构建校验**

```powershell
cd frontend; npm run build
```
Expected: 构建成功（无编译错误）。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/api/grading.js frontend/src/api/exams.js frontend/src/App.js
git commit -m "feat: 新增阅卷API封装并统一全局主题色"
```

---

## Task 4: 课程管理页面（CourseManage）

**Files:**
- Modify: `frontend/src/pages/Teacher/CourseManage/index.js`

**Interfaces:**
- Consumes: `getCourses({page,page_size})`（分页）、`createCourse(data)`、`updateCourse(id,data)`、`deleteCourse(id)`
- Produces: 完整课程管理页面（新建/编辑/删除 + 服务端分页表格）

- [ ] **Step 1: 实现完整页面代码**

```jsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getCourses, createCourse, updateCourse, deleteCourse } from '../../../api/courses';

const { TextArea } = Input;

const CourseManage = () => {
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchCourses = async (p, ps) => {
    setLoading(true);
    try {
      const res = await getCourses({ page: p, page_size: ps });
      setCourses(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      message.error('获取课程列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses(page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const handleAdd = () => {
    setEditingCourse(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingCourse(record);
    form.setFieldsValue({ name: record.name, description: record.description });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteCourse(id);
      message.success('删除成功');
      fetchCourses(page, pageSize);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingCourse) {
        await updateCourse(editingCourse.id, values);
        message.success('更新成功');
      } else {
        await createCourse(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchCourses(page, pageSize);
    } catch (error) {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
    { title: '课程名称', dataIndex: 'name', key: 'name' },
    { title: '课程描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该课程？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card title="课程管理">
      <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ marginBottom: 16 }}>
        新建课程
      </Button>
      <Table
        columns={columns}
        dataSource={courses}
        loading={loading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
      <Modal
        title={editingCourse ? '编辑课程' : '新建课程'}
        open={modalVisible}
        onOk={handleSubmit}
        confirmLoading={submitting}
        onCancel={() => setModalVisible(false)}
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="课程名称" rules={[{ required: true, message: '请输入课程名称' }]}>
            <Input maxLength={100} placeholder="请输入课程名称" />
          </Form.Item>
          <Form.Item name="description" label="课程描述">
            <TextArea rows={3} placeholder="请输入课程描述" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default CourseManage;
```

- [ ] **Step 2: 构建 + 手动验证**

```powershell
cd frontend; npm run build
```
Expected: 构建成功。然后 `npm start`，以 teacher 登录进入"课程管理"：新建课程 → 列表出现并刷新；编辑课程 → 表单回填并保存；删除课程 → Popconfirm 确认后移除；翻页正常（数据多时分页）。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/pages/Teacher/CourseManage/index.js
git commit -m "feat: 实现课程管理页面（CRUD + 分页）"
```

---

## Task 5: 考试管理页 + 学生考试列表页分页适配

**Files:**
- Modify: `frontend/src/pages/Teacher/ExamManage/index.js`
- Modify: `frontend/src/pages/Student/ExamList/index.js`

**Interfaces:**
- Consumes: `getExams({page,page_size})`、`getExams({status:'published',page,page_size})`
- Produces: 两页表格使用服务端分页，数据源从 `res.data` 改为 `res.data.items`；ExamManage 每行新增"阅卷"按钮

- [ ] **Step 1: 适配 `ExamManage`**

将 `index.js` 中的状态与取数改为分页版（保留原有删除/发布逻辑）：
```jsx
const [exams, setExams] = useState([]);
const [total, setTotal] = useState(0);
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);
const [loading, setLoading] = useState(false);
const navigate = useNavigate();

const fetchExams = async (p, ps) => {
  setLoading(true);
  try {
    const res = await getExams({ page: p, page_size: ps });
    setExams(res.data.items || []);
    setTotal(res.data.total || 0);
  } catch (error) {
    message.error('获取考试列表失败');
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchExams(page, pageSize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [page, pageSize]);
```
**注意：** 现有的 `handleDelete` 与 `handlePublish` 内部调用的是 `fetchExams()`（无参），改为 `fetchExams(page, pageSize)`，否则会因 `page=undefined` 请求失败。
在"操作"列最前面加"阅卷"按钮：
```jsx
<Button type="link" icon={<SendOutlined />} onClick={() => navigate(`/grading?examId=${record.id}`)}>
  阅卷
</Button>
```
将 `<Table>` 的 `dataSource={exams}` 保持，并增加分页配置：
```jsx
pagination={{
  current: page,
  pageSize,
  total,
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 条`,
  onChange: (p, ps) => { setPage(p); setPageSize(ps); },
}}
```
（若与现有 `<Table columns={columns} dataSource={exams} loading={loading} rowKey="id" />` 冲突，以新增 pagination 属性为准。）

- [ ] **Step 2: 适配 `ExamList`（学生）**

将 `fetchExams` 改为：
```jsx
const [total, setTotal] = useState(0);
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);

const fetchExams = async (p, ps) => {
  setLoading(true);
  try {
    const res = await getExams({ status: 'published', page: p, page_size: ps });
    setExams(res.data.items || []);
    setTotal(res.data.total || 0);
  } catch (error) {
    message.error('获取考试列表失败');
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchExams(page, pageSize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [page, pageSize]);
```
`<Table>` 增加与服务端一致的分页配置（同 Task 4 样式）。

- [ ] **Step 3: 构建 + 手动验证**

```powershell
cd frontend; npm run build
```
Expected: 构建成功。teacher 登录"考试管理"：列表正常展示、分页可用、每行有"阅卷"按钮且点击跳转 `/grading?examId=<id>`；student 登录"考试列表"：分页可用、开始考试仍正常。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/pages/Teacher/ExamManage/index.js frontend/src/pages/Student/ExamList/index.js
git commit -m "feat: 考试管理/学生考试列表适配服务端分页"
```

---

## Task 6: 考试编辑页分页适配（ExamEdit）

**Files:**
- Modify: `frontend/src/pages/Teacher/ExamEdit/index.js`

**Interfaces:**
- Consumes: `getCourses({page_size:100})`、`getExamQuestions(examId,{page,page_size})`
- Produces: 课程下拉从分页接口取数，题目表格改服务端分页，新建题 `sort_order` 用 `total+1`

- [ ] **Step 1: 课程下拉适配**

把 `fetchData` 中：
```js
const res = await getCourses();
setCourses(res.data || []);
```
改为：
```js
const res = await getCourses({ page: 1, page_size: 100 });
setCourses(res.data.items || []);
```

- [ ] **Step 2: 题目列表改服务端分页**

新增状态：
```jsx
const [questionTotal, setQuestionTotal] = useState(0);
const [questionPage, setQuestionPage] = useState(1);
const [questionPageSize, setQuestionPageSize] = useState(10);
```
在 `fetchData` 的 `Promise.all` 中，把：
```js
getExamQuestions(examId),
```
改为：
```js
getExamQuestions(examId, { page: questionPage, page_size: questionPageSize }),
```
并把：
```js
setQuestions(questionsRes.data || []);
```
改为：
```js
setQuestions(questionsRes.data.items || []);
setQuestionTotal(questionsRes.data.total || 0);
```
将题目 Card 标题从：
```jsx
title={`题目管理（${questions.length}）`}
```
改为：
```jsx
title={`题目管理（${questionTotal}）`}
```
将题目 `<Table>` 的 `pagination={false}` 替换为服务端分页：
```jsx
pagination={{
  current: questionPage,
  pageSize: questionPageSize,
  total: questionTotal,
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 条`,
  onChange: (p, ps) => { setQuestionPage(p); setQuestionPageSize(ps); },
}}
```
在 `handleAddQuestion` 中，把 `sort_order: questions.length + 1` 改为 `sort_order: questionTotal + 1`。
在 `useEffect` 依赖数组加上 `questionPage, questionPageSize`（`fetchData` 已由 `examId` 触发，此处需在翻页时重新拉取题目）。修改依赖为 `[examId, questionPage, questionPageSize]`。

- [ ] **Step 3: 构建 + 手动验证**

```powershell
cd frontend; npm run build
```
Expected: 构建成功。teacher 进入"编辑考试"：新建考试的课程下拉正常；已有考试的题目表格分页可用；添加题目后总数与列表刷新；删除题目正常。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/pages/Teacher/ExamEdit/index.js
git commit -m "feat: 考试编辑页适配课程/题目接口分页"
```

---

## Task 7: 阅卷管理 - 列表页与入口（Grading）

**Files:**
- Create: `frontend/src/pages/Teacher/Grading/GradingDrawer.js`
- Modify: `frontend/src/pages/Teacher/Grading/index.js`

**Interfaces:**
- Consumes: `getExams({page_size:100})`、`getExamRecords(examId,{page,page_size})`、`getRecordAnswers(recordId)`
- Produces:
  - `<GradingDrawer record={record} open={open} onClose={...} onChanged={...} />`
  - 列表页：考试下拉 + URL 参数自动选中 + 记录表格（含分页）+ 状态 Tag + "阅卷"按钮

- [ ] **Step 1: 实现列表页 `Grading/index.js`**

```jsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Select, Tag, Space, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { getExams } from '../../../api/exams';
import { getExamRecords } from '../../../api/grading';
import GradingDrawer from './GradingDrawer';

const statusMap = {
  ongoing: { color: 'processing', text: '进行中' },
  submitted: { color: 'warning', text: '待阅卷' },
  graded: { color: 'success', text: '已阅卷' },
};

const Grading = () => {
  const [searchParams] = useSearchParams();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState(null);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [drawerRecord, setDrawerRecord] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    getExams({ page_size: 100 })
      .then((res) => setExams(res.data.items || []))
      .catch(() => message.error('获取考试列表失败'));
  }, []);

  useEffect(() => {
    const urlExamId = searchParams.get('examId');
    if (urlExamId) setExamId(Number(urlExamId));
  }, [searchParams]);

  const fetchRecords = async (exam, p, ps) => {
    if (!exam) return;
    setRecordsLoading(true);
    try {
      const res = await getExamRecords(exam, { page: p, page_size: ps });
      setRecords(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      message.error('获取考试记录失败');
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    if (examId) fetchRecords(examId, page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, page, pageSize]);

  const handleOpenDrawer = (record) => {
    setDrawerRecord(record);
    setDrawerOpen(true);
  };

  const columns = [
    { title: '学生姓名', dataIndex: ['student', 'name'], key: 'student_name' },
    { title: '用户名', dataIndex: ['student', 'username'], key: 'username' },
    { title: '邮箱', dataIndex: ['student', 'email'], key: 'email' },
    { title: '得分', dataIndex: 'score', key: 'score', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>,
    },
    { title: '切屏次数', dataIndex: 'switch_count', key: 'switch_count', width: 100 },
    {
      title: '提交时间',
      dataIndex: 'submit_time',
      key: 'submit_time',
      render: (v) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => handleOpenDrawer(record)}>
            阅卷
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="阅卷管理">
      <Space style={{ marginBottom: 16 }}>
        <span>选择考试：</span>
        <Select
          style={{ width: 280 }}
          placeholder="请选择考试"
          value={examId}
          onChange={(v) => {
            setExamId(v);
            setPage(1);
          }}
          options={exams.map((e) => ({ label: `${e.title}（ID: ${e.id}）`, value: e.id }))}
          showSearch
          optionFilterProp="label"
        />
      </Space>
      <Table
        columns={columns}
        dataSource={records}
        loading={recordsLoading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        locale={{ emptyText: examId ? '该考试暂无记录' : '请先选择考试' }}
      />
      <GradingDrawer
        record={drawerRecord}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onChanged={() => fetchRecords(examId, page, pageSize)}
      />
    </Card>
  );
};

export default Grading;
```

- [ ] **Step 2: 实现只读版 `GradingDrawer.js`（展示学生信息 + 答案，无打分交互）**

```jsx
import React, { useState, useEffect } from 'react';
import { Drawer, Descriptions, Tag, Spin, message } from 'antd';
import { getRecordAnswers } from '../../../api/grading';

const typeMap = {
  single: { color: 'blue', text: '单选题' },
  multiple: { color: 'geekblue', text: '多选题' },
  judge: { color: 'orange', text: '判断题' },
  blank: { color: 'purple', text: '填空题' },
  essay: { color: 'green', text: '简答题' },
};
const statusMap = {
  ongoing: { color: 'processing', text: '进行中' },
  submitted: { color: 'warning', text: '待阅卷' },
  graded: { color: 'success', text: '已阅卷' },
};

const GradingDrawer = ({ record, open, onClose, onChanged }) => {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !record) return;
    const fetchAnswers = async () => {
      setLoading(true);
      try {
        const res = await getRecordAnswers(record.id);
        setAnswers(res.data || []);
      } catch (error) {
        message.error('获取答题详情失败');
      } finally {
        setLoading(false);
      }
    };
    fetchAnswers();
  }, [open, record]);

  const totalEarned = answers.reduce((sum, a) => sum + (a.score ?? 0), 0);
  const totalFull = answers.reduce((sum, a) => sum + (a.question?.score || 0), 0);

  return (
    <Drawer
      title={record ? `${record.student?.name || record.student_id} 的答卷` : ''}
      width={720}
      open={open}
      onClose={onClose}
    >
      <Spin spinning={loading}>
        {record && (
          <>
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="学生">
                {record.student?.name}（{record.student?.username}）
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[record.status]?.color}>{statusMap[record.status]?.text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">{record.student?.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="电话">{record.student?.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="得分">{totalEarned} / {totalFull}</Descriptions.Item>
              <Descriptions.Item label="切屏次数">{record.switch_count}</Descriptions.Item>
              <Descriptions.Item label="提交时间" span={2}>
                {record.submit_time ? new Date(record.submit_time).toLocaleString() : '-'}
              </Descriptions.Item>
            </Descriptions>

            {answers.map((a, index) => (
              <div key={a.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <Tag color={typeMap[a.question.type]?.color}>{typeMap[a.question.type]?.text}</Tag>
                <strong>第 {index + 1} 题</strong>
                <span>（{a.question.score}分）</span>
                <p style={{ margin: '8px 0' }}>{a.question.content}</p>
                {a.question.options?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {a.question.options.map((opt, i) => (
                      <div key={i}>{String.fromCharCode(65 + i)}. {opt}</div>
                    ))}
                  </div>
                )}
                <p style={{ marginBottom: 4 }}>
                  <strong>正确答案：</strong>{a.question.answer || '（无）'}
                </p>
                <p style={{ marginBottom: 0 }}>
                  <strong>学生答案：</strong>{a.student_answer || '（未作答）'}
                </p>
              </div>
            ))}
            {answers.length === 0 && <div>该记录暂无答案</div>}
          </>
        )}
      </Spin>
    </Drawer>
  );
};

export default GradingDrawer;
```

- [ ] **Step 3: 构建 + 手动验证**

```powershell
cd frontend; npm run build
```
Expected: 构建成功。teacher 登录"阅卷管理"：下拉可选考试并加载记录（URL 带 `?examId=x` 直接进入自动选中）；点击"阅卷"打开抽屉，正确展示学生信息、题目、正确答案与学生答案。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/pages/Teacher/Grading/index.js frontend/src/pages/Teacher/Grading/GradingDrawer.js
git commit -m "feat: 实现阅卷管理列表页与答卷展示抽屉"
```

---

## Task 8: 阅卷打分交互（打分、保存、自动判分、终评）

**Files:**
- Modify: `frontend/src/pages/Teacher/Grading/GradingDrawer.js`

**Interfaces:**
- Consumes: `gradeAnswer(answerId,{score,is_correct})`、`finalizeRecord(recordId)`、`onChanged`（通知列表刷新）
- Produces: 每题的判分控件（正确 Switch + 得分 InputNumber）、保存、自动判分客观题、终评

- [ ] **Step 1: 在 `GradingDrawer.js` 增加打分状态与控件**

在组件内新增状态：
```jsx
const [scores, setScores] = useState({});
const [correctness, setCorrectness] = useState({});
const [savingId, setSavingId] = useState(null);
```
在答案加载成功回调中初始化打分状态：
```js
const s = {};
const c = {};
(res.data || []).forEach((a) => {
  s[a.id] = a.score ?? 0;
  c[a.id] = a.is_correct === true;
});
setScores(s);
setCorrectness(c);
```
`totalEarned` 改用打分状态计算：
```jsx
const totalEarned = answers.reduce((sum, a) => sum + (scores[a.id] ?? 0), 0);
```

- [ ] **Step 2: 实现单题保存**

```jsx
const handleSave = async (answer) => {
  setSavingId(answer.id);
  try {
    await gradeAnswer(answer.id, {
      score: scores[answer.id] ?? 0,
      is_correct: correctness[answer.id],
    });
    message.success('已保存');
    onChanged?.();
  } catch (error) {
    message.error('保存失败');
  } finally {
    setSavingId(null);
  }
};
```

- [ ] **Step 3: 实现自动判分客观题**

```jsx
const handleAutoGrade = async () => {
  const objective = answers.filter((a) =>
    ['single', 'multiple', 'judge'].includes(a.question.type)
  );
  if (objective.length === 0) {
    message.info('没有客观题');
    return;
  }
  const nextScores = { ...scores };
  const nextCorrect = { ...correctness };
  objective.forEach((a) => {
    const stu = (a.student_answer || '').trim().toUpperCase();
    const ans = (a.question.answer || '').trim().toUpperCase();
    const isCorrect = !!stu && stu === ans;
    nextScores[a.id] = isCorrect ? a.question.score : 0;
    nextCorrect[a.id] = isCorrect;
  });
  setScores(nextScores);
  setCorrectness(nextCorrect);
  for (const a of objective) {
    try {
      await gradeAnswer(a.id, { score: nextScores[a.id], is_correct: nextCorrect[a.id] });
    } catch (e) {
      // 单题失败不中断，继续其余题目
    }
  }
  message.success(`已自动判分 ${objective.length} 道客观题`);
  onChanged?.();
};
```

- [ ] **Step 4: 实现终评**

```jsx
const handleFinalize = async () => {
  try {
    await finalizeRecord(record.id);
    message.success('终评成功');
    onChanged?.();
    onClose();
  } catch (error) {
    message.error('终评失败');
  }
};
```

- [ ] **Step 5: 给 Drawer 加 `extra` 操作区与每题判分控件**

给 `Drawer` 增加：
```jsx
extra={
  <Space>
    <Button icon={<CheckSquareOutlined />} onClick={handleAutoGrade}>
      自动判分客观题
    </Button>
    <Button type="primary" icon={<AuditOutlined />} onClick={handleFinalize}>
      终评
    </Button>
  </Space>
}
```
import 增加：`Button, Space, InputNumber, Switch` 与图标 `SaveOutlined, CheckSquareOutlined, AuditOutlined`。

在每个答案卡片末尾（学生答案 `</p>` 之后）追加判分区：
```jsx
<Space align="center" style={{ marginTop: 12 }}>
  {['single', 'multiple', 'judge'].includes(a.question.type) && (
    <>
      <span>正确</span>
      <Switch
        checked={correctness[a.id]}
        onChange={(v) => setCorrectness((p) => ({ ...p, [a.id]: v }))}
      />
    </>
  )}
  <span>得分</span>
  <InputNumber
    min={0}
    max={a.question.score}
    value={scores[a.id]}
    onChange={(v) => setScores((p) => ({ ...p, [a.id]: v ?? 0 }))}
  />
  <span>/ {a.question.score}</span>
  <Button
    type="primary"
    size="small"
    icon={<SaveOutlined />}
    loading={savingId === a.id}
    onClick={() => handleSave(a)}
  >
    保存
  </Button>
</Space>
```

- [ ] **Step 6: 构建 + 手动验证**

```powershell
cd frontend; npm run build
```
Expected: 构建成功。teacher 进入阅卷：打开含主观题的答卷，修改主观题得分并保存 → 顶部得分刷新、表格状态变为"已阅卷"；点击"自动判分客观题" → 客观题得分按比对结果更新；点击"终评" → 抽屉关闭、记录表刷新。

- [ ] **Step 7: 提交**

```bash
git add frontend/src/pages/Teacher/Grading/GradingDrawer.js
git commit -m "feat: 实现阅卷打分交互（单题保存/自动判分/终评）"
```

---

## Task 9: 整体回归验证

**Files:**
- 无代码改动（仅验证）

- [ ] **Step 1: 前端构建 + 全链路手测**

```powershell
cd frontend; npm run build
```
Expected: 构建成功。随后 `npm start` 完整回归：
1. teacher：课程管理（增删改查 + 分页）
2. teacher：考试管理（列表分页 + "阅卷"跳转）
3. teacher：阅卷管理（下拉 / URL 进入、记录分页、抽屉逐题打分、自动判分、终评、状态同步）
4. teacher：考试编辑页（课程下拉、题目分页、添加/删除题目）
5. student：考试列表分页 + 开始考试 + 交卷；我的记录
6. admin：用户管理不受影响

- [ ] **Step 2: 后端回归**

后端运行中，用 teacher/admin 账号依次验证：
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/courses?page=1&page_size=10" -Headers $h | Out-Null
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/exams?page=1&page_size=10" -Headers $h | Out-Null
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/exams/1/questions?page=1&page_size=10" -Headers $h | Out-Null
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/exams/1/records?page=1&page_size=10" -Headers $h | Out-Null
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/records/1/answers" -Headers $h | Out-Null
```
Expected: 全部返回 `code:200`，无 500 错误。

- [ ] **Step 3: 收尾提交（如有遗留改动）**

```bash
git status
git add -u
git commit -m "chore: 回归验证"
```
（若无遗留改动则跳过本步）
