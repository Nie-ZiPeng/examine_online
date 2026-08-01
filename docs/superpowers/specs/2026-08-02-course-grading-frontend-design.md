# 课程管理与阅卷管理前端实现 - 设计文档

## 1. 项目概述

### 1.1 背景
在线考试系统前端（React + antd v5 + zustand + react-router）已完成登录、用户管理、考试管理、学生考试、我的记录。本次实现**课程管理**与**阅卷管理**两个教师页面的完整功能，并对后端列表接口做分页改造以支撑数据量增长。

### 1.2 目标
- 课程管理页面：教师课程 CRUD（新建/编辑/删除/分页列表）
- 阅卷管理页面：按考试查看学生记录 → 进入答卷抽屉逐题打分 → 自动判分客观题 → 终评
- 后端 4 个列表接口改为服务端分页，阅卷记录接口嵌套返回学生完整信息
- 统一全局主题色，轻微卡片化升级，保持与现有页面风格一致

### 1.3 范围边界
- **不改动**：考试答题/交卷流程、防作弊、统计报表模块
- **改动**：`courses.py`、`exams.py`、`questions.py`、`grading.py` 及其 service（仅分页 + 学生信息）
- **现有页面适配**：ExamManage、ExamList（学生）、ExamEdit（分页结构变化）

---

## 2. 方案选型

| 方案 | 说明 | 结论 |
|---|---|---|
| A. 后端分页改造 + 前端全量适配 | 4 个列表接口改 `paginated_response`，前端全部消费方适配服务端分页 | **采用**（满足"数据量大的都加分页"+"records 返回学生详情"决策） |
| B. 仅新页面分页 | 不动考试/题库接口 | 不满足需求，淘汰 |
| C. 前端假分页 | 一次拉全量，前端 Table 分页 | 与"改后端"决策矛盾，淘汰 |

---

## 3. 后端改造设计

统一约定：`page` 默认 1、`ge=1`；`page_size` 默认 10、`ge=1, le=100`；列表返回 `paginated_response(items, total, page, page_size)`（即 `{code, message, data:{items,total,page,page_size}}`）。

### 3.1 GET /api/courses
- `course_service.get_courses(db, teacher_id, page, page_size)` → 返回 `(items, total)`，保留教师过滤，用 `select(func.count())` 求 total。
- `courses.py` 增加 `page`/`page_size` Query 参数，返回 `paginated_response`。

### 3.2 GET /api/exams
- `exam_service.get_exams(db, course_id, status, page, page_size)` → `(items, total)`，保留现有过滤。
- `exams.py` 增加分页参数。

### 3.3 GET /api/exams/{exam_id}/questions
- `question_service.get_questions(db, exam_id, page, page_size)` → `(items, total)`。
- `questions.py` 增加分页参数。

### 3.4 GET /api/exams/{exam_id}/records（核心）
- `grading_service.get_exam_records(db, exam_id, page, page_size)` → `(items, total)`。
- items 每条为记录字段 **+ 嵌套 student 完整用户信息**：
```json
{
  "id": 1, "student_id": 3, "exam_id": 2,
  "score": 60, "status": "submitted",
  "switch_count": 1, "start_time": "...", "submit_time": "...",
  "student": {
    "id": 3, "username": "stu01", "role": "student",
    "name": "张三", "email": "...", "phone": "...",
    "is_active": true, "created_at": "..."
  }
}
```
- 实现：分页查 `ExamRecord` → 收集当页 `student_id` 集合 → `select(User).where(User.id.in_(...))` 一次查出 → 组装嵌套对象。

### 3.5 不变部分
- `GET /api/records/{record_id}/answers`、`PUT /api/answers/{answer_id}/grade`、`PUT /api/records/{record_id}/finalize` 不改。
- `submit_exam` 已在交卷时自动判分客观题（`single/multiple/judge` 按 `student_answer.upper() == q.answer.upper()`），多选答案存拼接字符串（如 "ABC"）。

---

## 4. 前端 API 层

**新建 `frontend/src/api/grading.js`：**
```js
import axios from './axios';
export const getExamRecords = (examId, params) => axios.get(`/api/exams/${examId}/records`, { params });
export const getRecordAnswers = (recordId) => axios.get(`/api/records/${recordId}/answers`);
export const gradeAnswer = (answerId, data) => axios.put(`/api/answers/${answerId}/grade`, data);
export const finalizeRecord = (recordId) => axios.put(`/api/records/${recordId}/finalize`);
```

**`exams.js` 调整：** `getExamQuestions(examId)` → `getExamQuestions(examId, params)`。

分页返回统一取 `res.data.items` / `res.data.total`（与 UserManage 现状一致）。

---

## 5. 课程管理页面（CourseManage）

