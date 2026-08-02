import React, { useState, useEffect } from 'react';
import { Table, Tag, message } from 'antd';
import { getMyRecords } from '../../../api/exams';
import PageHeader from '../../../components/PageHeader';
import PageCard from '../../../components/PageCard';

const MyRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await getMyRecords();
      setRecords(res.data || []);
    } catch (error) {
      message.error('获取考试记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const statusMap = {
    ongoing: { color: 'processing', text: '进行中' },
    submitted: { color: 'warning', text: '待阅卷' },
    graded: { color: 'success', text: '已阅卷' },
  };

  const columns = [
    { title: '考试名称', dataIndex: 'exam_title', key: 'exam_title' },
    { title: '得分', dataIndex: 'score', key: 'score' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusMap[status]?.color}>{statusMap[status]?.text || status}</Tag>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (v) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      title: '提交时间',
      dataIndex: 'submit_time',
      key: 'submit_time',
      render: (v) => (v ? new Date(v).toLocaleString() : '-'),
    },
    { title: '切屏次数', dataIndex: 'switch_count', key: 'switch_count' },
  ];

  return (
    <div>
      <PageHeader title="我的记录" subtitle="你参与过的考试与成绩" />
      <PageCard>
        <Table columns={columns} dataSource={records} loading={loading} rowKey="id" />
      </PageCard>
    </div>
  );
};

export default MyRecords;
