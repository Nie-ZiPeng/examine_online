# AI 主观题自动评分 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为文本简答题实现基于 PydanticAI 的异步自动评分，并允许教师审阅、改分和重试失败任务。

**Architecture:** 交卷只创建 MySQL 持久化评分任务。独立 Worker 原子领取任务，调用 OpenAI-compatible PydanticAI Agent，保存已校验的 AI 原始评分；若教师未改分则更新当前分数。阅卷抽屉展示分项依据和人工复核入口。

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 async, MySQL 8, Pydantic v2, PydanticAI, OpenAI SDK, pytest, React 19, TypeScript, Ant Design 6.

## Global Constraints

- 仅 `essay` 文本答案调用 AI；学生交卷不等待模型。
- 模型供应商只能由 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`、`AI_TIMEOUT_SECONDS`、`AI_MAX_RETRIES` 配置。
- Agent 使用 `output_type=AiGradingResult`；few-shot 只校准评分风格。
- 结果先过 PydanticAI/Pydantic 结构校验，再过真实 rubric 的业务校验。
- 关联 ID 均由服务端从任务补入；模型不得生成 `answer_id`、`question_id`、`record_id`。
- `grading_source=teacher` 时，AI 晚到结果只保存原始 AI 数据，绝不覆盖教师得分。
- 密钥不得进入前端、Git 或日志；任务错误信息脱敏。
- `Base.metadata.create_all()` 不会更新旧表，所有结构更新均提供可重复运行的 MySQL SQL。

## File Structure

- Modify: `backend/pyproject.toml`, `backend/.env.example`, `backend/app/config.py` - AI 依赖和配置。
- Create: `backend/sql/20260803_add_ai_subjective_grading.sql` - 可重复执行的 MySQL 迁移。
- Modify: `backend/app/models/question.py`, `backend/app/models/answer.py`, `backend/app/models/__init__.py` - rubric、AI 分数和模型注册。
- Create: `backend/app/models/ai_grading_task.py` - 任务队列模型。
- Modify: `backend/app/schemas/question.py`, `backend/app/schemas/answer.py` - API 请求与响应。
- Create: `backend/app/schemas/ai_grading.py` - Agent 输入/输出模型。
- Create: `backend/app/services/ai_grading_agent.py`, `backend/app/services/ai_grading_service.py` - Agent 与队列/业务逻辑。
- Create: `backend/app/workers/ai_grading_worker.py` - 独立 Worker CLI。
- Modify: `backend/app/services/exam_student_service.py`, `backend/app/services/grading_service.py`, `backend/app/api/grading.py` - 交卷、阅卷和授权。
- Create: `backend/tests/conftest.py`, `backend/tests/test_*.py` - 后端单元和集成测试。
- Modify: `frontend/src/types/question.ts`, `frontend/src/types/answer.ts`, `frontend/src/api/grading.ts` - 前端类型和请求。
- Create: `frontend/src/pages/Teacher/ExamEdit/EssayRubricFields.tsx` - rubric 编辑器。
- Modify: `frontend/src/pages/Teacher/ExamEdit/index.tsx`, `frontend/src/pages/Teacher/Grading/GradingDrawer.tsx` - 教师配置及审核 UI。
- Create: `frontend/src/pages/Teacher/**/**.test.tsx` - 关键交互测试。

---

### Task 1: 配置、依赖与数据库迁移

**Files:**
- Modify: `backend/pyproject.toml`
- Modify: `backend/.env.example`
- Modify: `backend/app/config.py`
- Create: `backend/sql/20260803_add_ai_subjective_grading.sql`
- Create: `backend/tests/test_config.py`

**Interfaces:** Produces `Settings.AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_SECONDS=60`, `AI_MAX_RETRIES=2`, `AI_WORKER_POLL_SECONDS=1.0`.

- [ ] **Step 1: Write the failing test**

```python
def test_ai_settings_use_safe_defaults():
    settings = Settings(_env_file=None, DATABASE_URL="sqlite+aiosqlite://", REDIS_URL="redis://x", JWT_SECRET_KEY="x")
    assert settings.AI_BASE_URL is None
    assert settings.AI_TIMEOUT_SECONDS == 60
    assert settings.AI_MAX_RETRIES == 2
