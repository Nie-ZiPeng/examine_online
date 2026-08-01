import React from 'react';
import { Layout, Menu } from 'antd';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/auth';

const { Sider, Header, Content } = Layout;

const AppLayout = () => {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();

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
          <span>{user?.name}</span>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
