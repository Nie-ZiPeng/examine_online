import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Select, Tag, Space, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { getExams } from '../../../api/exams';
import { getExamRecords } from '../../../api/grading';
import GradingDrawer from './GradingDrawer';

const statusMap = {
  ongoing: { color: 'processing', text: '进行中' },
  submitted: { color: 'warning', text: '待阅卷' },
  graded: { color: 'success', text: '已阅卷' },
};

const Grading = () => {
  const [searchParams] = useSearchParams();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState(null);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [drawerRecord, setDrawerRecord] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    getExams({ page_size: 100 })
      .then((res) => setExams(res.data.items || []))
      .catch(() => message.error('获取考试列表失败'));
  }, []);

  useEffect(() => {
    const urlExamId = searchParams.get('examId');
    if (urlExamId) setExamId(Number(urlExamId));
  }, [searchParams]);

  const fetchRecords = async (exam, p, ps) => {
    if (!exam) return;
    setRecordsLoading(true);
    try {
      const res = await getExamRecords(exam, { page: p, page_size: ps });
      setRecords(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      message.error('获取考试记录失败');
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    if (examId) fetchRecords(examId, page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, page, pageSize]);

  const handleOpenDrawer = (record) => {
    setDrawerRecord(record);
    setDrawerOpen(true);
  };

  const columns = [
    { title: '学生姓名', dataIndex: ['student', 'name'], key: 'student_name' },
    { title: '用户名', dataIndex: ['student', 'username'], key: 'username' },
    { title: '邮箱', dataIndex: ['student', 'email'], key: 'email' },
    { title: '得分', dataIndex: 'score', key: 'score', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>,
    },
    { title: '切屏次数', dataIndex: 'switch_count', key: 'switch_count', width: 100 },
    {
      title: '提交时间',
      dataIndex: 'submit_time',
      key: 'submit_time',
      render: (v) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => handleOpenDrawer(record)}>
            阅卷
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="阅卷管理">
      <Space style={{ marginBottom: 16 }}>
        <span>选择考试：</span>
        <Select
          style={{ width: 280 }}
          placeholder="请选择考试"
          value={examId}
          onChange={(v) => {
            setExamId(v);
            setPage(1);
          }}
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
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        locale={{ emptyText: examId ? '该考试暂无记录' : '请先选择考试' }}
      />
      <GradingDrawer
        record={drawerRecord}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onChanged={() => fetchRecords(examId, page, pageSize)}
      />
    </Card>
  );
};

export default Grading;