```

- [ ] **Step 2: Verify failure**

Run: `cd backend && uv run pytest tests/test_config.py -q`

Expected: FAIL because AI settings do not exist.

- [ ] **Step 3: Implement configuration and migration**

Add `pydantic-ai`, `openai`, `pytest`, `pytest-asyncio`, and `aiosqlite` to `pyproject.toml`; add the six safe environment variables to `.env.example` and `Settings`.

Create SQL using `information_schema.COLUMNS` checks and dynamic `ALTER TABLE` statements to add `questions.grading_rubric`, all required `answers.ai_*` and manual-override fields, plus `ai_grading_tasks`. The task table uses InnoDB, `DATETIME(6)`, `status ENUM('pending','processing','completed','failed')`, `UNIQUE(answer_id)`, `INDEX(status, available_at)`, and `answer_id REFERENCES answers(id) ON DELETE CASCADE`.

- [ ] **Step 4: Verify and commit**

Run: `cd backend && uv sync && uv run pytest tests/test_config.py -q`

Expected: `1 passed`.

Run:

```bash
git add backend/pyproject.toml backend/uv.lock backend/.env.example backend/app/config.py backend/sql/20260803_add_ai_subjective_grading.sql backend/tests/test_config.py
git commit -m "chore: add AI grading configuration"
```

### Task 2: 数据模型、schema 与 rubric 校验

**Files:**
- Modify: `backend/app/models/question.py`, `backend/app/models/answer.py`, `backend/app/models/__init__.py`
- Create: `backend/app/models/ai_grading_task.py`
- Modify: `backend/app/schemas/question.py`, `backend/app/schemas/answer.py`
- Create: `backend/app/schemas/ai_grading.py`, `backend/tests/test_question_rubric.py`

**Interfaces:** Produces `RubricItem`, `CriterionResult`, `AiGradingResult`, and `AiGradingTask`.

- [ ] **Step 1: Write failing schema tests**

```python
def test_essay_rubric_must_match_question_score():
    with pytest.raises(ValidationError, match="评分要点总分"):
        QuestionCreate(type="essay", content="解释 OOP", answer="...", score=10,
            grading_rubric=[{"criterion_id": "a", "criterion": "封装", "points": 6}, {"criterion_id": "b", "criterion": "继承", "points": 3}])

def test_non_essay_question_rejects_rubric():
    with pytest.raises(ValidationError, match="仅简答题"):
        QuestionCreate(type="single", content="x", answer="A", score=1, grading_rubric=[])
```

- [ ] **Step 2: Verify failure**

Run: `cd backend && uv run pytest tests/test_question_rubric.py -q`

Expected: FAIL because `grading_rubric` is unsupported.

- [ ] **Step 3: Implement models and contracts**

Use SQLAlchemy `JSON` for `grading_rubric`/`ai_feedback`, `String(128)` for `ai_model`, date fields for AI timestamps, and `grading_source` valid values `pending|ai|teacher|failed`. Add task attempts, locks, availability, sanitized error and timestamps. Register task model in `models.__init__`.

Add `grading_rubric: list[RubricItem] | None` to `QuestionBase`; a `model_validator(mode="after")` rejects non-essay rubrics, duplicate IDs, negative points, and a total that differs from `score`. Add `analysis` to `QuestionUpdate`. Add `override_reason` to `GradeRequest` plus response `ai_grading` fields.

```python
class CriterionResult(BaseModel):
    criterion_id: str
    score: Annotated[int, Field(ge=0)]
    reason: Annotated[str, Field(min_length=1, max_length=300)]

class AiGradingResult(BaseModel):
    score: Annotated[int, Field(ge=0)]
    reasoning: Annotated[str, Field(min_length=1, max_length=500)]
    criterion_results: list[CriterionResult]
    confidence: Annotated[float, Field(ge=0, le=1)]
