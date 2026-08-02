# 在线考试系统前端界面重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对在线考试系统前端做全面视觉重构：莫兰迪蓝配色 + 深色侧边栏 + 白色内容区 + 丰富动效，在保持现有功能不变的前提下让界面专业美观、炫技于细节。

**Architecture:** 前端基于 React 19 + antd 6.5 + CRA 5.0.1。核心策略是「设计令牌（CSS 变量）+ antd ConfigProvider 主题 + Tailwind v3 工具类 + 共享组件（PageHeader/PageCard/PageTransition）」。全局主题统一配色与圆角/阴影，共享组件统一页面骨架，每个页面做轻量改造。动效层用纯 CSS 动画 + 路由 key 重挂载实现页面过渡，不引入额外依赖。

**Tech Stack:** React 19.2, antd 6.5.3, @ant-design/icons 6, react-router-dom 7, tailwindcss ^3.4 (CRA 自动检测 `tailwind.config.js` 注入 postcss 插件), zustand, axios

> **关于 Tailwind 的使用策略：** 本计划启用 Tailwind v3 作为 CSS 基础设施（CRA 检测 `tailwind.config.js` 后自动注入插件，`tailwind.config.js` 定义了项目配色/圆角/阴影/字体的扩展，方便后续维护与复用工具类）。本次改造的页面样式主体用 **CSS 变量 + antd 全局主题** 实现（与共享组件 CSS 一致），Tailwind 工具类可作为补充手段按需使用，不强求每行样式都用 Tailwind。

## Global Constraints

- 前端 `cd frontend; npm start`（开发），`npm run build`（编译校验，react-scripts 5.0.1）
- **Tailwind 必须用 v3（^3.4）**：CRA 5.0.1 的 `webpack.config.js:72-74` 检测到 `tailwind.config.js` 即注入 `'tailwindcss'` postcss 插件（`webpack.config.js:162`）。装 v4 会因 postcss 插件入口变化导致构建失败
- **必须禁用 Tailwind preflight**：在 `tailwind.config.js` 设 `corePlugins: { preflight: false }`，否则 Tailwind 基础重置会覆盖 antd 组件样式
- antd 主题在 `App.js` 的 `ConfigProvider` 中通过 `theme.token`（seed token）与 `theme.components`（组件 token）定制；seed token 名称以 antd v6 `node_modules/antd/lib/theme/interface/seeds.d.ts` 为准
- 设计令牌以 CSS 变量定义在 `src/index.css` 的 `:root`，颜色值与设计文档一致（primary `#3D5A80`、sidebar `#1A2332`、bg `#F0F2F5`、ink `#1A2332` 等）
- 共享组件新增到 `frontend/src/components/` 下（PageHeader / PageCard / PageTransition / ExamLayout 等），各自带 `index.js` + `index.css`
- 每个 Task 完成后必须 commit；仅提交本任务相关文件
- 不动任何业务逻辑（API 调用、状态管理、路由规则均保持原样），只改样式与结构

---

## Task 1: 安装 Tailwind v3 并生成配置

**Files:**
- Modify: `frontend/package.json`（npm install 自动更新）
- Create: `frontend/tailwind.config.js`

**Interfaces:**
- Produces: `tailwind.config.js`，定义项目配色/圆角/阴影/字体扩展（`theme.extend`），供所有后续 Task 使用 Tailwind 工具类

- [ ] **Step 1: 安装 tailwindcss v3**

```powershell
cd frontend
npm install -D tailwindcss@^3.4.0
```

Expected: `node_modules/tailwindcss` 版本为 3.4.x。注意 **不能** 装 4.x（CRA 注入的 `tailwindcss` postcss 插件入口在 v4 不存在）。

- [ ] **Step 2: 创建 `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3D5A80',
          hover: '#4A6B94',
          active: '#2C4460',
          light: '#E8EDF3',
        },
        ink: {
          DEFAULT: '#1A2332',
          secondary: '#6B7B8D',
          disabled: '#B0B8C2',
        },
        canvas: '#F0F2F5',
        line: '#E4E8EE',
        sidebar: {
          DEFAULT: '#1A2332',
          hover: '#2A3A4E',
          active: '#3D5A80',
          text: '#8B9BB4',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Microsoft YaHei"', '"Helvetica Neue"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)',
        pop: '0 6px 16px rgba(0,0,0,0.08)',
        modal: '0 12px 40px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        card: '12px',
        control: '8px',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: 验证 CRA 检测到 tailwind**

```powershell
cd frontend
node -e "const fs=require('fs');const p=require('path');console.log('useTailwind =>', fs.existsSync(p.join(process.cwd(),'tailwind.config.js')))"
```

Expected: 输出 `useTailwind => true`。

- [ ] **Step 4: 提交**

```bash
git add frontend/tailwind.config.js frontend/package.json frontend/package-lock.json
git commit -m "chore: 接入 Tailwind v3（CRA 自动检测配置）"
```

---

## Task 2: 全局设计令牌与基础样式（index.css / index.html / App.css）

**Files:**
- Modify: `frontend/src/index.css`（重写）
- Modify: `frontend/public/index.html`（lang、title、字体基线）
- Delete: `frontend/src/App.css`（未使用的 CRA 样板，`App.js` 未引用它）

**Interfaces:**
- Produces:
  - `:root` CSS 变量（颜色/圆角/阴影/字体），供全局与所有共享组件 CSS 使用
  - Tailwind 指令引入（`@tailwind base/components/utilities`）
  - 全局基础样式（body 背景/字体/滚动条）与 antd 全局覆盖（表头背景、行 hover、按钮按压缩放、卡片阴影过渡）
  - 动画工具类：`animate-fade-up`、`page-transition` keyframes

- [ ] **Step 1: 重写 `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: #3D5A80;
  --color-primary-hover: #4A6B94;
  --color-primary-active: #2C4460;
  --color-primary-light: #E8EDF3;
  --color-bg: #F0F2F5;
  --color-surface: #FFFFFF;
  --color-border: #E4E8EE;
  --color-divider: #F0F0F0;
  --color-text: #1A2332;
  --color-text-secondary: #6B7B8D;
  --color-text-disabled: #B0B8C2;
  --color-sidebar-bg: #1A2332;
  --color-sidebar-hover: #2A3A4E;
  --color-sidebar-active: #3D5A80;
  --color-sidebar-text: #8B9BB4;
  --color-success: #52C41A;
  --color-warning: #FAAD14;
  --color-error: #FF4D4F;
  --color-info: #3D5A80;

  --radius-control: 8px;
  --radius-card: 12px;
  --radius-modal: 16px;

  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-card-hover: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-pop: 0 6px 16px rgba(0, 0, 0, 0.08);
  --shadow-modal: 0 12px 40px rgba(0, 0, 0, 0.12);

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --font-sans: -apple-system, BlinkMacSystemFont, 'PingFang SC',
    'Microsoft YaHei', 'Helvetica Neue', sans-serif;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
}

