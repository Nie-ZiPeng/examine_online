import React, { useEffect, useState } from 'react';
import { App, Row, Col, Card, Statistic, Button } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
  PercentageOutlined,
  BookOutlined,
  TeamOutlined,
  AuditOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../../api/statistics';
import type { DashboardData } from '../../types/dashboard';
import dayjs from 'dayjs';
import useAuthStore from '../../store/auth';
import StatusTag from '../../components/StatusTag';
import EmptyState from '../../components/EmptyState';
import PageCard from '../../components/PageCard';
import SkeletonGrid from '../../components/SkeletonGrid';
import './index.css';

const Dashboard = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await getDashboard();
        setData(res.data);
      } catch (error) {
        message.error('获取仪表盘数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <SkeletonGrid count={4} columns={2} />;
  }

  if (!data) {
    return (
      <EmptyState
        title="暂无数据"
        description="仪表盘数据加载失败或暂不可用"
        action={
          <Button
            type="primary"
            onClick={() => window.location.reload()}
          >
            重新加载
          </Button>
        }
      />
    );
  }

  const isStudent = data.role === 'student';
  const isTeacher = data.role === 'teacher';

  return (
    <div className="dashboard">
      <div className="dashboard-banner">
        <h1 className="dashboard-banner-title">
          你好,{user?.name || user?.username}
        </h1>
        <p className="dashboard-banner-subtitle">
          {isStudent
            ? `当前有 ${data.stats.available_exams} 场考试可参加，合理安排时间`
            : isTeacher
            ? `有 ${data.stats.pending_grading_count} 道题目待批改,尽快处理`
            : '欢迎使用衡鉴在线考试系统管理端'}
        </p>
      </div>

      {isStudent && (
        <>
          <Row gutter={[16, 16]} className="dashboard-stats">
            <Col xs={12} md={6}>
              <Card className="stat-card">
                <Statistic title="可参加考试" value={data.stats.available_exams} prefix={<FileTextOutlined />} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card className="stat-card">
                <Statistic title="我的考试次数" value={data.stats.my_exam_count} prefix={<HistoryOutlined />} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card className="stat-card">
                <Statistic title="平均分" value={data.stats.avg_score} prefix={<CheckCircleOutlined />} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card className="stat-card">
                <Statistic title="通过率" value={data.stats.pass_rate} suffix="%" prefix={<PercentageOutlined />} />
              </Card>
            </Col>
          </Row>

          <PageCard className="dashboard-section">
            <h3 className="dashboard-section-title">即将开始的考试</h3>
            {data.upcoming_exams.length === 0 ? (
              <EmptyState title="近期暂无考试" description="有新考试发布后会显示在这里" />
            ) : (
              <div className="dashboard-list">
                {data.upcoming_exams.map((e) => (
                  <div key={e.id} className="dashboard-list-item">
                    <div>
                      <p className="dashboard-list-title">{e.title}</p>
                      <p className="dashboard-list-meta">
                        {dayjs(e.start_time).toLocaleString()} · {e.duration} 分钟
                      </p>
                    </div>
                    <Button type="primary" onClick={() => navigate('/exams')}>
                      去参加
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </PageCard>

          <PageCard className="dashboard-section">
            <h3 className="dashboard-section-title">最近成绩</h3>
            {data.recent_records.length === 0 ? (
              <EmptyState title="还没有考试记录" description="参加考试后成绩会显示在这里" />
            ) : (
              <div className="dashboard-list">
                {data.recent_records.map((r) => (
                  <div key={r.id} className="dashboard-list-item">
                    <div>
                      <p className="dashboard-list-title">{r.exam_title}</p>
                      <p className="dashboard-list-meta">
                        得分 {r.score} / 及格 {r.pass_score} · {r.submit_time ? dayjs(r.submit_time).toLocaleString() : ''}
                      </p>
                    </div>
                    <StatusTag status={r.score >= r.pass_score ? 'passed' : 'failed'} />
                  </div>
                ))}
              </div>
            )}
          </PageCard>
        </>
      )}

      {isTeacher && (
        <>
          <Row gutter={[16, 16]} className="dashboard-stats">
            <Col xs={12} md={6}>
              <Card className="stat-card">
                <Statistic title="已发布考试" value={data.stats.published_exams} prefix={<AuditOutlined />} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card className="stat-card">
                <Statistic title="待批改题目" value={data.stats.pending_grading_count} prefix={<CheckCircleOutlined />} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card className="stat-card">
                <Statistic title="我的课程" value={data.stats.course_count} prefix={<BookOutlined />} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card className="stat-card">
                <Statistic title="累计作答" value={data.stats.total_records} prefix={<HistoryOutlined />} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={14}>
              <PageCard className="dashboard-section">
                <h3 className="dashboard-section-title">待批改提醒</h3>
                {data.pending_grading.length === 0 ? (
                  <EmptyState title="没有待批改题目" description="所有主观题都已批改完成" />
                ) : (
                  <div className="dashboard-list">
                    {data.pending_grading.map((p) => (
                      <div key={p.exam_id} className="dashboard-list-item">
                        <div>
                          <p className="dashboard-list-title">{p.exam_title}</p>
                          <p className="dashboard-list-meta">{p.pending_count} 道题目待批改</p>
                        </div>
                        <Button onClick={() => navigate('/grading')}>去阅卷</Button>
                      </div>
                    ))}
                  </div>
                )}
              </PageCard>
            </Col>
            <Col xs={24} md={10}>
              <PageCard className="dashboard-section">
                <h3 className="dashboard-section-title">最近考试</h3>
                {data.recent_exams.length === 0 ? (
                  <EmptyState title="还没有考试" />
                ) : (
                  <div className="dashboard-list">
                    {data.recent_exams.map((e) => (
                      <div key={e.id} className="dashboard-list-item">
                        <div>
                          <p className="dashboard-list-title">{e.title}</p>
                          <p className="dashboard-list-meta">
                            {dayjs(e.start_time).toLocaleString()}
                          </p>
                        </div>
                        <Button onClick={() => navigate('/exams')}>管理</Button>
                      </div>
                    ))}
                  </div>
                )}
              </PageCard>
            </Col>
          </Row>
        </>
      )}

      {data.role === 'admin' && (
        <>
          <Row gutter={[16, 16]} className="dashboard-stats">
            <Col xs={12} md={6}>
              <Card className="stat-card">
                <Statistic title="学生" value={data.stats.student_count} prefix={<UserOutlined />} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card className="stat-card">
                <Statistic title="教师" value={data.stats.teacher_count} prefix={<TeamOutlined />} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card className="stat-card">
                <Statistic title="管理员" value={data.stats.admin_count} prefix={<AuditOutlined />} />
              </Card>
            </Col>
            <Col xs={12} md={6}>
              <Card className="stat-card">
                <Statistic title="考试总数" value={data.stats.exam_count} prefix={<FileTextOutlined />} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={10}>
              <PageCard className="dashboard-section">
                <h3 className="dashboard-section-title">用户角色分布</h3>
                <div className="dashboard-bars">
                  {data.role_distribution.map((d) => (
                    <div key={d.role} className="dashboard-bar-row">
                      <span className="dashboard-bar-label">
                        {d.role === 'student' ? '学生' : d.role === 'teacher' ? '教师' : '管理员'}
                      </span>
                      <span className="dashboard-bar-track">
                        <span
                          className="dashboard-bar-fill"
                          style={{ width: `${Math.max(4, (d.count / Math.max(1, data.stats.student_count + data.stats.teacher_count + data.stats.admin_count)) * 100)}%` }}
                        />
                      </span>
                      <span className="dashboard-bar-value">{d.count}</span>
                    </div>
                  ))}
                </div>
              </PageCard>
            </Col>
            <Col xs={24} md={14}>
              <PageCard className="dashboard-section">
                <h3 className="dashboard-section-title">最近注册用户</h3>
                {data.recent_users.length === 0 ? (
                  <EmptyState title="暂无用户" />
                ) : (
                  <div className="dashboard-list">
                    {data.recent_users.map((u) => (
                      <div key={u.id} className="dashboard-list-item">
                        <div>
                          <p className="dashboard-list-title">{u.name}</p>
                          <p className="dashboard-list-meta">
                            {u.username} · {dayjs(u.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Button onClick={() => navigate('/users')}>管理</Button>
                      </div>
                    ))}
                  </div>
                )}
              </PageCard>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Dashboard;
