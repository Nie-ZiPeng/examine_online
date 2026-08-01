import React, { useState, useEffect } from 'react';
import {
  Table, Button, Tag, Space, Popconfirm, message, Form, Input, Select,
  InputNumber, Modal, DatePicker, Switch, Card, Divider, Row, Col,
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, MinusCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getExam, createExam, updateExam, getExamQuestions, createQuestion, deleteQuestion,
} from '../../../api/exams';
import { getCourses } from '../../../api/courses';

const { TextArea } = Input;

const typeMap = {
  single: { color: 'blue', text: '单选题' },
  multiple: { color: 'geekblue', text: '多选题' },
  judge: { color: 'orange', text: '判断题' },
  blank: { color: 'purple', text: '填空题' },
  essay: { color: 'green', text: '简答题' },
};

const optionLetters = (index) => String.fromCharCode(65 + index);

const ExamEdit = () => {
  const { examId } = useParams();
  const isNew = examId === 'new';
  const navigate = useNavigate();
  const [examForm] = Form.useForm();
  const [questionForm] = Form.useForm();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState([]);
  const questionType = Form.useWatch('type', questionForm);

  const fetchData = async () => {
    if (isNew) {
      try {
        const res = await getCourses();
        setCourses(res.data || []);
      } catch (error) {
        message.error('加载课程列表失败');
      }
      return;
    }
    setLoading(true);
    try {
      const [examRes, questionsRes] = await Promise.all([
        getExam(examId),
        getExamQuestions(examId),
      ]);
      const examData = examRes.data;
      setQuestions(questionsRes.data || []);
      examForm.setFieldsValue({
        title: examData.title,
        description: examData.description,
        duration: examData.duration,
        total_score: examData.total_score,
        pass_score: examData.pass_score,
        start_time: dayjs(examData.start_time),
        end_time: dayjs(examData.end_time),
        random_order: examData.random_order,
        max_switch: examData.max_switch,
      });
    } catch (error) {
      message.error('加载考试详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const handleSaveExam = async () => {
    try {
      const values = await examForm.validateFields();
      setSaving(true);
      const payload = {
        title: values.title,
        description: values.description,
        duration: values.duration,
        total_score: values.total_score,
        pass_score: values.pass_score,
        start_time: values.start_time.format('YYYY-MM-DD HH:mm:ss'),
        end_time: values.end_time.format('YYYY-MM-DD HH:mm:ss'),
        random_order: values.random_order,
        max_switch: values.max_switch,
      };
      if (isNew) {
        const created = await createExam({ ...payload, course_id: values.course_id });
        message.success('考试创建成功');
        navigate(`/exams/${created.data.id}/edit`);
        return;
      }
      await updateExam(examId, payload);
      message.success('考试信息保存成功');
      fetchData();
    } catch (error) {
      message.error('保存考试信息失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (id) => {
    try {
      await deleteQuestion(id);
      message.success('删除成功');
      fetchData();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const openAddModal = () => {
    questionForm.resetFields();
    questionForm.setFieldsValue({ type: 'single', score: 5, options: ['', '', '', ''] });
    setModalVisible(true);
  };

  const handleAddQuestion = async () => {
    try {
      const values = await questionForm.validateFields();
      setSubmitting(true);
      const payload = {
        type: values.type,
        content: values.content,
        answer: values.answer,
        score: values.score,
        sort_order: questions.length + 1,
        options: ['single', 'multiple'].includes(values.type) ? (values.options || []) : null,
      };
      await createQuestion(examId, payload);
      message.success('添加题目成功');
      setModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('添加题目失败');
    } finally {
      setSubmitting(false);
    }
  };

  const questionColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 90,
      render: (type) => <Tag color={typeMap[type]?.color}>{typeMap[type]?.text}</Tag>,
    },
    { title: '题目内容', dataIndex: 'content', key: 'content', ellipsis: true },
    {
      title: '分值',
      dataIndex: 'score',
      key: 'score',
      width: 70,
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_, record) => (
        <Space>
          <Popconfirm title="确认删除该题目？" onConfirm={() => handleDeleteQuestion(record.id)}>
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
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/exams')}>
          返回列表
        </Button>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSaveExam}>
          {isNew ? '创建考试' : '保存考试信息'}
        </Button>
      </Space>

      <Card loading={loading} title="考试基本信息" style={{ marginBottom: 16 }}>
        <Form form={examForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="考试标题" rules={[{ required: true, message: '请输入考试标题' }]}>
                <Input placeholder="请输入考试标题" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="考试说明">
                <Input placeholder="请输入考试说明" />
              </Form.Item>
            </Col>
            {isNew && (
              <Col span={12}>
                <Form.Item name="course_id" label="所属课程" rules={[{ required: true, message: '请选择所属课程' }]}>
                  <Select placeholder="请选择课程">
                    {courses.map((c) => (
                      <Select.Option key={c.id} value={c.id}>
                        {c.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            )}
            <Col span={6}>
              <Form.Item name="duration" label="考试时长(分钟)" rules={[{ required: true, message: '请输入考试时长' }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="total_score" label="总分" rules={[{ required: true, message: '请输入总分' }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="pass_score" label="及格分" rules={[{ required: true, message: '请输入及格分' }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="max_switch" label="最大切屏次数">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="start_time" label="开始时间" rules={[{ required: true, message: '请选择开始时间' }]}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="end_time" label="结束时间" rules={[{ required: true, message: '请选择结束时间' }]}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="random_order" label="题目随机排序" valuePropName="checked" initialValue>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {!isNew && (
        <Card
          loading={loading}
          title={`题目管理（${questions.length}）`}
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
              添加题目
            </Button>
          }
        >
          <Table columns={questionColumns} dataSource={questions} rowKey="id" pagination={false} />
        </Card>
      )}

      <Modal
        title="添加题目"
        open={modalVisible}
        onOk={handleAddQuestion}
        onCancel={() => setModalVisible(false)}
        confirmLoading={submitting}
        width={640}
      >
        <Divider style={{ marginTop: 8 }} />
        <Form form={questionForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="题型" rules={[{ required: true }]}>
                <Select>
                  {Object.entries(typeMap).map(([value, info]) => (
                    <Select.Option key={value} value={value}>
                      {info.text}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="score" label="分值" rules={[{ required: true, message: '请输入分值' }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="content" label="题目内容" rules={[{ required: true, message: '请输入题目内容' }]}>
            <TextArea rows={3} placeholder="请输入题目内容" />
          </Form.Item>

          {['single', 'multiple'].includes(questionType) && (
            <Form.Item label="选项" required>
              <Form.List name="options">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, index) => (
                      <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                        <span style={{ width: 20, textAlign: 'right' }}>{optionLetters(index)}.</span>
                        <Form.Item
                          {...field}
                          name={field.name}
                          rules={[{ required: true, message: '请输入选项内容' }]}
                          noStyle
                        >
                          <Input placeholder="选项内容" style={{ width: 420 }} />
                        </Form.Item>
                        {fields.length > 2 && (
                          <MinusCircleOutlined onClick={() => remove(field.name)} />
                        )}
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add('')} block icon={<PlusOutlined />}>
                      添加选项
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          )}

          {questionType === 'judge' ? (
            <Form.Item name="answer" label="正确答案" rules={[{ required: true, message: '请选择正确答案' }]}>
              <Select>
                <Select.Option value="true">正确</Select.Option>
                <Select.Option value="false">错误</Select.Option>
              </Select>
            </Form.Item>
          ) : (
            <Form.Item name="answer" label="参考答案" rules={[{ required: true, message: '请输入参考答案' }]}>
              <TextArea rows={2} placeholder="客观题填选项（如 A 或 A,B），主观题填参考答案" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default ExamEdit;
