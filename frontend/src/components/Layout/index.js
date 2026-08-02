import React from 'react';
import { Layout, Menu, Dropdown } from 'antd';
import { UserOutlined, LogoutOutlined, IdcardOutlined } from '@ant-design/icons';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/auth';
import { logout as logoutApi } from '../../api/auth';

const { Sider, Header, Content } = Layout;

const AppLayout = () => {
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
        { key: '/users', label: '用户管理' },
        { key: '/exams', label: '考试管理' },
      ];
    }
    if (user?.role === 'teacher') {
      return [
        { key: '/courses', label: '课程管理' },
        { key: '/exams', label: '考试管理' },
        { key: '/grading', label: '阅卷管理' },
      ];
    }
    return [
      { key: '/exams', label: '考试列表' },
      { key: '/my-records', label: '我的记录' },
    ];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible>
        <div style={{ height: 32, margin: 16, background: 'rgba(255,255,255,0.2)', borderRadius: 6 }} />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Dropdown menu={userMenu} placement="bottomRight">
            <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined />
              {user?.name}
            </span>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
