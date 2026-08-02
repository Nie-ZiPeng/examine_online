import React, { useState, useEffect } from 'react';
import { Table, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getExams, startExam } from '../../../api/exams';
import PageHeader from '../../../components/PageHeader';
import PageCard from '../../../components/PageCard';

const ExamList = () => {
  const [exams, setExams] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStart = async (record) => {
    try {
      await startExam(record.id);
      navigate(`/exams/${record.id}/take`, { state: { duration: record.duration } });
    } catch (error) {
      message.error('开始考试失败');
    }
  };

  const fetchExams = async (p, ps) => {
    setLoading(true);
    try {
      const res = await getExams({ status: 'published', page: p, page_size: ps });
      const items = res.data.items || [];
      setExams(items);
      setTotal(res.data.total || 0);
      if (items.length === 0 && page > 1) setPage(page - 1);
    } catch (error) {
      message.error('获取考试列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams(page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const columns = [
    { title: '考试标题', dataIndex: 'title', key: 'title' },
    { title: '考试时长', dataIndex: 'duration', key: 'duration', render: (v) => `${v}分钟` },
    { title: '总分', dataIndex: 'total_score', key: 'total_score' },
    { title: '及格分', dataIndex: 'pass_score', key: 'pass_score' },
    {
      title: '考试时间',
      key: 'time',
      render: (_, record) => (
        `${new Date(record.start_time).toLocaleString()} - ${new Date(record.end_time).toLocaleString()}`
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" onClick={() => handleStart(record)}>
          开始考试
        </Button>
      ),
    },
  ];

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
};

export default ExamList;