```

- [ ] **Step 4: Verify and commit**

Run: `cd backend && uv run pytest tests/test_question_rubric.py -q && uv run python -m compileall -q app`

Expected: tests pass and compilation exits `0`.

Run:

```bash
git add backend/app/models backend/app/schemas backend/tests/test_question_rubric.py
git commit -m "feat: add AI grading data contracts"
```

### Task 3: PydanticAI Agent 与评分业务校验

**Files:**
- Create: `backend/app/services/ai_grading_agent.py`
- Create: `backend/app/services/ai_grading_service.py`
- Create: `backend/tests/test_ai_grading_validation.py`

**Interfaces:** Produces `build_grading_agent() -> Agent[None, AiGradingResult]`, `grade_essay(input: AiGradingInput) -> AiGradingResult`, and `validate_grading_result(result, rubric, question_score) -> None`.

- [ ] **Step 1: Write failing validation tests**

```python
def test_result_requires_each_rubric_item_once():
    rubric = [RubricItem(criterion_id="a", criterion="A", points=5)]
    result = AiGradingResult(score=5, reasoning="ok", criterion_results=[], confidence=0.8)
    with pytest.raises(ValueError, match="评分要点"):
        validate_grading_result(result, rubric, 5)

def test_result_rejects_total_different_from_items():
    result = AiGradingResult.model_validate({"score": 4, "reasoning": "ok", "confidence": 0.8,
        "criterion_results": [{"criterion_id": "default", "score": 3, "reason": "部分正确"}]})
    with pytest.raises(ValueError, match="总分"):
        validate_grading_result(result, None, 5)
```

- [ ] **Step 2: Verify failure**

Run: `cd backend && uv run pytest tests/test_ai_grading_validation.py -q`

Expected: FAIL because the validation module does not exist.

- [ ] **Step 3: Implement structured agent**

Reject absent `AI_BASE_URL`, `AI_API_KEY`, or `AI_MODEL` before provider invocation. Construct `AsyncOpenAI(base_url=settings.AI_BASE_URL, api_key=settings.AI_API_KEY, timeout=settings.AI_TIMEOUT_SECONDS)`, then PydanticAI `OpenAIProvider` and `OpenAIChatModel`. Set `output_type=AiGradingResult` and `retries=settings.AI_MAX_RETRIES`.

Build the prompt from trusted question content, score, reference answer, analysis, rubric and student answer. Keep user-controlled text out of system instructions. Add at most two few-shot examples with exactly `AiGradingResult` fields to stabilize scoring style. Do not use `json.loads`; return `agent.run(...).output`.

- [ ] **Step 4: Implement business validation**

For a rubric: require an exact non-duplicated ID set, each result score no higher than the matching configured points, and `result.score == sum(item.score)`. Without rubric: require exactly one `criterion_id == "default"`, bounded by question score, with the same total rule. Errors must be short and must not include student answers.

- [ ] **Step 5: Verify and commit**

Run: `cd backend && uv run pytest tests/test_ai_grading_validation.py -q && uv run python -m compileall -q app`

Expected: all tests pass and compilation exits `0`.

Run:

```bash
git add backend/app/services/ai_grading_agent.py backend/app/services/ai_grading_service.py backend/tests/test_ai_grading_validation.py
git commit -m "feat: add structured AI grading agent"
```

### Task 4: 持久化任务队列与 Worker

**Files:**
- Modify: `backend/app/services/ai_grading_service.py`
- Create: `backend/app/workers/__init__.py`, `backend/app/workers/ai_grading_worker.py`
- Create: `backend/tests/conftest.py`, `backend/tests/test_ai_grading_service.py`

**Interfaces:** Produces `enqueue_ai_grading_task`, `claim_next_ai_grading_task`, `complete_ai_grading_task`, `fail_ai_grading_task`, and CLI `uv run python -m app.workers.ai_grading_worker`.

- [ ] **Step 1: Write failing lifecycle tests**

```python
@pytest.mark.asyncio
async def test_claiming_task_is_atomic_and_idempotent(db_session, answer):
    first = await enqueue_ai_grading_task(db_session, answer.id)
    second = await enqueue_ai_grading_task(db_session, answer.id)
    assert first.id == second.id
    claimed = await claim_next_ai_grading_task(db_session, "worker-a", datetime.now())
    assert claimed.status == "processing"
    assert await claim_next_ai_grading_task(db_session, "worker-b", datetime.now()) is None

