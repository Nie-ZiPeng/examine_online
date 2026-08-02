import React, { useState } from 'react';
import { Layout, Menu, Dropdown, Avatar } from 'antd';
import type { MenuProps } from 'antd';
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

  const userMenu: MenuProps = {
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

  const getMenuItems = (): MenuProps['items'] => {
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
