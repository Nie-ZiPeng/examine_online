# 创建考试页题目管理 + 列表页模板下载设计

日期：2026-08-03
状态：已批准

## 背景

当前创建考试页面（`/exams/new`）只能填写考试基本信息，"题目管理"卡片仅在编辑已有考试（`/exams/:examId/edit`）时显示。教师创建考试后必须跳转编辑页才能添加/导入题目，体验割裂。此外，模板下载入口只藏在"导入题目"弹窗的 footer 里，不易发现。

## 目标

1. 创建考试后原地展开"题目管理"，无需跳转即可添加题目、导入题目、下载模板。
2. 考试列表页提供显眼的模板下载入口，并附一行说明文字。

## 方案

采用"创建后原地展开"（方案 A）：题目必须挂在已存在的 `exam_id` 下，因此先创建考试（草稿），再在**同一页面**继续管理题目。后端零改动。

### 改动 1：创建考试后原地展开题目管理

文件：`frontend/src/pages/Teacher/ExamEdit/index.tsx`

- `handleSaveExam` 创建成功分支：由 `navigate('/exams')` 改为 `navigate('/exams/${created.data.id}/edit', { replace: true })`。
- React Router 对同组件（`<ExamEdit />`）的两个路由会复用组件实例；路由切换后 `useParams` 返回新 `examId`，`isNew` 变为 false，`useEffect([examId, ...])` 触发 `fetchData` 重新加载该考试与题目列表。
- 结果：页面原地变为编辑态，"题目管理"卡片（添加题目 / 导入题目 / 下载模板）立即出现；URL 同步更新为 `/exams/:id/edit`，刷新与浏览器返回行为正常。

### 改动 2：考试列表页模板下载入口

文件：`frontend/src/pages/Teacher/ExamManage/index.tsx`

- PageHeader `extra` 中"创建考试"按钮旁新增"下载模板"下拉按钮，选项：Excel 模板 (.xlsx)、Word 模板 (.docx)，复用 `api/exams.ts` 的 `downloadTemplate`。
- 按钮下方新增一行灰色小字说明：
  > 模板说明：按模板填写题目后，可在考试编辑页『导入题目』中上传，支持 .xlsx / .docx 批量导入五种题型。

### 改动 3：抽取共享下载工具

新增：`frontend/src/utils/templateDownload.ts`

- 导出 `downloadTemplateFile(format: 'excel' | 'word')`，封装创建 Blob URL 并触发下载的逻辑。
- `ImportModal` 的 `handleDownloadTemplate` 与 `ExamManage` 的下载按钮共用该函数，消除重复代码。

## 不做的事

- 后端接口、数据库结构零改动。
- 不自动创建空草稿考试（方案 B 已否决）。
- 不移动/删除 ImportModal 内已有的"下载模板"按钮。

## 验证

1. `npm run build`（frontend）通过。
2. 前端现有测试通过。
3. 手工验证：
   - 教师登录 → 考试管理 → 创建考试 → 填基本信息 → 点"创建考试" → 页面原地出现"题目管理"，可添加题目、下载模板、导入题目。
   - 考试列表页"下载模板"可正常下载 .xlsx / .docx，说明文字显示正确。
   - 创建后刷新页面仍停留在该考试的编辑页。
