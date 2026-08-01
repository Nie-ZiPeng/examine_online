import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getExams, deleteExam, publishExam } from '../../../api/exams';

const ExamManage = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await getExams();
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

  const handleDelete = async (id) => {
    try {
      await deleteExam(id);
      message.success('删除成功');
      fetchExams();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handlePublish = async (id) => {
    try {
      await publishExam(id);
      message.success('发布成功');
      fetchExams();
    } catch (error) {
      message.error('发布失败');
    }
  };

  const statusMap = {
    draft: { color: 'default', text: '草稿' },
    published: { color: 'success', text: '已发布' },
    ongoing: { color: 'processing', text: '进行中' },
    finished: { color: 'default', text: '已结束' },
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '考试标题', dataIndex: 'title', key: 'title' },
    { title: '时长(分钟)', dataIndex: 'duration', key: 'duration' },
    { title: '总分', dataIndex: 'total_score', key: 'total_score' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/exams/${record.id}/edit`)}>
            编辑
          </Button>
          {record.status === 'draft' && (
            <Button type="link" icon={<SendOutlined />} onClick={() => handlePublish(record.id)}>
              发布
            </Button>
          )}
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/exams/new')} style={{ marginBottom: 16 }}>
        创建考试
      </Button>
      <Table columns={columns} dataSource={exams} loading={loading} rowKey="id" />
    </div>
  );
};

export default ExamManage;
