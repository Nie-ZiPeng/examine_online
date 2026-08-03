# 创建考试页题目管理 + 列表页模板下载 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建考试后在同一页面原地展开"题目管理"（添加/导入/下载模板），并在考试列表页新增带说明文字的模板下载入口。

**Architecture:** 前端改动，后端零改动。创建成功后用 `navigate('/exams/{id}/edit', { replace: true })` 原地切换路由（React Router 复用 `<ExamEdit />` 组件实例，`useParams` 更新后 `isNew` 变 false，"题目管理"卡片自动出现）。下载逻辑抽取为共享工具 `frontend/src/utils/templateDownload.ts`，供 ImportModal 与 ExamManage 复用。

**Tech Stack:** React 19 / react-router-dom 7 / Ant Design 6 / TypeScript / react-scripts (CRA) + Jest

## Global Constraints

- 后端接口与数据库**零改动**。
- 下载文件名固定：excel → `question_import_template.xlsx`，word → `question_import_template.docx`。
- 说明文案固定：`模板说明：按模板填写题目后，可在考试编辑页『导入题目』中上传，支持 .xlsx / .docx 批量导入五种题型。`
- 现有 ImportModal 内的"下载模板"按钮保留，仅改为复用共享工具。
- 提交信息风格沿用仓库惯例（feat:/refactor:）。

---

## 文件结构

- **创建** `frontend/src/utils/templateDownload.ts` — 共享下载工具：`downloadTemplateFile(format)` 封装 Blob 下载。
- **创建** `frontend/src/utils/templateDownload.test.ts` — 该工具的 Jest 测试。
- **修改** `frontend/src/pages/Teacher/ExamEdit/index.tsx:112-116` — 创建成功后原地展开题目管理。
- **修改** `frontend/src/pages/Teacher/ExamManage/index.tsx` — 新增"下载模板"下拉按钮 + 说明文字。
- **修改** `frontend/src/components/ImportModal/index.tsx:23-39` — `handleDownloadTemplate` 改用共享工具。

---

### Task 1: 共享模板下载工具函数

**Files:**
- Create: `frontend/src/utils/templateDownload.ts`
- Test: `frontend/src/utils/templateDownload.test.ts`

**Interfaces:**
- Consumes: `downloadTemplate(format: 'excel' | 'word')`（已存在于 `frontend/src/api/exams.ts:59`，返回 axios Promise，`res.data` 为 Blob）
- Produces: `downloadTemplateFile(format: 'excel' | 'word'): Promise<void>` — 下载失败时 reject，成功时触发浏览器下载

- [ ] **Step 1: 写失败测试**

创建 `frontend/src/utils/templateDownload.test.ts`：

```ts
import { downloadTemplateFile } from './templateDownload';
import { downloadTemplate } from '../api/exams';

jest.mock('../api/exams', () => ({
  downloadTemplate: jest.fn(),
}));

const mockDownloadTemplate = downloadTemplate as jest.Mock;

describe('downloadTemplateFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.URL.createObjectURL = jest.fn(() => 'blob:mock');
    window.URL.revokeObjectURL = jest.fn();
    document.body.innerHTML = '';
  });

  it('下载 excel 模板且文件名为 .xlsx', async () => {
    mockDownloadTemplate.mockResolvedValue({ data: new Blob(['x']) });

    await downloadTemplateFile('excel');

    expect(downloadTemplate).toHaveBeenCalledWith('excel');
    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download="question_import_template.xlsx"]')).not.toBeNull();
  });

  it('下载 word 模板且文件名为 .docx', async () => {
    mockDownloadTemplate.mockResolvedValue({ data: new Blob(['x']) });

    await downloadTemplateFile('word');

    expect(document.querySelector('a[download="question_import_template.docx"]')).not.toBeNull();
  });

  it('点击后清理临时 a 标签与 object URL', async () => {
    mockDownloadTemplate.mockResolvedValue({ data: new Blob(['x']) });

    await downloadTemplateFile('excel');

    expect(document.querySelector('a[download="question_import_template.xlsx"]')).toBeNull();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  it('接口失败时向上抛出错误', async () => {
    mockDownloadTemplate.mockRejectedValue(new Error('network error'));

    await expect(downloadTemplateFile('excel')).rejects.toThrow('network error');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

运行（工作目录 `frontend`，Windows PowerShell）：
```powershell
$env:CI="true"; npm test -- --watchAll=false --testPathPattern=templateDownload
```
预期：FAIL，报 `Cannot find module './templateDownload'`。

- [ ] **Step 3: 实现工具函数**

创建 `frontend/src/utils/templateDownload.ts`：

```ts
import { downloadTemplate } from '../api/exams';

