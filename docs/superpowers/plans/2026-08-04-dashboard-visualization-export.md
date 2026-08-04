# 仪表盘可视化与数据导出实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有仪表盘响应的前提下，为三个角色增加 ECharts 图表，并由后端按权限生成 CSV/XLSX 导出文件。

**Architecture:** 保留 `GET /api/statistics/dashboard` 作为页面数据源；新增独立的导出数据组装和文件渲染服务。前端使用一个可复用 ECharts 容器和角色专用 option 构建函数，导出按钮请求后端 Blob，不在浏览器重新拼接权限数据。

**Tech Stack:** FastAPI、SQLAlchemy AsyncSession、Python 标准库 `csv`/`io`、`openpyxl`、React 19、TypeScript、ECharts 5、Ant Design 6、Jest/Testing Library、pytest。

## Global Constraints

- 首版只使用现有仪表盘字段，不新增趋势统计接口，不修改 `/api/statistics/dashboard` 响应结构。
- 学生只能导出自己的 `ExamRecord`；教师只能导出自己 `Course` 下的考试和答卷；管理员可导出全局数据。
- 导出接口不接受用于扩张查询范围的用户、教师或课程 ID 参数。
- CSV 一次导出一个数据集并带 UTF-8 BOM；XLSX 导出当前角色允许的全部工作表。
- 本期不实现班级、学科、选课、分班或考试班级分配；后续扩展方案已记录在 `docs/superpowers/specs/2026-08-04-dashboard-visualization-export-design.md`。
- 保留工作区已有的 `frontend/package-lock.json` 和 `.codegraph/` 改动，不在任务中覆盖或回滚它们。

---

## 文件地图

| 文件 | 职责 |
| --- | --- |
| `backend/app/services/statistics_service.py` | 保持现有页面仪表盘查询；不把文件编码逻辑继续塞入此文件。 |
| `backend/app/services/dashboard_export_service.py` | 生成角色限定的数据集，并渲染 CSV/XLSX 字节内容。 |
| `backend/app/api/statistics.py` | 暴露导出路由，校验 query 参数并返回下载响应。 |
| `backend/tests/test_dashboard_export.py` | 覆盖三种角色数据范围、dataset 校验、CSV/XLSX 内容。 |
| `frontend/src/components/EChart/index.tsx` | 创建、更新、销毁 ECharts 实例并响应容器尺寸变化。 |
| `frontend/src/pages/Dashboard/chartOptions.ts` | 从 dashboard 类型数据生成各角色图表 option。 |
| `frontend/src/pages/Dashboard/index.tsx` | 插入角色图表和导出菜单，调用 API/下载工具。 |
| `frontend/src/pages/Dashboard/index.css` | 提供固定图表容器高度及响应式布局。 |
| `frontend/src/api/statistics.ts` | 增加 Blob 导出请求封装。 |
| `frontend/src/utils/dashboardExport.ts` | 从响应头生成安全文件名并触发浏览器下载。 |
| `frontend/src/components/EChart/index.test.tsx` | 验证图表容器生命周期和 resize 清理。 |
| `frontend/src/pages/Dashboard/chartOptions.test.ts` | 验证三种角色 option 的数据映射和空数据行为。 |
| `frontend/src/pages/Dashboard/index.test.tsx` | 验证图表和导出菜单按角色显示、下载失败提示。 |
| `frontend/package.json`、`frontend/package-lock.json` | 添加 ECharts 运行时依赖。 |

---

## Task 1: 定义导出数据集与后端权限测试

**Files:**
- Create: `backend/tests/test_dashboard_export.py`
- Create: `backend/app/services/dashboard_export_service.py`

**Interfaces:**
- Produces `get_dashboard_export_datasets(db: AsyncSession, user: User) -> dict[str, list[dict[str, object]]]`。
- Produces `render_dashboard_export(datasets: dict[str, list[dict[str, object]]], file_format: Literal["csv", "xlsx"], dataset: str | None = None) -> tuple[bytes, str, str]`，返回 `(content, media_type, filename)`。
- Produces `allowed_datasets_for_role(role: str) -> frozenset[str]`，供路由和渲染函数共用校验。

- [ ] **Step 1: Write failing service tests for role datasets**

