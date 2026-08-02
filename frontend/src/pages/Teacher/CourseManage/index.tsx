import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, Popconfirm, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { getCourses, createCourse, updateCourse, deleteCourse } from '../../../api/courses';
import type { Course } from '../../../types/course';
import PageHeader from '../../../components/PageHeader';
import PageCard from '../../../components/PageCard';

const { TextArea } = Input;

interface CourseFormValues {
  name: string;
  description?: string;
}

const CourseManage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<CourseFormValues>();

  const fetchCourses = async (p: number, ps: number) => {
    setLoading(true);
    try {
      const res = await getCourses({ page: p, page_size: ps });
      const items = res.data.items || [];
      setCourses(items);
      setTotal(res.data.total || 0);
      if (items.length === 0 && page > 1) setPage(page - 1);
    } catch (error) {
      message.error('获取课程列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses(page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const handleAdd = () => {
    setEditingCourse(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Course) => {
    setEditingCourse(record);
    form.setFieldsValue({ name: record.name, description: record.description ?? undefined });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCourse(id);
      message.success('删除成功');
      fetchCourses(page, pageSize);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingCourse) {
        await updateCourse(editingCourse.id, values);
        message.success('更新成功');
      } else {
        await createCourse(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      fetchCourses(page, pageSize);
    } catch (error) {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<Course> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
    { title: '课程名称', dataIndex: 'name', key: 'name' },
    { title: '课程描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v?: string) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该课程？" onConfirm={() => handleDelete(record.id)}>
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
      <PageHeader
        title="课程管理"
        subtitle="维护课程信息，供考试关联使用"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新建课程
          </Button>
        }
      />
      <PageCard>
        <Table
          columns={columns}
          dataSource={courses}
          loading={loading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t: number) => `共 ${t} 条`,
            onChange: (p: number, ps: number) => { setPage(p); setPageSize(ps); },
          }}
        />
      </PageCard>
      <Modal
        title={editingCourse ? '编辑课程' : '新建课程'}
        open={modalVisible}
        onOk={handleSubmit}
        confirmLoading={submitting}
        onCancel={() => setModalVisible(false)}
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="课程名称" rules={[{ required: true, message: '请输入课程名称' }]}>
            <Input maxLength={100} placeholder="请输入课程名称" />
          </Form.Item>
          <Form.Item name="description" label="课程描述">
            <TextArea rows={3} placeholder="请输入课程描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CourseManage;
