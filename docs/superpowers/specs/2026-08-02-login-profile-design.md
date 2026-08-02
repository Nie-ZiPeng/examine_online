# 登录页重设计 + 用户个人信息界面 - 设计文档

## 1. 项目概述

### 1.1 背景
在线考试系统前端已完成考试系统核心功能与课程/阅卷管理。本次进行两项用户体验优化：
1. **登录页重设计**：将现有朴素的中置 Card 登录页升级为左右分屏的企业级质感登录页。
2. **用户个人信息界面**：新增查看/修改个人信息的页面，含修改密码与退出登录；配套新增两个后端接口。

### 1.2 目标
- 登录页：专业、克制、可信赖的第一印象；功能契约不变
- 个人信息页：当前用户查看本人资料、修改姓名/邮箱/电话、修改密码、退出登录
- 保持与现有 antd 后台风格一致的视觉语言（藏青 `#3D5A80` 主题色）

### 1.3 范围边界
- **不改**：认证 Token 机制、路由守卫、其他业务页面
- **改动**：`Login` 页面样式、`Layout` Header、`App.js` 路由、`api/auth.js`、`authStore`（如有必要）；后端 `auth` 模块新增 2 个接口

---

## 2. 登录页重设计

### 2.1 设计判断（Design Read）
面向大学在线考试系统入口，用户为学生/老师/管理员（信任优先、机构化场景），克制的企业级语言，基于 antd v6 组件 + 藏青 `#3D5A80` 强调色。功能表单页，不套用营销页 hero/bento 规则。

### 2.2 布局
- 全屏左右分屏：左 ~46% 品牌面板，右 ~54% 白色表单区
- **左面板（极简 wordmark）**：几何 Logo 标 + "在线考试系统" + 小号英文 "ONLINE EXAM SYSTEM"；背景为 `#3D5A80` 到更深藏青渐变；角落一组细线几何装饰；无标语、无版本角标
- **右面板**：标题"欢迎登录" + 简短副文案；antd Form（用户名/密码，label 在上方）；"登录"主按钮；页脚版权小字

### 2.3 排版 / 色彩 / 动效
- 排版：系统字体栈（中文优先），标题用字重/字号层级，留白充足（低密度）
- 色彩：左面板深藏青渐变 + 白字（高对比）；右面板近白背景；唯一强调色 `#3D5A80`
- 克制动效：整页内容 0.4-0.6s 淡入 + 轻微上移（`cubic-bezier(0.16,1,0.3,1)`）；按钮 `:active` 微缩；遵循 `prefers-reduced-motion`
- 状态：加载=按钮 loading；错误=antd message + 字段级校验；focus 用 antd 默认
- 移动端：`<768px` 折叠为单列（品牌面板变顶部窄条，表单占满宽度）

### 2.4 功能契约（不变）
- 字段名 `username/password`、`login()` 流程、`authStore.setToken`、路由跳转 `/`、错误提示不变
- 新增文件：`frontend/src/pages/Login/index.css`；重写 `frontend/src/pages/Login/index.js`

---

## 3. 用户个人信息界面

### 3.1 设计判断
考试系统内嵌个人信息界面，当前用户查看/修改本人资料并退出登录；信任优先、清洁企业语言，antd 组件 + 藏青强调色，克制动效，与现有页面（CourseManage 等 Card 布局）一致。

### 3.2 后端新增接口（auth 模块）
1. **`PUT /api/auth/me`**：当前用户修改本人信息
   - 请求体：`{ name?, email?, phone? }`（复用 UserUpdate 的 name/email/phone 字段）
   - 权限：任意登录用户（`get_current_user`）；用 `current_user.id` 调 `user_service.update_user`
   - 返回：更新后的 `UserResponse`
2. **`POST /api/auth/change-password`**：修改本人密码
   - 请求体：`{ old_password, new_password }`（new_password 最短 6 位）
   - 权限：任意登录用户；校验 `verify_password(old_password, user.password_hash)` → `hash_password(new_password)` 更新
   - 返回：成功消息

### 3.3 前端
- **`api/auth.js` 新增**：`updateMe(data)` → PUT `/api/auth/me`；`changePassword(data)` → POST `/api/auth/change-password`
- **Header 用户下拉**（`Layout/index.js`）：右上角用户姓名改为 Dropdown 菜单：
  - 【个人信息】→ `/profile`
  - 【退出登录】→ 调 `logout()` 接口 + `authStore.logout()` + 跳 `/login`
- **新页面 `/profile`**（`frontend/src/pages/Profile/index.js`）：
  - 基本信息卡：只读展示 用户名、角色（Tag，中文映射：学生/老师/管理员）、注册时间；可编辑表单（姓名/邮箱/电话）→ 保存调 `updateMe` → 刷新 `authStore.fetchUser`
  - 修改密码卡：原密码 / 新密码 / 确认新密码（前端校验两次一致）→ `changePassword`
  - 退出登录：危险按钮 + Popconfirm 确认 → logout
- **`App.js`** 增加路由 `<Route path="profile" element={<Profile />} />`
- 用户名/角色不可改；邮箱/电话可留空；改密码后不强制重新登录

---

## 4. 视觉与质量约束

- 全局主题色 `#3D5A80` 不变
- 反 AI-slop：无 em-dash、无版本角标、无装饰圆点、无花哨渐变文字；图标用 antd 图标库
- 可访问性：白字/藏青底对比达标；label 在输入框上方；`prefers-reduced-motion` 支持
- 所有中文文案为干净 UTF-8

---

## 5. 测试与验证

- 后端：重启后 curl/接口验证 `PUT /api/auth/me` 与 `POST /api/auth/change-password`（正确/错误旧密码）
- 前端：`npm run build` 零警告；`App.test.js` 通过；手测登录页、个人信息查看/修改/改密/退出流程
- 三角色（学生/老师/管理员）均可访问个人信息页并修改本人资料

---

**文档版本**: v1.0
**创建日期**: 2026-08-02
**最后更新**: 2026-08-02