export const downloadTemplateFile = async (format: 'excel' | 'word'): Promise<void> => {
  const res = await downloadTemplate(format);
  const blob = res.data as Blob;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = format === 'excel' ? 'question_import_template.xlsx' : 'question_import_template.docx';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
```

- [ ] **Step 4: 运行测试确认通过**

```powershell
$env:CI="true"; npm test -- --watchAll=false --testPathPattern=templateDownload
```
预期：PASS（4 个用例）。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/utils/templateDownload.ts frontend/src/utils/templateDownload.test.ts
git commit -m "feat: 抽取模板下载共享工具函数"
```

---

### Task 2: 创建考试后原地展开题目管理

**Files:**
- Modify: `frontend/src/pages/Teacher/ExamEdit/index.tsx:112-116`

**Interfaces:**
- Consumes: `createExam`（`frontend/src/api/exams.ts:14`）、`useNavigate`（已 import）
- Produces: 无（行为变更：创建成功后 URL 变为 `/exams/{id}/edit`，页面原地显示"题目管理"卡片）

- [ ] **Step 1: 修改创建成功分支**

将 `frontend/src/pages/Teacher/ExamEdit/index.tsx` 的 `handleSaveExam` 中 isNew 分支：

```ts
      if (isNew) {
        const created = await createExam({ ...payload, course_id: values.course_id as number });
        message.success('考试创建成功');
        navigate(`/exams/${created.data.id}/edit`);
        return;
      }
```

改为：

```ts
      if (isNew) {
        const created = await createExam({ ...payload, course_id: values.course_id as number });
        message.success('考试创建成功，可继续添加题目');
        navigate(`/exams/${created.data.id}/edit`, { replace: true });
        return;
      }
```

- [ ] **Step 2: 构建验证**

```powershell
npm run build
```
预期：构建成功无类型错误。

- [ ] **Step 3: 手工验证（页面行为无现成组件测试，按仓库现状手工验证）**

1. 教师登录（seed_computer_teacher / Password123!）→ 考试管理 → 创建考试。
2. 填写基本信息（标题/课程/时间/时长等）→ 点"创建考试"。
3. 预期：页面**不跳转列表**，原地变为编辑态，出现"题目管理"卡片；URL 变为 `/exams/{id}/edit`。
4. 在"题目管理"中可：添加题目、点"导入题目"→ 弹窗内"下载模板"可下载 Excel/Word。
5. 刷新页面仍停留在该考试编辑页；返回列表可见该草稿考试。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/pages/Teacher/ExamEdit/index.tsx
git commit -m "feat: 创建考试后原地展开题目管理"
```

---

### Task 3: 考试列表页新增模板下载入口与说明

**Files:**
- Modify: `frontend/src/pages/Teacher/ExamManage/index.tsx`
- Test: `frontend/src/pages/Teacher/ExamManage/index.test.tsx`（新增）

**Interfaces:**
- Consumes: `downloadTemplateFile`（Task 1 产出）
- Produces: 无

- [ ] **Step 1: 写失败测试（入口存在性）**

创建 `frontend/src/pages/Teacher/ExamManage/index.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExamManage from './index';
import { getExams } from '../../../api/exams';
import type { ApiResponse, Paginated } from '../../../types/api';
import type { Exam } from '../../../types/exam';

jest.mock('../../../api/exams', () => ({
  getExams: jest.fn(),
  deleteExam: jest.fn(),
  publishExam: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const mockGetExams = getExams as jest.Mock;

const exam: Exam = {
  id: 1,
  course_id: 1,
  title: '测试考试',
  description: null,
  start_time: '2026-08-01 10:00:00',
  end_time: '2026-08-01 12:00:00',
  duration: 60,
  total_score: 100,
  pass_score: 60,
  random_order: true,
  max_switch: 3,
  status: 'draft',
  created_at: '2026-08-01 09:00:00',
};

describe('ExamManage', () => {
  beforeEach(() => {
    mockGetExams.mockResolvedValue({
      data: { items: [exam], total: 1, page: 1, page_size: 10 },
    } as ApiResponse<Paginated<Exam>>);
  });

  it('渲染下载模板按钮与说明文字', async () => {
    render(
      <MemoryRouter>
        <ExamManage />
      </MemoryRouter>
    );

    expect(await screen.findByText('下载模板')).not.toBeNull();
    expect(screen.getByText(/模板说明：按模板填写题目后/)).not.toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```powershell
$env:CI="true"; npm test -- --watchAll=false --testPathPattern=ExamManage
```
预期：FAIL，`Unable to find text "下载模板"`。

- [ ] **Step 3: 实现列表页入口**

修改 `frontend/src/pages/Teacher/ExamManage/index.tsx`：

1. 顶部 import 增加（在现有 import 基础上追加）：

```ts
import { Dropdown } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { downloadTemplateFile } from '../../../utils/templateDownload';
```

2. 组件内（`columns` 定义之前）新增：

```tsx
  const handleDownload = async (format: 'excel' | 'word') => {
    try {
      await downloadTemplateFile(format);
      message.success('模板下载成功');
    } catch (error) {
      message.error('模板下载失败');
    }
  };

  const templateMenuItems = [
    { key: 'excel', label: 'Excel 模板 (.xlsx)', onClick: () => handleDownload('excel') },
    { key: 'word', label: 'Word 模板 (.docx)', onClick: () => handleDownload('word') },
  ];
```

3. PageHeader 的 `extra` 改为 `Space` 包裹，并新增说明文字行：

```tsx
      <PageHeader
        title="考试管理"
        subtitle="创建、发布并维护考试"
        extra={
          <Space>
            <Dropdown menu={{ items: templateMenuItems }}>
              <Button icon={<DownloadOutlined />}>下载模板</Button>
            </Dropdown>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/exams/new')}>
              创建考试
            </Button>
          </Space>
        }
      />
      <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 16 }}>
        模板说明：按模板填写题目后，可在考试编辑页『导入题目』中上传，支持 .xlsx / .docx 批量导入五种题型。
      </div>
```

（`Space`、`Button`、`message` 已在现有 import 中。）

- [ ] **Step 4: 运行测试确认通过**

```powershell
$env:CI="true"; npm test -- --watchAll=false --testPathPattern=ExamManage
```
预期：PASS。

- [ ] **Step 5: 构建与手工验证**

```powershell
npm run build
```
预期：构建成功。手工：考试管理页右上角出现"下载模板"下拉（Excel/Word 均可下载），按钮下方灰色说明文字显示正常。

- [ ] **Step 6: 提交**

```bash
git add frontend/src/pages/Teacher/ExamManage/index.tsx frontend/src/pages/Teacher/ExamManage/index.test.tsx
git commit -m "feat: 考试列表页增加模板下载入口与说明"
```

---

### Task 4: ImportModal 复用共享下载工具

**Files:**
- Modify: `frontend/src/components/ImportModal/index.tsx:1-39`

**Interfaces:**
- Consumes: `downloadTemplateFile`（Task 1 产出）
- Produces: 无

- [ ] **Step 1: 重构 handleDownloadTemplate**

`frontend/src/components/ImportModal/index.tsx`：

1. 第 5 行 import 由：

```ts
import { downloadTemplate, importQuestionsFile } from '../../api/exams';
```

改为：

```ts
import { importQuestionsFile } from '../../api/exams';
import { downloadTemplateFile } from '../../utils/templateDownload';
```

2. `handleDownloadTemplate`（第 23-39 行）整体替换为：

```tsx
  const handleDownloadTemplate = async (format: 'excel' | 'word') => {
    try {
      await downloadTemplateFile(format);
      message.success('模板下载成功');
    } catch (error) {
      message.error('模板下载失败');
    }
  };
```

- [ ] **Step 2: 构建与测试验证**

```powershell
$env:CI="true"; npm test -- --watchAll=false
npm run build
```
预期：全部测试 PASS，构建成功。

- [ ] **Step 3: 手工验证**

考试编辑页 → 导入题目 → 弹窗 footer"下载模板"下拉仍可正常下载 Excel/Word 模板。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/components/ImportModal/index.tsx
git commit -m "refactor: ImportModal 复用模板下载共享工具"
```

---

## 自检

- Spec 覆盖：改动 1 → Task 2；改动 2 → Task 3；改动 3 → Task 1 + Task 4。验证项（build / 测试 / 手工）在各任务内。无遗漏。
- 无占位符：所有步骤含具体代码。
- 类型一致：`downloadTemplateFile(format: 'excel' | 'word'): Promise<void>` 在 Task 1 定义，Task 3/4 使用同一签名。
