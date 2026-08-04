import React, { useState, useEffect, useCallback } from 'react';
import { App, Card, Table, Button, Select, Space, Popconfirm, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getUsers } from '../../../api/users';
import { getSubjects, getTeacherSubjects, assignSubjectToTeacher, removeSubjectFromTeacher } from '../../../api/teacher_subjects';
import type { User } from '../../../types/user';
import type { Subject } from '../../../types/teacher_subject';
import PageHeader from '../../../components/PageHeader';
import PageCard from '../../../components/PageCard';
import EmptyState from '../../../components/EmptyState';

const TeacherSubjectManage = () => {
  const { message } = App.useApp();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [assigned, setAssigned] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await getUsers({ role: 'teacher', page: 1, page_size: 100 });
      setTeachers(res.data.items || []);
    } catch (error) {
      message.error('获取教师列表失败');
    }
  }, [message]);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await getSubjects();
      setSubjects(res.data || []);
    } catch (error) {
      message.error('获取学科列表失败');
    }
  }, [message]);

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
  }, [fetchTeachers, fetchSubjects]);

  const fetchAssigned = useCallback(async (teacherId: number) => {
    setLoading(true);
    try {
      const res = await getTeacherSubjects(teacherId);
      setAssigned(res.data || []);
    } catch (error) {
      message.error('获取学科分配失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  const handleTeacherChange = (teacherId: number) => {
    setSelectedTeacherId(teacherId);
    setSelectedSubjectId(undefined);
    fetchAssigned(teacherId);
  };

  const handleAssign = async () => {
    if (!selectedTeacherId || !selectedSubjectId) {
      message.warning('请选择教师和学科');
      return;
    }
    try {
      await assignSubjectToTeacher(selectedTeacherId, { subject_id: selectedSubjectId });
      message.success('分配成功');
      fetchAssigned(selectedTeacherId);
      setSelectedSubjectId(undefined);
    } catch (error) {
      message.error('分配失败');
    }
  };

  const handleRemove = async (subjectId: number) => {
    if (!selectedTeacherId) return;
    try {
      await removeSubjectFromTeacher(selectedTeacherId, subjectId);
      message.success('移除成功');
      fetchAssigned(selectedTeacherId);
    } catch (error) {
      message.error('移除失败');
    }
  };

  const unassignedSubjects = subjects.filter((s) => !assigned.some((a) => a.id === s.id));

  const columns: ColumnsType<Subject> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '学科名称', dataIndex: 'name', key: 'name' },
    {
      title: '操作', key: 'action', width: 100,
      render: (_, record) => (
        <Popconfirm title="确认移除该学科？" onConfirm={() => handleRemove(record.id)}>
          <Button type="link" danger icon={<DeleteOutlined />}>移除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="教师学科分配" subtitle="为教师分配可管理学科，教师只能发布所授学科的考试" />
      <PageCard>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="选择教师"
            style={{ width: 240 }}
            value={selectedTeacherId ?? undefined}
            onChange={handleTeacherChange}
            options={teachers.map((t) => ({ value: t.id, label: `${t.name}（${t.username}）` }))}
          />
          <Select
            placeholder="选择学科"
            style={{ width: 200 }}
            value={selectedSubjectId}
            onChange={setSelectedSubjectId}
            options={unassignedSubjects.map((s) => ({ value: s.id, label: s.name }))}
            disabled={!selectedTeacherId}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAssign}>分配</Button>
        </Space>
        {!selectedTeacherId ? (
          <EmptyState title="请先选择教师" description="选择教师后查看其学科分配" />
        ) : (
          <>
            <Card size="small" title={`已分配学科（${assigned.length}）`} style={{ marginBottom: 16 }}>
              <Space wrap>
                {assigned.length === 0 ? (
                  <span>尚未分配学科</span>
                ) : (
                  assigned.map((s) => <Tag key={s.id} color="blue">{s.name}</Tag>)
                )}
              </Space>
            </Card>
            <Table rowKey="id" columns={columns} dataSource={assigned} loading={loading} pagination={false} />
          </>
        )}
      </PageCard>
    </div>
  );
};

export default TeacherSubjectManage;