@pytest.mark.asyncio
async def test_ai_completion_never_overwrites_teacher_score(db_session, teacher_overridden_answer, valid_result):
    task = await enqueue_ai_grading_task(db_session, teacher_overridden_answer.id)
    await complete_ai_grading_task(db_session, task.id, valid_result, "test-model")
    await db_session.refresh(teacher_overridden_answer)
    assert teacher_overridden_answer.score == 9
    assert teacher_overridden_answer.ai_score == valid_result.score
    assert teacher_overridden_answer.grading_source == "teacher"
```

- [ ] **Step 2: Verify failure**

Run: `cd backend && uv run pytest tests/test_ai_grading_service.py -q`

Expected: FAIL because queue operations do not exist.

- [ ] **Step 3: Implement transactional task operations**

Insert a task inside a transaction and handle the unique-key conflict by returning the existing task. Claim one ready task with MySQL `SELECT ... FOR UPDATE SKIP LOCKED`, transition it to `processing`, increment attempts and set locks. Provide SQLite testing fallback in the test fixture.

Completion saves `ai_score`, `ai_feedback=result.model_dump()`, model name, AI timestamp and task metadata. It updates `answers.score` and `grading_source='ai'` only when prior source is `pending` or `ai`, then recalculates the record score in that transaction. Failure truncates/sanitizes errors, backs off by `2 ** attempt_count` seconds, and after `max_attempts` marks task and answer `failed` without changing score.

- [ ] **Step 4: Implement Worker loop**

Generate a stable worker ID; claim task; load `Answer -> Question -> ExamRecord`; reject inconsistent/non-essay task; call `grade_essay`, then `validate_grading_result`, then complete/fail. When idle, use `await asyncio.sleep(settings.AI_WORKER_POLL_SECONDS)`. Stop cleanly on `KeyboardInterrupt`; never log keys or complete answers.

- [ ] **Step 5: Verify and commit**

Run: `cd backend && uv run pytest tests/test_ai_grading_service.py -q`

Expected: all lifecycle tests pass.

Run:

```bash
git add backend/app/services/ai_grading_service.py backend/app/workers backend/tests/conftest.py backend/tests/test_ai_grading_service.py
git commit -m "feat: add persistent AI grading worker"
```

### Task 5: 交卷、阅卷 API 与权限接入

**Files:**
- Modify: `backend/app/services/exam_student_service.py`, `backend/app/services/grading_service.py`, `backend/app/api/grading.py`
- Create: `backend/tests/test_exam_submission_ai_tasks.py`

**Interfaces:** `submit_exam` creates pending tasks; `get_record_answers` returns `ai_grading`; `grade_answer(..., override_reason)` honors teacher priority; `retry_ai_grading` requires course ownership or admin.

- [ ] **Step 1: Write failing submission and authorization tests**

```python
@pytest.mark.asyncio
async def test_submit_exam_creates_one_pending_task_per_essay(db_session, student, published_exam_with_essay):
    record, error = await submit_exam(db_session, published_exam_with_essay.id, student.id, {"1": "学生答案"})
    assert error is None
    tasks = (await db_session.execute(select(AiGradingTask))).scalars().all()
    assert len(tasks) == 1
    assert tasks[0].status == "pending"

@pytest.mark.asyncio
async def test_other_teacher_cannot_retry_answer(db_session, other_teacher, answer):
    with pytest.raises(HTTPException, match="无权限"):
        await retry_ai_grading(answer.id, db_session, other_teacher)
