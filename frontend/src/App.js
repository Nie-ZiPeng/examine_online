import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Login from './pages/Login';
import AppLayout from './components/Layout';
import useAuthStore from './store/auth';

// 管理员页面
import UserManage from './pages/Admin/UserManage';

// 老师页面
import ExamManage from './pages/Teacher/ExamManage';
import ExamEdit from './pages/Teacher/ExamEdit';
import CourseManage from './pages/Teacher/CourseManage';
import Grading from './pages/Teacher/Grading';

// 学生页面
import ExamList from './pages/Student/ExamList';
import ExamTaking from './pages/Student/ExamTaking';
import MyRecords from './pages/Student/MyRecords';

const PrivateRoute = ({ children }) => {
  const token = useAuthStore((state) => state.token);
  return token ? children : <Navigate to="/login" replace />;
};

// 根据角色渲染 /exams：管理员/老师进入考试管理，学生进入考试列表
const ExamsPage = () => {
  const user = useAuthStore((state) => state.user);
  return user?.role === 'student' ? <ExamList /> : <ExamManage />;
};

function App() {
  const { fetchUser, token } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token, fetchUser]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{ token: { colorPrimary: '#3D5A80', borderRadius: 6 } }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/exams" replace />} />
            <Route path="users" element={<UserManage />} />
            <Route path="exams" element={<ExamsPage />} />
            <Route path="exams/new" element={<ExamEdit />} />
            <Route path="exams/:examId/edit" element={<ExamEdit />} />
            <Route path="exams/:examId/take" element={<ExamTaking />} />
            <Route path="my-records" element={<MyRecords />} />
            <Route path="courses" element={<CourseManage />} />
            <Route path="grading" element={<Grading />} />
            <Route path="*" element={<Navigate to="/exams" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