/* ---------- 滚动条 ---------- */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-thumb {
  background: rgba(139, 155, 180, 0.45);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(107, 123, 141, 0.7);
}
::-webkit-scrollbar-track {
  background: transparent;
}

/* ---------- antd 全局覆盖 ---------- */
.ant-card {
  border-radius: var(--radius-card) !important;
  box-shadow: var(--shadow-card);
  transition: box-shadow 0.3s var(--ease-out), transform 0.3s var(--ease-out);
}

.ant-table-thead > tr > th {
  background: #f7f9fb !important;
  color: var(--color-text-secondary) !important;
  font-weight: 600;
}

.ant-table-tbody > tr {
  transition: background-color 0.2s ease;
}
.ant-table-tbody > tr:hover > td {
  background: #f5f8fc !important;
}

.ant-btn:active {
  transform: scale(0.97);
}
.ant-btn {
  transition: all 0.2s var(--ease-out);
}

.ant-input,
.ant-input-affix-wrapper,
.ant-select-selector {
  border-radius: var(--radius-control) !important;
}

/* ---------- 通用工具类 ---------- */
.page-transition {
  animation: page-in 0.3s var(--ease-out) both;
}
@keyframes page-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-transition,
  .ant-card,
  .ant-btn {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 2: 更新 `public/index.html`**

把：
```html
<html lang="en">
```
改为：
```html
<html lang="zh-CN">
```
把：
```html
<title>React App</title>
```
改为：
```html
<title>在线考试系统</title>
```

- [ ] **Step 3: 删除未使用的 `src/App.css`**

```powershell
cd frontend
Remove-Item src\App.css
```

Expected: `App.js` 不引用 App.css（已确认），删除安全。

- [ ] **Step 4: 构建校验**

```powershell
cd frontend; npm run build
```

Expected: 构建成功（Tailwind 指令被 CRA postcss 插件正常编译）。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/index.css frontend/public/index.html frontend/src/App.css
git commit -m "feat: 全局设计令牌、antd 基础覆盖与动画工具类"
```

---

## Task 3: antd 主题定制（App.js ConfigProvider）

**Files:**
- Modify: `frontend/src/App.js`（`ConfigProvider` 的 `theme` 扩展）

**Interfaces:**
- Produces: 全局 antd 主题（seed token + 组件 token），后续所有页面的 antd 组件自动继承配色/圆角/阴影
- Consumes: 无（不改路由与逻辑）

- [ ] **Step 1: 扩展 `App.js` 的 theme 配置**

把：
```jsx
<ConfigProvider
  locale={zhCN}
  theme={{ token: { colorPrimary: '#3D5A80', borderRadius: 6 } }}
>
```
改为：
```jsx
<ConfigProvider
  locale={zhCN}
  theme={{
    token: {
      colorPrimary: '#3D5A80',
      colorInfo: '#3D5A80',
      colorSuccess: '#52C41A',
      colorWarning: '#FAAD14',
      colorError: '#FF4D4F',
      colorTextBase: '#1A2332',
      colorBgBase: '#FFFFFF',
      colorBgLayout: '#F0F2F5',
      colorBorder: '#E4E8EE',
      borderRadius: 8,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif",
    },
    components: {
      Layout: {
        siderBg: '#1A2332',
        headerBg: '#FFFFFF',
        headerHeight: 64,
        bodyBg: '#F0F2F5',
      },
      Menu: {
        darkItemBg: '#1A2332',
        darkItemColor: '#8B9BB4',
        darkItemHoverBg: '#2A3A4E',
        darkItemHoverColor: '#FFFFFF',
        darkItemSelectedBg: '#3D5A80',
        darkItemSelectedColor: '#FFFFFF',
        itemBorderRadius: 8,
        itemMarginInline: 8,
      },
      Card: { borderRadiusLG: 12 },
      Button: { borderRadius: 8, borderRadiusLG: 8, borderRadiusSM: 6 },
      Input: { borderRadius: 8, borderRadiusLG: 8, borderRadiusSM: 6 },
      Select: { borderRadius: 8, borderRadiusLG: 8, borderRadiusSM: 6 },
      Modal: { borderRadiusLG: 16 },
      Table: { headerBg: '#f7f9fb', headerSplitColor: '#E4E8EE' },
      Tag: { borderRadiusSM: 6 },
    },
  }}
>
```

- [ ] **Step 2: 构建校验**

```powershell
cd frontend; npm run build
```

Expected: 构建成功。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/App.js
git commit -m "feat: antd 全局主题定制（莫兰迪蓝配色 + 组件圆角/背景）"
```

---

## Task 4: 共享组件 PageHeader / PageCard / PageTransition

**Files:**
- Create: `frontend/src/components/PageHeader/index.js` + `index.css`
- Create: `frontend/src/components/PageCard/index.js` + `index.css`
- Create: `frontend/src/components/PageTransition/index.js` + `index.css`

**Interfaces:**
- Produces:
  - `<PageHeader title="考试管理" subtitle="..." extra={node} />`：页面顶部标题栏（左标题+副标题，右操作区）
  - `<PageCard className="...">...</PageCard>`：白色卡片容器（圆角 12 + 阴影 + 内边距 24）
  - `<PageTransition>children</PageTransition>`：路由切换时带动画重挂载（`key` 由外层传入，Task 5 使用）
- 以上组件被 Task 5 及后续所有页面 Task 使用

- [ ] **Step 1: 创建 `components/PageHeader/index.js`**

```jsx
import React from 'react';
import './index.css';

const PageHeader = ({ title, subtitle, extra }) => (
  <div className="page-header">
    <div className="page-header-text">
      <h2 className="page-header-title">{title}</h2>
      {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
    </div>
    {extra && <div className="page-header-extra">{extra}</div>}
  </div>
);

export default PageHeader;
```

- [ ] **Step 2: 创建 `components/PageHeader/index.css`**

```css
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header-text {
  min-width: 0;
}

.page-header-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.page-header-subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.page-header-extra {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
}
```

- [ ] **Step 3: 创建 `components/PageCard/index.js`**

```jsx
import React from 'react';
import './index.css';

const PageCard = ({ children, className = '', style }) => (
  <div className={`page-card ${className}`} style={style}>
    {children}
  </div>
);

export default PageCard;
```

- [ ] **Step 4: 创建 `components/PageCard/index.css`**

```css
.page-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: 24px;
  transition: box-shadow 0.3s var(--ease-out);
}

.page-card:hover {
  box-shadow: var(--shadow-card-hover);
}
```

- [ ] **Step 5: 创建 `components/PageTransition/index.js`**

```jsx
import React from 'react';
import './index.css';

const PageTransition = ({ children }) => (
  <div className="page-transition">{children}</div>
);

export default PageTransition;
```

- [ ] **Step 6: 创建 `components/PageTransition/index.css`**

```css
.page-transition {
  animation: pt-in 0.3s var(--ease-out) both;
}

@keyframes pt-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-transition {
    animation: none;
  }
}
```

- [ ] **Step 7: 构建校验**

```powershell
cd frontend; npm run build
```

Expected: 构建成功（新组件未被引用，但 JSX 语法必须合法）。

- [ ] **Step 8: 提交**

```bash
git add frontend/src/components/PageHeader frontend/src/components/PageCard frontend/src/components/PageTransition
git commit -m "feat: 新增 PageHeader/PageCard/PageTransition 共享组件"
```

---

## Task 5: 布局重构（深色侧边栏 + 白色头部 + 内容区）

**Files:**
- Create: `frontend/src/components/Layout/index.css`
- Modify: `frontend/src/components/Layout/index.js`

**Interfaces:**
- Consumes: `useAuthStore`（user / logout）、`api/auth.logout`、`PageTransition`
- Produces: 重构后的应用外壳 —— 深色可折叠侧边栏（含品牌区 + 角色菜单图标）、64px 白色头部（折叠按钮 + 用户头像下拉）、内容区用 `PageTransition` 包裹 `<Outlet />` 并带路由 key

- [ ] **Step 1: 创建 `components/Layout/index.css`**

```css
.app-layout {
  min-height: 100dvh;
}

.app-sider {
  background: var(--color-sidebar-bg) !important;
  box-shadow: 2px 0 12px rgba(26, 35, 50, 0.18);
  z-index: 20;
}

.app-sider .ant-layout-sider-children {
  display: flex;
  flex-direction: column;
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 64px;
  padding: 0 20px;
  overflow: hidden;
  white-space: nowrap;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  transition: padding 0.3s var(--ease-out);
}

.app-brand-icon {
  flex: none;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: linear-gradient(135deg, #4A6B94, #2C4460);
  color: #fff;
  font-size: 17px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.app-brand-name {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-sider-collapsed .app-brand {
  justify-content: center;
  padding: 0;
}

.app-sider .ant-menu {
  flex: 1;
  border-inline-end: none !important;
  background: transparent;
  padding: 8px 0;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(26, 35, 50, 0.08);
  z-index: 10;
}

.app-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-collapse-btn {
  color: var(--color-text-secondary);
  font-size: 16px;
}

.app-header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-user {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: var(--radius-control);
  transition: background-color 0.2s ease;
}

.app-user:hover {
  background: #f5f8fc;
}

.app-user-name {
  font-size: 14px;
  color: var(--color-text);
  font-weight: 500;
}

.app-content {
  padding: 24px;
}

.app-content > .page-transition {
  height: 100%;
}
```

- [ ] **Step 2: 重写 `components/Layout/index.js`**

```jsx
import React, { useState } from 'react';
import { Layout, Menu, Dropdown, Avatar } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  IdcardOutlined,
  AuditOutlined,
  TeamOutlined,
  FileTextOutlined,
  BookOutlined,
  CheckSquareOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/auth';
import { logout as logoutApi } from '../../api/auth';
import PageTransition from '../PageTransition';
import './index.css';

const { Sider, Header, Content } = Layout;

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logoutStore = useAuthStore((state) => state.logout);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (e) {
      // 忽略登出接口错误，本地照常清理
    }
    logoutStore();
    navigate('/login');
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <IdcardOutlined />, label: '个人信息' },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'profile') navigate('/profile');
      else if (key === 'logout') handleLogout();
    },
  };

  const getMenuItems = () => {
    if (user?.role === 'admin') {
      return [
        { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
        { key: '/exams', icon: <FileTextOutlined />, label: '考试管理' },
      ];
    }
    if (user?.role === 'teacher') {
      return [
        { key: '/courses', icon: <BookOutlined />, label: '课程管理' },
        { key: '/exams', icon: <FileTextOutlined />, label: '考试管理' },
        { key: '/grading', icon: <CheckSquareOutlined />, label: '阅卷管理' },
      ];
    }
    return [
      { key: '/exams', icon: <FileSearchOutlined />, label: '考试列表' },
      { key: '/my-records', icon: <HistoryOutlined />, label: '我的记录' },
    ];
  };

  return (
    <Layout className="app-layout">
      <Sider
        className={`app-sider${collapsed ? ' app-sider-collapsed' : ''}`}
        width={220}
        collapsedWidth={72}
        collapsible
        collapsed={collapsed}
        trigger={null}
      >
        <div className="app-brand">
          <span className="app-brand-icon">
            <AuditOutlined />
          </span>
          {!collapsed && <span className="app-brand-name">在线考试系统</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <div className="app-header-left">
            <span className="app-collapse-btn">
              {collapsed ? (
                <MenuUnfoldOutlined
                  onClick={() => setCollapsed(false)}
                  style={{ cursor: 'pointer' }}
                />
              ) : (
                <MenuFoldOutlined
                  onClick={() => setCollapsed(true)}
                  style={{ cursor: 'pointer' }}
                />
              )}
            </span>
          </div>
          <div className="app-header-right">
            <Dropdown menu={userMenu} placement="bottomRight">
              <span className="app-user">
                <Avatar size={32} style={{ background: '#3D5A80' }} icon={<UserOutlined />} />
                <span className="app-user-name">{user?.name || user?.username}</span>
              </span>
            </Dropdown>
          </div>
        </Header>
        <Content className="app-content">
          <PageTransition>
            <Outlet key={location.pathname} />
          </PageTransition>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
```

注意：`<Outlet key={location.pathname} />` 让路由切换时重挂载并触发 `PageTransition` 的入场动画。

- [ ] **Step 3: 构建校验**

```powershell
cd frontend; npm run build
```

Expected: 构建成功。

- [ ] **Step 4: 手动验证**

```powershell
cd frontend; npm start
```

以任意角色登录：深色侧边栏显示品牌区 + 带图标的角色菜单；点击折叠按钮侧边栏收缩到 72px（文字隐藏、图标居中），再点展开恢复；头部右侧显示用户头像 + 姓名，下拉含"个人信息/退出登录"；切换菜单时内容区有淡入上移动画。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/components/Layout
git commit -m "feat: 布局重构（深色侧边栏 + 白色头部 + 页面过渡动画）"
```

---

## Task 6: 登录页增强

**Files:**
- Modify: `frontend/src/pages/Login/index.js`
- Modify: `frontend/src/pages/Login/index.css`

**Interfaces:**
- Consumes: `api/auth.login`、`useAuthStore.setToken`（逻辑不变）
- Produces: 登录页视觉升级 —— 莫兰迪蓝渐变品牌区 + 装饰圆环 + 入场动画 + 输入框 focus 光晕 + 登录按钮 hover 光泽

- [ ] **Step 1: 更新 `pages/Login/index.js` 的按钮与图标**

把品牌区图标从 `<AuditOutlined />` 保持，登录按钮增加 `className`（保留已有 `login-submit`）：

```jsx
<Button type="primary" htmlType="submit" loading={loading} block className="login-submit">
  登录
</Button>
```

（JSX 结构保持不变，主要改动在 CSS。若无需改动 JSX 则跳过本步。）

- [ ] **Step 2: 重写 `pages/Login/index.css`**

```css
.login-page {
  display: flex;
  min-height: 100dvh;
}

.login-brand {
  position: relative;
  flex: 0 0 46%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 56px;
  color: #fff;
  background: linear-gradient(160deg, #3d5a80 0%, #2c4460 55%, #1a2332 100%);
  overflow: hidden;
}

.login-brand::before,
.login-brand::after {
  content: '';
  position: absolute;
  right: -60px;
  bottom: -60px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  pointer-events: none;
}

.login-brand::before {
  width: 360px;
  height: 360px;
  animation: login-float 20s linear infinite;
}

.login-brand::after {
  right: 40px;
  bottom: 40px;
  width: 200px;
  height: 200px;
  animation: login-float 20s linear infinite reverse;
}

@keyframes login-float {
  from {
    transform: rotate(0deg) translateY(0);
  }
  to {
    transform: rotate(360deg) translateY(0);
  }
}

.login-brand-inner {
  position: relative;
  z-index: 1;
}

.login-mark {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 14px;
  font-size: 26px;
  color: #fff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.login-brand-name {
  margin: 0 0 10px;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: 1px;
}

.login-brand-en {
  font-size: 12px;
  letter-spacing: 0.32em;
  color: rgba(255, 255, 255, 0.72);
}

.login-brand-footer {
  position: absolute;
  bottom: 28px;
  left: 56px;
  z-index: 1;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}

.login-form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafbfc;
}

.login-form-inner {
  width: 360px;
}

.login-title {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 600;
  color: var(--color-text);
}

.login-subtitle {
  margin: 0 0 32px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.login-form-inner .ant-input-affix-wrapper {
  border-radius: 8px;
  transition: box-shadow 0.2s var(--ease-out), border-color 0.2s ease;
}

.login-form-inner .ant-input-affix-wrapper:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(61, 90, 128, 0.15);
}

.login-submit {
  margin-top: 8px;
  height: 44px;
  border-radius: 8px;
  font-weight: 500;
  background: linear-gradient(135deg, #3d5a80, #2c4460);
  box-shadow: 0 4px 12px rgba(61, 90, 128, 0.35);
  position: relative;
  overflow: hidden;
}

.login-submit::after {
  content: '';
  position: absolute;
  top: 0;
  left: -80%;
  width: 50%;
  height: 100%;
  background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transform: skewX(-20deg);
  transition: left 0.5s var(--ease-out);
}

.login-submit:hover::after {
  left: 130%;
}

@media (prefers-reduced-motion: no-preference) {
  .login-brand-inner {
    animation: login-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .login-form-inner {
    animation: login-fade-up 0.5s 0.08s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .login-submit:active {
    transform: scale(0.98);
  }
}

@keyframes login-fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .login-page {
    flex-direction: column;
  }

  .login-brand {
    flex: none;
    padding: 28px 24px;
  }

  .login-brand-inner {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .login-mark {
    margin: 0;
    width: 40px;
    height: 40px;
    font-size: 20px;
    border-radius: 10px;
  }

  .login-brand-name {
    margin: 0;
    font-size: 22px;
  }

  .login-brand-en {
    display: none;
  }

  .login-brand-footer {
    position: static;
    margin-top: 20px;
  }

  .login-form-panel {
    padding: 40px 24px;
  }

  .login-form-inner {
    width: 100%;
    max-width: 380px;
  }
}
```

- [ ] **Step 3: 构建校验**

```powershell
cd frontend; npm run build
```

Expected: 构建成功。

- [ ] **Step 4: 手动验证**

`npm start`，访问 `/login`：品牌区为莫兰迪蓝渐变，两个装饰圆环缓慢旋转；品牌名与表单依次淡入上移；输入框聚焦出现蓝色光晕；登录按钮 hover 有光泽扫过效果；移动端（<768px）切换为上下布局。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/pages/Login
git commit -m "feat: 登录页视觉升级（渐变品牌区 + 光晕/光泽动效）"
```

---

## Task 7: QuestionRenderer 重设计

**Files:**
- Create: `frontend/src/components/QuestionRenderer/index.css`
- Modify: `frontend/src/components/QuestionRenderer/index.js`

**Interfaces:**
- Consumes: `question`（含 type/content/options/score）、`value`、`onChange`、`index`（题号，可选）
- Produces: 升级版题目渲染组件 —— 题号徽章 + 题型 Tag + 分值 + 选项/输入区域卡片化；被 ExamTaking 使用

- [ ] **Step 1: 创建 `components/QuestionRenderer/index.css`**

```css
.question-card {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-card);
  transition: box-shadow 0.3s var(--ease-out), transform 0.3s var(--ease-out);
}

.question-card:hover {
  box-shadow: var(--shadow-card-hover);
}

.question-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.question-card-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border-radius: 7px;
  background: var(--color-primary-light);
  color: var(--color-primary-active);
  font-size: 13px;
  font-weight: 600;
}

.question-card-content {
  font-size: 15px;
  color: var(--color-text);
  line-height: 1.7;
  margin-bottom: 14px;
  white-space: pre-wrap;
}

.question-card-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.question-card-options .ant-radio-wrapper,
.question-card-options .ant-checkbox-wrapper {
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  margin-inline-start: 0 !important;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.question-card-options .ant-radio-wrapper:hover,
.question-card-options .ant-checkbox-wrapper:hover {
  background: #f5f8fc;
  border-color: var(--color-border);
}

.question-card-options .ant-radio-wrapper-checked,
.question-card-options .ant-checkbox-wrapper-checked {
  background: var(--color-primary-light);
  border-color: rgba(61, 90, 128, 0.35);
}
```

- [ ] **Step 2: 重写 `components/QuestionRenderer/index.js`**

```jsx
import React from 'react';
import { Radio, Checkbox, Input, Tag } from 'antd';
import './index.css';

const typeMap = {
  single: { text: '单选题', color: 'blue' },
  multiple: { text: '多选题', color: 'geekblue' },
  judge: { text: '判断题', color: 'orange' },
  blank: { text: '填空题', color: 'purple' },
  essay: { text: '简答题', color: 'green' },
};

const QuestionRenderer = ({ question, value, onChange, index = 0 }) => {
  const { type, content, options, score } = question;
  const typeInfo = typeMap[type] || { text: type, color: 'default' };

  const renderAnswerInput = () => {
    switch (type) {
      case 'single':
        return (
          <Radio.Group value={value} onChange={(e) => onChange(e.target.value)}>
            {options?.map((opt, i) => (
              <Radio key={i} value={String.fromCharCode(65 + i)}>
                {String.fromCharCode(65 + i)}. {opt}
              </Radio>
            ))}
          </Radio.Group>
        );
      case 'multiple':
        return (
          <Checkbox.Group value={value || []} onChange={onChange}>
            {options?.map((opt, i) => (
              <Checkbox key={i} value={String.fromCharCode(65 + i)}>
                {String.fromCharCode(65 + i)}. {opt}
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
        return (
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="请输入答案" />
        );
      case 'essay':
        return (
          <Input.TextArea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            placeholder="请输入答案"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="question-card">
      <div className="question-card-head">
        <span className="question-card-index">第 {index + 1} 题</span>
        <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
        <Tag>{score} 分</Tag>
      </div>
      <div className="question-card-content">{content}</div>
      <div className="question-card-options">{renderAnswerInput()}</div>
    </div>
  );
};

export default QuestionRenderer;
```

- [ ] **Step 3: 构建校验**

```powershell
cd frontend; npm run build
```

Expected: 构建成功（ExamTaking 仍传旧的 props，`index` 默认为 0，暂不破坏）。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/components/QuestionRenderer
git commit -m "feat: 题目渲染卡片化（题号徽章 + 题型标签 + 选项悬停态）"
```

---

## Task 8: 考试页面（ExamTaking）重设计

**Files:**
- Create: `frontend/src/pages/Student/ExamTaking/index.css`
- Modify: `frontend/src/pages/Student/ExamTaking/index.js`

**Interfaces:**
- Consumes: `getPaper/saveAnswers/submitExam/recordSwitch`、`QuestionRenderer`（新 `index` prop）、`useLocation().state.duration`
- Produces: 考试答题页 —— 顶部吸顶栏（倒计时 + 交卷）+ 题目卡片流 + 自动保存/切屏检测逻辑保持不变

- [ ] **Step 1: 创建 `pages/Student/ExamTaking/index.css`**

```css
.exam-taking {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.exam-taking-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px 20px;
  box-shadow: var(--shadow-card);
}

.exam-taking-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.exam-taking-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.exam-taking-timer {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.exam-taking-timer-warn .ant-tag {
  animation: timer-pulse 1.2s ease-in-out infinite;
}

@keyframes timer-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
```

- [ ] **Step 2: 重写 `pages/Student/ExamTaking/index.js`**

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Space, Modal, message, Tag } from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getPaper, saveAnswers, submitExam, recordSwitch } from '../../../api/exams';
import QuestionRenderer from '../../../components/QuestionRenderer';
import PageCard from '../../../components/PageCard';
import './index.css';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const ExamTaking = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [paper, setPaper] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() => {
    const duration = location.state?.duration;
    return duration ? duration * 60 : 0;
  });

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

  const handleSubmit = useCallback(async () => {
    Modal.confirm({
      title: '确认交卷？',
      content: '交卷后将无法修改答案',
      onOk: async () => {
        setLoading(true);
        try {
          const res = await submitExam(examId, answers);
          message.success(`交卷成功，得分：${res.data.score}`);
          navigate('/my-records');
        } catch (error) {
          message.error('交卷失败');
        } finally {
          setLoading(false);
        }
      },
    });
  }, [examId, answers, navigate]);

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
  }, [timeLeft, handleSubmit]);

  // 自动保存
  useEffect(() => {
    const timer = setInterval(async () => {
      if (Object.keys(answers).length > 0) {
        await saveAnswers(examId, answers);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [answers, examId]);

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

  if (!paper) return null;

  const warn = timeLeft <= 300;

  return (
    <div className="exam-taking">
      <div className="exam-taking-topbar">
        <div className="exam-taking-info">
          <span className="exam-taking-title">{paper.title || '考试进行中'}</span>
          <span className={`exam-taking-timer${warn ? ' exam-taking-timer-warn' : ''}`}>
            <Tag color={warn ? 'error' : 'processing'}>剩余时间 {formatTime(timeLeft)}</Tag>
          </span>
        </div>
        <Space>
          <Button type="primary" danger onClick={handleSubmit} loading={loading}>
            交卷
          </Button>
        </Space>
      </div>
      <PageCard>
        {paper.questions.map((q, index) => (
          <QuestionRenderer
            key={q.id}
            question={q}
            value={answers[q.id]}
            index={index}
            onChange={(value) => handleAnswerChange(q.id, value)}
          />
        ))}
      </PageCard>
    </div>
  );
};

export default ExamTaking;
```

- [ ] **Step 3: 构建校验**

```powershell
cd frontend; npm run build
```

Expected: 构建成功。

- [ ] **Step 4: 手动验证**

`npm start`，以 student 登录开始一场考试：顶部吸顶栏显示考试名 + 倒计时（<5 分钟变红脉动）+ 交卷按钮；题目以卡片流展示（题号徽章、题型 Tag、分值）；选项 hover 高亮、选中态浅蓝；自动保存与切屏检测仍生效（日志/记录可见）。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/pages/Student/ExamTaking
git commit -m "feat: 考试答题页重设计（吸顶倒计时栏 + 题目卡片流）"
```

---

## Task 9: 学生端列表页（ExamList / MyRecords）

**Files:**
- Modify: `frontend/src/pages/Student/ExamList/index.js`
- Modify: `frontend/src/pages/Student/MyRecords/index.js`

**Interfaces:**
- Consumes: `getExams/startExam`、`getMyRecords`（逻辑不变）、`PageHeader`、`PageCard`
- Produces: 两页改为「PageHeader 标题 + PageCard 包裹表格」的统一骨架

- [ ] **Step 1: 改造 `ExamList/index.js` 的 return**

把 `return (...)` 改为：
```jsx
return (
  <div>
    <PageHeader
      title="考试列表"
      subtitle="选择一门考试开始作答"
    />
    <PageCard>
      <Table
        columns={columns}
        dataSource={exams}
        loading={loading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />
    </PageCard>
  </div>
);
```
在 import 区追加：
```js
import PageHeader from '../../../components/PageHeader';
import PageCard from '../../../components/PageCard';
```

- [ ] **Step 2: 改造 `MyRecords/index.js` 的 return**

把 `return <Table ... />` 改为：
```jsx
return (
  <div>
    <PageHeader title="我的记录" subtitle="你参与过的考试与成绩" />
    <PageCard>
      <Table columns={columns} dataSource={records} loading={loading} rowKey="id" />
    </PageCard>
  </div>
);
```
在 import 区追加：
```js
import PageHeader from '../../../components/PageHeader';
import PageCard from '../../../components/PageCard';
```

- [ ] **Step 3: 构建校验**

```powershell
cd frontend; npm run build
```

Expected: 构建成功。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/pages/Student/ExamList frontend/src/pages/Student/MyRecords
git commit -m "feat: 学生端列表页统一 PageHeader + PageCard 骨架"
```

---

## Task 10: 教师端页面（CourseManage / ExamManage）

**Files:**
- Modify: `frontend/src/pages/Teacher/CourseManage/index.js`
- Modify: `frontend/src/pages/Teacher/ExamManage/index.js`

**Interfaces:**
- Consumes: 各页现有 API 与逻辑、`PageHeader`、`PageCard`
- Produces: 两页统一骨架，操作按钮移到 PageHeader 的 `extra`

- [ ] **Step 1: 改造 `CourseManage/index.js`**

把 import 区追加：
```js
import PageHeader from '../../../components/PageHeader';
import PageCard from '../../../components/PageCard';
```

把 `return (...)` 中的外层结构改为：
```jsx
return (
  <div>
    <PageHeader
      title="课程管理"
      subtitle="维护课程信息，供考试关联使用"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新建课程
        </Button>
      }
    />
    <PageCard>
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
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />
    </PageCard>
    <Modal
      title={editingCourse ? '编辑课程' : '新建课程'}
      open={modalVisible}
      onOk={handleSubmit}
      confirmLoading={submitting}
      onCancel={() => setModalVisible(false)}
      width={520}
    >
      {/* Form 内容保持原样 */}
    </Modal>
  </div>
);
```

注意：移除原来包裹整个页面的 `<Card title="课程管理">...</Card>`，把「新建课程」按钮从卡片内移到 `PageHeader` 的 `extra`。同时把 import 中不再使用的 `Card` 从 antd 解构列表里删除（避免 eslint 未使用警告）。

- [ ] **Step 2: 改造 `ExamManage/index.js`**

把 import 区追加：
```js
import PageHeader from '../../../components/PageHeader';
import PageCard from '../../../components/PageCard';
```

把 `return (...)` 改为：
```jsx
return (
  <div>
    <PageHeader
      title="考试管理"
      subtitle="创建、发布并维护考试"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/exams/new')}>
          创建考试
        </Button>
      }
    />
    <PageCard>
      <Table
        columns={columns}
        dataSource={exams}
        loading={loading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />
    </PageCard>
  </div>
);
```

注意：移除原来 `<Button ... style={{ marginBottom: 16 }}>创建考试</Button>` 及其外层 `<div>` 容器。

- [ ] **Step 3: 构建校验**

```powershell
cd frontend; npm run build
```

Expected: 构建成功。

- [ ] **Step 4: 手动验证**

以 teacher 登录：课程管理/考试管理页顶部为「标题 + 副标题 + 右侧主操作按钮」，下方白色卡片内为表格；「新建课程」「创建考试」按钮功能正常。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/pages/Teacher/CourseManage frontend/src/pages/Teacher/ExamManage
git commit -m "feat: 教师端课程/考试管理页统一骨架"
```

---

## Task 11: 考试编辑页（ExamEdit）与阅卷页（Grading）

**Files:**
- Modify: `frontend/src/pages/Teacher/ExamEdit/index.js`
- Modify: `frontend/src/pages/Teacher/Grading/index.js`
- Modify: `frontend/src/pages/Teacher/Grading/GradingDrawer.js`

**Interfaces:**
- Consumes: 各页现有 API 与逻辑（ExamEdit 的双表单/题目管理、Grading 的考试下拉/记录表、Drawer 的逐题打分）、`PageHeader`、`PageCard`
- Produces: ExamEdit 顶部返回按钮 + PageHeader；Grading 用 PageHeader 包裹下拉；Drawer 顶部按钮组样式保持但微调间距

- [ ] **Step 1: 改造 `ExamEdit/index.js` 的页面骨架**

在 import 区追加：
```js
import PageHeader from '../../../components/PageHeader';
```

找到页面最外层返回按钮（`<Button icon={<ArrowLeftOutlined />} ...>`，在渲染 `<Card ...>` 之前），在其下方加：
```jsx
<PageHeader
  title={isEdit ? '编辑考试' : '新建考试'}
  subtitle={isEdit ? '配置考试信息并管理题目' : '填写考试基本信息'}
/>
```

若返回按钮已用 `Space`/`div` 包裹，保留现有返回按钮即可，仅在其后插入 PageHeader。原 `<Card title="考试信息">` 等卡片保留（antd 全局样式已统一卡片圆角/阴影）。

- [ ] **Step 2: 改造 `Grading/index.js` 的页面骨架**

把 import 区追加：
```js
import PageHeader from '../../../components/PageHeader';
import PageCard from '../../../components/PageCard';
```

把 `return (...)` 的最外层（原来是 `<Card title="阅卷管理">...</Card>`，`Grading/index.js` 的 import 里有 `Card`）改为：
```jsx
return (
  <div>
    <PageHeader title="阅卷管理" subtitle="逐题批改学生答卷" />
    <PageCard>
      <Space style={{ marginBottom: 16 }}>
        <span>选择考试：</span>
        <Select
          style={{ width: 280 }}
          placeholder="请选择考试"
          value={examId}
          onChange={(v) => { setExamId(v); setPage(1); }}
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
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
        locale={{ emptyText: examId ? '该考试暂无记录' : '请先选择考试' }}
      />
    </PageCard>
    <GradingDrawer
      record={drawerRecord}
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onChanged={() => fetchRecords(examId, page, pageSize)}
    />
  </div>
);
```

- [ ] **Step 3: 微调 `GradingDrawer.js` 的问题卡片间距**

在 `GradingDrawer.js` 中，找到每题卡片的外层 `style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, marginBottom: 16 }}`，改为：
```js
style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, marginBottom: 16, background: '#fff', boxShadow: 'var(--shadow-card)' }}
```

- [ ] **Step 4: 构建校验**

```powershell
cd frontend; npm run build
```

Expected: 构建成功。

- [ ] **Step 5: 手动验证**

以 teacher 登录：考试编辑页顶部为返回按钮 + 页面标题；阅卷页为「标题 + 白色卡片（下拉 + 记录表）」，打开阅卷抽屉每题卡片带阴影、边框圆角 12。

- [ ] **Step 6: 提交**

```bash
git add frontend/src/pages/Teacher/ExamEdit frontend/src/pages/Teacher/Grading
git commit -m "feat: 考试编辑/阅卷页统一骨架与卡片样式"
```

---

## Task 12: 管理端用户管理页与个人信息页（UserManage / Profile）

**Files:**
- Modify: `frontend/src/pages/Admin/UserManage/index.js`
- Modify: `frontend/src/pages/Profile/index.js`

**Interfaces:**
- Consumes: 各页现有 API 与逻辑、`PageHeader`、`PageCard`
- Produces: UserManage 用 PageHeader + PageCard；Profile 用 PageHeader + PageCard 包裹，内层卡片由 antd 全局样式统一

- [ ] **Step 1: 改造 `UserManage/index.js`**

把 import 区追加：
```js
import PageHeader from '../../../components/PageHeader';
import PageCard from '../../../components/PageCard';
```

把 `return (...)` 改为：
```jsx
return (
  <div>
    <PageHeader
      title="用户管理"
      subtitle="管理学生、教师与管理员账号"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加用户
        </Button>
      }
    />
    <PageCard>
      <Table columns={columns} dataSource={users} loading={loading} rowKey="id" />
    </PageCard>
    <Modal
      title={editingUser ? '编辑用户' : '添加用户'}
      open={modalVisible}
      onOk={handleSubmit}
      onCancel={() => setModalVisible(false)}
    >
      {/* Form 内容保持原样 */}
    </Modal>
  </div>
);
```

注意：移除原来的 `<Button ... style={{ marginBottom: 16 }}>添加用户</Button>` 外层 `<div>` 容器。

- [ ] **Step 2: 改造 `Profile/index.js`**

把 import 区追加：
```js
import PageHeader from '../../../components/PageHeader';
import PageCard from '../../../components/PageCard';
```

把 `return (...)` 改为：
```jsx
return (
  <div>
    <PageHeader title="个人信息" subtitle="查看与修改你的账号资料" />
    <PageCard>
      <Card type="inner" title="基本信息" style={{ marginBottom: 16 }}>
        {/* 原有内容保持不变 */}
      </Card>
      <Card type="inner" title="修改密码" style={{ marginBottom: 16 }}>
        {/* 原有内容保持不变 */}
      </Card>
      <Card type="inner" title="账号操作">
        {/* 原有内容保持不变 */}
      </Card>
    </PageCard>
  </div>
);
```

注意：原来的外层 `<Card title="个人信息">` 移除，改由 `PageHeader` + `PageCard` 承担；内层三个 `type="inner"` 的 Card 保留（antd 全局样式统一）。

- [ ] **Step 3: 构建校验**

```powershell
cd frontend; npm run build
```

Expected: 构建成功。

- [ ] **Step 4: 手动验证**

以 admin 登录用户管理页；进入个人信息页查看三段卡片布局。功能不受影响。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/pages/Admin/UserManage frontend/src/pages/Profile
git commit -m "feat: 用户管理与个人信息页统一骨架"
```

---

## Task 13: 动效补全与整体回归

**Files:**
- Modify: `frontend/src/index.css`（微交互补全：菜单项 hover、Tag 过渡、分页 hover）
- 其余为验证，无新增业务改动

**Interfaces:**
- Consumes: 全部已完成改动
- Produces: 全局微交互统一（表格行/按钮/菜单/Tag hover 与过渡），并在 `prefers-reduced-motion` 下降级

- [ ] **Step 1: 在 `index.css` 补全微交互**

在 `index.css` 末尾追加：
```css
/* 侧边栏菜单过渡 */
.ant-menu-item {
  transition: all 0.2s ease !important;
}
.ant-menu-item-selected {
  box-shadow: 0 2px 8px rgba(61, 90, 128, 0.35);
}

/* 表格分页 hover */
.ant-pagination-item {
  transition: all 0.2s ease;
}
.ant-pagination-item:hover {
  transform: translateY(-1px);
}

/* Tag 过渡 */
.ant-tag {
  transition: all 0.2s ease;
}

/* 表单校验失败：输入框抖动（spec 3.3 状态反馈） */
.ant-form-item-has-error .ant-input,
.ant-form-item-has-error .ant-input-affix-wrapper,
.ant-form-item-has-error .ant-select-selector {
  animation: input-shake 0.4s ease;
}

@keyframes input-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  50% {
    transform: translateX(4px);
  }
  75% {
    transform: translateX(-2px);
  }
}
```

- [ ] **Step 2: 前端构建 + 全链路手测**

```powershell
cd frontend; npm run build
```

Expected: 构建成功。随后 `npm start` 完整回归：
1. student：登录 → 考试列表（PageHeader + 卡片表格）→ 开始考试（吸顶栏倒计时 + 题目卡片，自动保存/切屏正常）→ 交卷 → 我的记录
2. teacher：登录 → 课程管理（CRUD）→ 考试管理（创建/编辑/发布/删除/阅卷跳转）→ 阅卷管理（下拉 + 记录表 + 抽屉逐题打分/自动判分/终评）→ 考试编辑页
3. admin：登录 → 用户管理（CRUD）→ 考试管理
4. 个人信息页：基本信息/改密码/退出登录
5. 检查深浅配色一致性、卡片/按钮 hover、页面过渡动画、侧边栏折叠
6. 浏览器开启「减弱动态效果」或系统设置 reduce motion：页面过渡与 hover 动画应消失（降级为瞬时）

- [ ] **Step 3: 提交收尾（如有遗留改动）**

```bash
git status
git add -u
git commit -m "feat: 全局微交互补全与回归"
```

（若无遗留改动则跳过本步。）

---

## Task 14: 提交设计文档与收尾

**Files:**
- Modify: `docs/superpowers/specs/2026-08-02-exam-system-redesign-design.md`（如实现与设计有出入，更新到最终状态）

- [ ] **Step 1: 校验设计文档与实现一致**

如有出入（例如 antd 组件 token 名称调整、共享组件命名变化），更新设计文档对应小节。设计文档路径：`docs/superpowers/specs/2026-08-02-exam-system-redesign-design.md`。

- [ ] **Step 2: 最终提交**

```bash
git add docs
git commit -m "docs: 更新前端重构设计文档至最终状态"
```

（若无需更新则跳过本步。）
