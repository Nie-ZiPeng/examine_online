import React, { useState, useEffect } from 'react';
import { Drawer, Descriptions, Tag, Spin, message } from 'antd';
import { getRecordAnswers } from '../../../api/grading';

const typeMap = {
  single: { color: 'blue', text: '单选题' },
  multiple: { color: 'geekblue', text: '多选题' },
  judge: { color: 'orange', text: '判断题' },
  blank: { color: 'purple', text: '填空题' },
  essay: { color: 'green', text: '简答题' },
};
const statusMap = {
  ongoing: { color: 'processing', text: '进行中' },
  submitted: { color: 'warning', text: '待阅卷' },
  graded: { color: 'success', text: '已阅卷' },
};

const GradingDrawer = ({ record, open, onClose, onChanged }) => {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !record) return;
    const fetchAnswers = async () => {
      setLoading(true);
      try {
        const res = await getRecordAnswers(record.id);
        setAnswers(res.data || []);
      } catch (error) {
        message.error('获取答题详情失败');
      } finally {
        setLoading(false);
      }
    };
    fetchAnswers();
  }, [open, record]);

  const totalEarned = answers.reduce((sum, a) => sum + (a.score ?? 0), 0);
  const totalFull = answers.reduce((sum, a) => sum + (a.question?.score || 0), 0);

  return (
    <Drawer
      title={record ? `${record.student?.name || record.student_id} 的答卷` : ''}
      width={720}
      open={open}
      onClose={onClose}
    >
      <Spin spinning={loading}>
        {record && (
          <>
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="学生">
                {record.student?.name}（{record.student?.username}）
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[record.status]?.color}>{statusMap[record.status]?.text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">{record.student?.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="电话">{record.student?.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="得分">{totalEarned} / {totalFull}</Descriptions.Item>
              <Descriptions.Item label="切屏次数">{record.switch_count}</Descriptions.Item>
              <Descriptions.Item label="提交时间" span={2}>
                {record.submit_time ? new Date(record.submit_time).toLocaleString() : '-'}
              </Descriptions.Item>
            </Descriptions>

            {answers.map((a, index) => (
              <div key={a.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <Tag color={typeMap[a.question.type]?.color}>{typeMap[a.question.type]?.text}</Tag>
                <strong>第 {index + 1} 题</strong>
                <span>（{a.question.score}分）</span>
                <p style={{ margin: '8px 0' }}>{a.question.content}</p>
                {a.question.options?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {a.question.options.map((opt, i) => (
                      <div key={i}>{String.fromCharCode(65 + i)}. {opt}</div>
                    ))}
                  </div>
                )}
                <p style={{ marginBottom: 4 }}>
                  <strong>正确答案：</strong>{a.question.answer || '（无）'}
                </p>
                <p style={{ marginBottom: 0 }}>
                  <strong>学生答案：</strong>{a.student_answer || '（未作答）'}
                </p>
              </div>
            ))}
            {answers.length === 0 && <div>该记录暂无答案</div>}
          </>
        )}
      </Spin>
    </Drawer>
  );
};

export default GradingDrawer;