```

- [ ] **Step 2: Verify failure**

Run: `cd backend && uv run pytest tests/test_exam_submission_ai_tasks.py -q`

Expected: FAIL because no task is created and retry endpoint does not exist.

- [ ] **Step 3: Implement submission and grading routes**

After creating/flushing each essay `Answer`, set `grading_source='pending'` and enqueue its task before the final commit. Do not call the Agent or FastAPI background task from submission.

Return an `ai_grading` object containing only server-provided IDs, task status, current source, AI details and sanitized failure summary. Validate manual score against question maximum. If an essay with `ai_score` has a changed score, require trimmed non-empty `override_reason`, persist human fields and set source `teacher`.

Implement `POST /api/answers/{answer_id}/ai-grading/retry`: only reset `failed` tasks, clear locks/error, set pending and change failed answer source to pending. Add `assert_can_grade_answer` by joining Answer -> ExamRecord -> Exam -> Course; allow admin or the owning `course.teacher_id`; use it on answer list, grade, finalize and retry.

- [ ] **Step 4: Verify and commit**

Run: `cd backend && uv run pytest tests/test_exam_submission_ai_tasks.py tests/test_ai_grading_service.py -q && uv run python -m compileall -q app`

Expected: tests pass and compilation exits `0`.

Run:

```bash
git add backend/app/services/exam_student_service.py backend/app/services/grading_service.py backend/app/api/grading.py backend/tests/test_exam_submission_ai_tasks.py
git commit -m "feat: enqueue and review AI essay grading"
```

### Task 6: 教师出题页的评分要点编辑器

**Files:**
- Modify: `frontend/src/types/question.ts`, `frontend/src/pages/Teacher/ExamEdit/index.tsx`
- Create: `frontend/src/pages/Teacher/ExamEdit/EssayRubricFields.tsx`, `frontend/src/pages/Teacher/ExamEdit/EssayRubricFields.test.tsx`

**Interfaces:** Produces `RubricItem { criterion_id: string; criterion: string; points: number }`, optional `QuestionInput.grading_rubric`, and `EssayRubricFields({ totalScore })`.

- [ ] **Step 1: Write failing component test**

```tsx
it('blocks submission when rubric points do not equal the question score', async () => {
  render(<QuestionModalWithEssayRubric initialScore={10} />);
  await userEvent.type(screen.getByLabelText('评分要点'), '解释封装');
  await userEvent.click(screen.getByRole('button', { name: '添加题目' }));
  expect(await screen.findByText('评分要点总分必须等于题目分值')).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify failure**

Run: `cd frontend && set CI=true && npm test -- --runInBand EssayRubricFields.test.tsx`

Expected: FAIL because the rubric component does not exist.

- [ ] **Step 3: Implement types and compact form list**

For `essay`, render a `Form.List` for criterion text and integer points. Assign an ID with `crypto.randomUUID()` when adding. Display running sum; when any item exists it must equal question score. Rubric remains optional, reference answer remains required, and only essay requests include `grading_rubric`.

- [ ] **Step 4: Verify and commit**

Run: `cd frontend && set CI=true && npm test -- --runInBand EssayRubricFields.test.tsx && npm run build`

Expected: focused test passes and production build exits `0`.

Run:

```bash
git add frontend/src/types/question.ts frontend/src/pages/Teacher/ExamEdit
git commit -m "feat: configure essay grading rubrics"
```

### Task 7: 阅卷抽屉的 AI 审核与重试

**Files:**
- Modify: `frontend/src/types/answer.ts`, `frontend/src/api/grading.ts`, `frontend/src/pages/Teacher/Grading/GradingDrawer.tsx`
- Create: `frontend/src/pages/Teacher/Grading/GradingDrawer.test.tsx`

**Interfaces:** `AiGrading` includes status, scores, feedback, model, timestamps, error and the three server-provided IDs. `gradeAnswer` sends optional `override_reason`; `retryAiGrading(answerId)` calls retry API.

- [ ] **Step 1: Write failing drawer tests**

```tsx
it('renders criterion AI grading and requires reason when changing AI score', async () => {
  mockGetRecordAnswers.mockResolvedValue(aiGradedResponse);
  render(<GradingDrawer record={record} open onClose={jest.fn()} />);
  expect(await screen.findByText('AI 评分依据')).toBeInTheDocument();
  await userEvent.clear(screen.getByLabelText('得分'));
  await userEvent.type(screen.getByLabelText('得分'), '12');
  await userEvent.click(screen.getByRole('button', { name: '保存' }));
  expect(await screen.findByText('请填写修改原因')).toBeInTheDocument();
});

it('shows retry only for failed AI grading', async () => {
  mockGetRecordAnswers.mockResolvedValue(failedAiGradingResponse);
  render(<GradingDrawer record={record} open onClose={jest.fn()} />);
  expect(await screen.findByRole('button', { name: '重新 AI 评分' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify failure**

Run: `cd frontend && set CI=true && npm test -- --runInBand GradingDrawer.test.tsx`

Expected: FAIL because AI result UI and retry do not exist.

- [ ] **Step 3: Implement types, API and UI**

Add an `AI 评分依据` Collapse/Descriptions section: status tag, AI score, confidence, model, reasoning, and a compact criterion/max/AI-score/reason list. Never show raw prompt/API error. Pending/processing shows loading state; failed shows sanitized summary plus disabled-while-running `重新 AI 评分`, then refreshes after success.

Keep current score editable. When an essay sourced from AI changes score, show required inline `Input.TextArea` named `修改原因`; block saving until non-empty and submit as `override_reason`. After saving show `教师已复核`, retaining collapsible AI evidence.

- [ ] **Step 4: Verify and commit**

Run: `cd frontend && set CI=true && npm test -- --runInBand GradingDrawer.test.tsx && npm run build`

Expected: tests pass and production build exits `0`.

Run:

```bash
git add frontend/src/types/answer.ts frontend/src/api/grading.ts frontend/src/pages/Teacher/Grading/GradingDrawer.tsx frontend/src/pages/Teacher/Grading/GradingDrawer.test.tsx
git commit -m "feat: review AI essay grading in drawer"
```

### Task 8: 运行说明和完整验证

**Files:**
- Modify: `backend/README.md`, `README.md`

**Interfaces:** Documents migration, AI settings and the required separate Worker command.

- [ ] **Step 1: Document operations**

Add this exact command form without real credentials:

```bash
cd backend
mysql -u <user> -p <database> < sql/20260803_add_ai_subjective_grading.sql
uv run python -m app.workers.ai_grading_worker
```

State that the Worker is a separate process, student submission does not wait for it, and a failed AI task can be retried from teacher grading.

- [ ] **Step 2: Run all backend verification**

Run: `cd backend && uv run pytest -q && uv run python -m compileall -q app`

Expected: all backend tests pass; compilation exits `0`.

- [ ] **Step 3: Run all frontend verification**

Run: `cd frontend && set CI=true && npm test -- --watchAll=false --runInBand && npm run build`

Expected: all tests pass and build exits `0`.

- [ ] **Step 4: Inspect diff and commit documentation**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and only intended changes.

Run:

```bash
git add backend/README.md README.md
git commit -m "docs: explain AI grading worker operation"
```

## Plan Self-Review

- Spec coverage: Tasks 1-2 handle config, migration, persistence and rubric contracts; Task 3 implements PydanticAI structured output and few-shot boundaries; Task 4 implements durable queue/retry; Task 5 covers submission, APIs, authorization and teacher precedence; Tasks 6-7 implement teacher configuration and audit workflow; Task 8 documents and verifies the completed system.
- Completeness scan: every task names exact files, interfaces, test commands, expected result and commit scope; there are no unresolved implementation items.
- Type consistency: `RubricItem`, `AiGradingResult`, `AiGradingTask`, `grading_source`, `override_reason`, and queue operation names are defined before later tasks consume them.