测试模块顶部定义 `student_db`、`teacher_db`、`admin_db` 三个 pytest fixture；每个 fixture 返回带有 `execute`/`scalar` `AsyncMock` 的轻量级 fake session，并按服务查询顺序返回对应的 `ScalarResult`/`Result`。fixture 数据必须包含一个非当前学生记录和一个非当前教师课程，确保实现不能只返回“查询到的所有记录”。先写三组断言：

```python
@pytest.mark.asyncio
async def test_student_export_contains_only_student_records():
    datasets = await get_dashboard_export_datasets(student_db, student_user)
    assert set(datasets) == {"summary", "recent_records", "upcoming_exams"}
    assert all(row["student_id"] == student_user.id for row in datasets["recent_records"])

@pytest.mark.asyncio
async def test_teacher_export_is_limited_to_owned_courses():
    datasets = await get_dashboard_export_datasets(teacher_db, teacher_user)
    assert datasets["pending_grading"] == [{"exam_title": "Owned exam", "pending_count": 2}]
    assert all(row["course_id"] in {10, 11} for row in datasets["recent_exams"])

@pytest.mark.asyncio
async def test_admin_export_contains_global_role_distribution():
    datasets = await get_dashboard_export_datasets(admin_db, admin_user)
    assert datasets["role_distribution"] == [
        {"role": "student", "count": 4},
        {"role": "teacher", "count": 2},
        {"role": "admin", "count": 1},
    ]
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `cd backend; uv run pytest tests/test_dashboard_export.py -q`

Expected: FAIL because `dashboard_export_service.py` and its dataset function do not exist。

- [ ] **Step 3: Implement dataset assembly**

将现有 `get_dashboard_data` 的角色查询规则提取为导出服务中的独立查询，不调用前端响应，也不接受客户端范围参数。数据集固定为：

```python
STUDENT_DATASETS = frozenset({"summary", "recent_records", "upcoming_exams"})
TEACHER_DATASETS = frozenset({"summary", "pending_grading", "recent_exams"})
ADMIN_DATASETS = frozenset({"summary", "role_distribution", "recent_users"})
```

每个明细行使用稳定的英文键，表头在渲染时映射为中文；教师查询先取得 `Course.teacher_id == user.id` 的课程 ID，再限制考试、记录和答案查询；学生查询始终带 `ExamRecord.student_id == user.id`。

- [ ] **Step 4: Add pure renderer tests**

增加以下断言，测试不连接数据库：

```python
def test_csv_renderer_writes_utf8_bom_and_headers():
    content, media_type, filename = render_dashboard_export(
        {"summary": [{"metric": "通过率", "value": 80}]}, "csv", "summary"
    )
    assert content.startswith(b"\xef\xbb\xbf")
    assert media_type == "text/csv; charset=utf-8"
    assert filename.endswith(".csv")
    assert "metric" in content.decode("utf-8-sig")

def test_xlsx_renderer_creates_expected_sheets():
    content, media_type, filename = render_dashboard_export(
        {"summary": [{"metric": "考试总数", "value": 3}], "role_distribution": []}, "xlsx"
    )
    from io import BytesIO
    from openpyxl import load_workbook

    assert media_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert filename.endswith(".xlsx")
    workbook = load_workbook(BytesIO(content), read_only=True)
    assert workbook.sheetnames == ["summary", "role_distribution"]