- **结构**：`Card` 包裹，标题"课程管理"，右上"新建课程"主按钮（`PlusOutlined`）。
- **Table 列**：ID、课程名称、课程描述（`ellipsis`）、创建时间（`toLocaleString`）、操作（编辑 / 删除 Popconfirm）。
- **Modal 表单**（垂直布局）：课程名称（必填，max 100）、课程描述（`TextArea`，可选）。编辑时回填，新建时清空。
- **服务端分页**：`getCourses({ page, page_size })` → `items/total`；Table `pagination={{ current, pageSize, total, onChange }}`。
- 教师角色后端只返回自己的课程；空态用 antd Table 内置空状态。

---

## 6. 阅卷管理页面（Grading）— 核心

### 6.1 入口（两种都要）
- 顶部 `Select` 考试下拉：挂载时 `getExams({ page_size: 100 })` 填充（显示全部考试）。
- URL 参数进入：读取 `useSearchParams().get('examId')`，存在则自动选中并加载记录（从 ExamManage"阅卷"按钮跳入 `/grading?examId=xxx`）。
- 选中考试后展示考试信息（标题、时长、总分）+ 记录表格。

### 6.2 记录表格
- 列：学生姓名（`student.name`）、用户名（`student.username`）、邮箱（`student.email`）、得分、状态 Tag、切屏次数、提交时间、操作（"阅卷"）。
- 状态映射：`ongoing`=进行中/processing、`submitted`=待阅卷/warning、`graded`=已阅卷/success。
- 服务端分页（同课程页模式）；切换考试重置页码。

### 6.3 打分 Drawer（宽度 ~720，右侧）
- 顶部信息块：学生姓名 + 用户名 + 邮箱/电话 + 状态 Tag + 得分（当前/满分）+ 切屏次数 + 提交时间。
- 题目列表（逐题卡片）：
  - 题头：`第N题` + 题型 Tag（single/multiple/judge/blank/essay）+ 分值
  - 题干、选项（客观题 A/B/C/D 展示）
  - **正确答案** `question.answer`（客观题大写显示）
  - **学生答案** `student_answer`
  - **判分区**：
    - 客观题：`是否正确` Switch（对/错）+ 得分 `InputNumber`（0~题分，正确自动填题分）
    - 主观题（blank/essay）：得分 `InputNumber`（0~题分）
  - 每题"保存"按钮 → `gradeAnswer(answerId, { score, is_correct })`；已判分题显示当前得分可改。
- 底部操作：
  - **"自动判分客观题"**：对 single/multiple/judge 逐题比对 `student_answer.upper() === question.answer.upper()`，批量 `gradeAnswer`（交卷时已自动判，此按钮为复核/重置）。
  - **"终评"**：`finalizeRecord(recordId)` → 关闭抽屉 → 刷新记录表。

### 6.4 状态同步
- 单题保存后后端 `recalculate_total_score` 会更新总分并将记录置为 `graded` → 保存后刷新抽屉数据与记录表（顶部得分、表格状态同步）。
- 抽屉加载中显示 loading。

---

## 7. 现有页面适配

| 页面 | 改动 |
|---|---|
| `ExamManage` | `res.data`→`res.data.items`；Table 加服务端分页；每行加"阅卷"按钮 → `/grading?examId=id` |
| `ExamList`（学生） | `res.data`→`res.data.items`；Table 加服务端分页 |
| `ExamEdit` | `getCourses()`→`res.data.items`（`page_size:100`）；题目 Table 改服务端分页；新建题 `sort_order` 用 `total + 1` 兜底 |

---

## 8. 视觉风格（统一主题色 + 轻微卡片化）

- **全局主题色**：低饱和商务蓝 / 藏青系。`App.js` 的 `ConfigProvider` 增加 `theme={{ token: { colorPrimary: '#3D5A80', borderRadius: 6 } }}`（藏青蓝，全局生效，现有页面自动统一）。
- **新页面**用 `Card` 包裹（标题 + 说明），保持与 Content 白卡一致的间距，Table 默认质感、行 hover 高亮。
- 交互语言与现有页面一致（Table / Modal / Tag / Drawer / Popconfirm / message），不做花哨动效。

---

## 9. 交互状态与错误处理

- 列表：Table `loading`；空态用内置空状态；阅卷页未选考试时提示"请选择考试"。
- 增删改/保存/终评：`message.success/error`，错误信息取后端 `detail`。
- 打分保存成功：单题"已保存"态并刷新总分；失败保留输入。
- 抽屉答案加载中 loading；切换考试/页码重置页码。

---

## 10. 测试与验证

- 后端：本地 `uvicorn` 启动，验证 4 个接口分页返回、records 的 `student` 嵌套。
- 前端：`npm start` 手测课程 CRUD、阅卷全流程（下拉/URL 进入、逐题打分、自动判分、终评）、考试管理/学生列表/编辑页分页回归。
- 项目未配置自动化测试框架，采用手动验证 + 编译检查。

---

**文档版本**: v1.1
**创建日期**: 2026-08-02
**最后更新**: 2026-08-02
