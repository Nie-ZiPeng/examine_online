import React, { useState, useEffect } from 'react';
import { Table, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getExams, startExam } from '../../../api/exams';

const ExamList = () => {
  const [exams, setExams] = useState([]);
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

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await getExams({ status: 'published' });
      setExams(res.data);
    } catch (error) {
      message.error('获取考试列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

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

  return <Table columns={columns} dataSource={exams} loading={loading} rowKey="id" />;
};

export default ExamList;