```

- [ ] **Step 5: Implement CSV/XLSX renderer**

CSV 使用 `io.StringIO(newline="")`、`csv.DictWriter` 和 `utf-8-sig` 编码；XLSX 使用已存在的 `openpyxl`，按数据集创建 sheet，首行写稳定中文表头并冻结首行。CSV 的 `dataset` 必须先通过当前角色允许集合校验，非法值抛出明确的 `DashboardExportError`。

- [ ] **Step 6: Run backend tests and commit**

Run: `cd backend; uv run pytest tests/test_dashboard_export.py -q`

Expected: all dataset, permission, CSV, and XLSX tests PASS。

Commit: `git add backend/app/services/dashboard_export_service.py backend/tests/test_dashboard_export.py && git commit -m "feat: add dashboard export datasets"`

## Task 2: Expose the authenticated export endpoint

**Files:**
- Modify: `backend/app/api/statistics.py`
- Modify: `backend/tests/test_dashboard_export.py`

**Interfaces:**
- Consumes `get_dashboard_export_datasets` and `render_dashboard_export` from Task 1。
- Produces `GET /api/statistics/dashboard/export?format=csv|xlsx&dataset=[optional]`。

- [ ] **Step 1: Write failing route tests**

通过 FastAPI `TestClient` 或现有依赖覆盖验证：

```python
def test_student_can_download_xlsx_with_attachment_headers(client, student_token):
    response = client.get(
        "/api/statistics/dashboard/export?format=xlsx",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response.status_code == 200
    assert response.headers["content-disposition"].startswith("attachment;")
    assert response.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

def test_student_cannot_request_teacher_dataset(client, student_token):
    response = client.get(
        "/api/statistics/dashboard/export?format=csv&dataset=pending_grading",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response.status_code == 400
```

- [ ] **Step 2: Run route tests to verify failure**

Run: `cd backend; uv run pytest tests/test_dashboard_export.py -q`

Expected: FAIL because the export route is not registered。

- [ ] **Step 3: Implement route and binary response**

在 `statistics.py` 中增加 `Literal["csv", "xlsx"]` 参数、认证依赖和 `StreamingResponse`。路由不得读取客户端用户 ID；调用服务返回的 media type 和安全文件名写入 `Content-Disposition`，内容通过 `io.BytesIO` 发送。无效 format/dataset 转换为 400，不泄露 SQL 或用户信息。

- [ ] **Step 4: Run route and regression tests**

Run: `cd backend; uv run pytest -q`

Expected: all existing backend tests and export route tests PASS。

- [ ] **Step 5: Commit**

Run: `git add backend/app/api/statistics.py backend/tests/test_dashboard_export.py && git commit -m "feat: expose dashboard export endpoint"`

## Task 3: Add ECharts dependency, reusable container, and option builders

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/src/components/EChart/index.tsx`
- Create: `frontend/src/components/EChart/index.test.tsx`
- Create: `frontend/src/pages/Dashboard/chartOptions.ts`
- Create: `frontend/src/pages/Dashboard/chartOptions.test.ts`

**Interfaces:**
- Produces `EChart({ option, className?, ariaLabel? }: { option: echarts.EChartsOption; className?: string; ariaLabel: string })`。
- Produces `buildStudentScoreOption(data: StudentDashboardData): EChartsOption`、`buildStudentPassRateOption(data: StudentDashboardData): EChartsOption`、`buildTeacherPendingOption(data: TeacherDashboardData): EChartsOption`、`buildTeacherRecentExamOption(data: TeacherDashboardData): EChartsOption`、`buildAdminRoleOption(data: AdminDashboardData): EChartsOption`。

- [ ] **Step 1: Install ECharts and write failing tests**

Run: `cd frontend; npm install echarts@^5.6.0`

先为 option builder 写断言，例如学生成绩 option 的 x 轴包含 `exam_title`，两个 series 分别包含 `score` 和 `pass_score`；空数组返回带 `noData` 标记的 option。为容器测试 mock `echarts.init`、`setOption`、`resize`、`dispose`，验证 unmount 调用 `dispose`。

- [ ] **Step 2: Run focused tests to verify failure**

Run: `cd frontend; npm test -- --runInBand --watchAll=false src/pages/Dashboard/chartOptions.test.ts src/components/EChart/index.test.tsx`

Expected: FAIL because the component and option builders do not exist。

- [ ] **Step 3: Implement EChart lifecycle**

使用 `useRef<HTMLDivElement>` 和 `useEffect`：挂载时 `echarts.init(element)`，option 或尺寸变化时调用 `setOption(option, true)`，用 `ResizeObserver` 调用 `resize`，清理时 disconnect observer 并调用 `dispose`。容器设置 `role="img"` 和传入的中文 `aria-label`。

- [ ] **Step 4: Implement role option builders**

图表只读取现有字段：学生成绩/及格线使用 `recent_records`，通过率将 `stats.pass_rate` 与剩余百分比组成环形图；教师待批改使用 `pending_grading`，最近考试使用 `recent_exams` 的时间排序；管理员角色分布使用 `role_distribution`。空数组返回空 series，页面通过数据长度判断并显示现有 `EmptyState`，不创建虚假数据或依赖不存在的 ECharts `noData` 配置。

- [ ] **Step 5: Run focused tests and commit**

Run: `cd frontend; npm test -- --runInBand --watchAll=false src/pages/Dashboard/chartOptions.test.ts src/components/EChart/index.test.tsx`

Expected: all option and lifecycle tests PASS。

Commit: `git add frontend/package.json frontend/package-lock.json frontend/src/components/EChart frontend/src/pages/Dashboard/chartOptions.ts frontend/src/pages/Dashboard/chartOptions.test.ts && git commit -m "feat: add dashboard chart primitives"`

## Task 4: Integrate charts and role-aware export controls

**Files:**
- Modify: `frontend/src/api/statistics.ts`
- Create: `frontend/src/utils/dashboardExport.ts`
- Modify: `frontend/src/pages/Dashboard/index.tsx`
- Modify: `frontend/src/pages/Dashboard/index.css`
- Modify: `frontend/src/pages/Dashboard/index.test.tsx`
- Create: `frontend/src/utils/dashboardExport.test.ts`

**Interfaces:**
- Produces `exportDashboard(format: 'csv' | 'xlsx', dataset?: string): Promise<AxiosResponse<Blob>>`。
- Produces `downloadDashboardFile(response: Blob | AxiosResponse<Blob>, fallbackName: string): void`。

- [ ] **Step 1: Write failing API/download tests**

验证 `exportDashboard('xlsx')` 使用 `responseType: 'blob'`，`downloadDashboardFile` 读取 `Content-Disposition` 或使用 `fallbackName`，并释放 `URL.createObjectURL`。扩展 `Dashboard` 测试，mock `getDashboard` 和 `exportDashboard`，确认学生、教师、管理员各自有导出菜单。

- [ ] **Step 2: Run focused tests to verify failure**

Run: `cd frontend; npm test -- --runInBand --watchAll=false src/utils/dashboardExport.test.ts src/pages/Dashboard/index.test.tsx`

Expected: FAIL because export API, download utility, charts, and menu are not integrated。

- [ ] **Step 3: Implement API and download utility**

在 `statistics.ts` 中使用 `axios.get('/api/statistics/dashboard/export', { params, responseType: 'blob' })`；下载工具用 `window.URL.createObjectURL`、临时 `<a>`、点击和 finally 清理 URL/节点。文件名只保留字母、数字、中文、点、下划线和短横线。

- [ ] **Step 4: Integrate role branches and export menu**

在现有 `isStudent`/`isTeacher`/admin 分支中插入 EChart；导出菜单提供 Excel 全量下载和 CSV 概览下载。点击时设置独立的 loading 状态，成功后调用下载工具，失败调用 `message.error('导出仪表盘数据失败')`。使用 `DownloadOutlined`、`FileExcelOutlined`、`FileTextOutlined`，为仅图标按钮补充 tooltip。

- [ ] **Step 5: Add responsive chart styles and empty states**

在 `index.css` 增加 `.dashboard-charts` 网格和 `.dashboard-chart` 固定 `min-height: 280px`，移动端变为单列。数据为空时使用 `EmptyState`，不让图表容器尺寸跳动。

- [ ] **Step 6: Run frontend tests and commit**

Run: `cd frontend; npm test -- --runInBand --watchAll=false src/utils/dashboardExport.test.ts src/pages/Dashboard/index.test.tsx`

Expected: all focused frontend tests PASS。

Commit: `git add frontend/src/api/statistics.ts frontend/src/utils/dashboardExport.ts frontend/src/utils/dashboardExport.test.ts frontend/src/pages/Dashboard/index.tsx frontend/src/pages/Dashboard/index.css frontend/src/pages/Dashboard/index.test.tsx && git commit -m "feat: add dashboard charts and export controls"`

## Task 5: Full verification and handoff

**Files:**
- Modify only if verification exposes a defect: the files from Tasks 1-4。

- [ ] **Step 1: Run backend suite**

Run: `cd backend; uv run pytest -q`

Expected: exit code 0 and all tests PASS。

- [ ] **Step 2: Run frontend suite**

Run: `cd frontend; npm test -- --runInBand --watchAll=false`

Expected: exit code 0 and all tests PASS。

- [ ] **Step 3: Build frontend**

Run: `cd frontend; npm run build`

Expected: production build completes without TypeScript or ECharts bundling errors。

- [ ] **Step 4: Manual role verification**

With the backend and frontend running, log in as seeded student, teacher, and admin accounts. Verify each role sees only its chart set, Excel downloads all permitted sheets, CSV download has UTF-8 Chinese headers, and a student request for `dataset=pending_grading` returns 400.

- [ ] **Step 5: Review final diff and commit verification fixes**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors; only intended feature files are changed, while pre-existing `frontend/package-lock.json`/`.codegraph/` changes remain understood and unaltered。
