import React, { useState, useEffect } from 'react';
import { Drawer, Descriptions, Tag, Spin, message, Button, Space, InputNumber, Switch } from 'antd';
import {
  SaveOutlined,
  CheckSquareOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { getRecordAnswers, gradeAnswer, finalizeRecord } from '../../../api/grading';
import type { ExamRecord } from '../../../types/record';
import type { Answer, GradeRequest } from '../../../types/answer';
import type { QuestionType } from '../../../types/question';

const typeMap: Record<QuestionType, { text: string; color: string }> = {
  single: { text: '单选题', color: 'blue' },
  multiple: { text: '多选题', color: 'geekblue' },
  judge: { text: '判断题', color: 'orange' },
  blank: { text: '填空题', color: 'purple' },
  essay: { text: '简答题', color: 'green' },
};
const statusMap: Record<string, { color: string; text: string }> = {
  ongoing: { color: 'processing', text: '进行中' },
  submitted: { color: 'warning', text: '待阅卷' },
  graded: { color: 'success', text: '已阅卷' },
};

interface GradingDrawerProps {
  record: ExamRecord | null;
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}

const GradingDrawer = ({ record, open, onClose, onChanged }: GradingDrawerProps) => {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [correctness, setCorrectness] = useState<Record<number, boolean>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !record) return;
    const fetchAnswers = async () => {
      setLoading(true);
      try {
        const res = await getRecordAnswers(record.id);
        const list = res.data || [];
        setAnswers(list);
        const s: Record<number, number> = {};
        const c: Record<number, boolean> = {};
        list.forEach((a) => {
          s[a.id] = a.score ?? 0;
          c[a.id] = a.is_correct === true;
        });
        setScores(s);
        setCorrectness(c);
      } catch (error) {
        message.error('获取答题详情失败');
      } finally {
        setLoading(false);
      }
    };
    fetchAnswers();
  }, [open, record]);

  const handleSave = async (answer: Answer) => {
    setSavingId(answer.id);
    try {
      const isObjective = ['single', 'multiple', 'judge'].includes(answer.question?.type ?? '');
      const payload: GradeRequest = { score: scores[answer.id] ?? 0 };
      if (isObjective) payload.is_correct = correctness[answer.id];
      await gradeAnswer(answer.id, payload);
      message.success('已保存');
      onChanged?.();
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSavingId(null);
    }
  };

  const handleAutoGrade = async () => {
    if (!record) return;
    const objective = answers.filter((a) =>
      ['single', 'multiple', 'judge'].includes(a.question?.type ?? '')
    );
    if (objective.length === 0) {
      message.info('没有客观题');
      return;
    }
    const nextScores: Record<number, number> = { ...scores };
    const nextCorrect: Record<number, boolean> = { ...correctness };
    const judgeMap: Record<string, string> = {
      TRUE: '对', FALSE: '错', 正确: '对', 错误: '错',
      T: '对', F: '错', YES: '对', NO: '错', Y: '对', N: '错', 1: '对', 0: '错',
    };
    const normalize = (type: QuestionType, value?: string | null): string => {
      let v = (value == null ? '' : String(value)).trim().toUpperCase();
      if (type === 'multiple') v = v.replace(/[,，\s]+/g, '').split('').sort().join('');
      if (type === 'judge') v = judgeMap[v] || v;
      return v;
    };
    objective.forEach((a) => {
      const type = a.question?.type ?? 'blank';
      const stu = normalize(type, a.student_answer);
      const ans = normalize(type, a.question?.answer);
      const isCorrect = !!stu && stu === ans;
      nextScores[a.id] = isCorrect ? (a.question?.score ?? 0) : 0;
      nextCorrect[a.id] = isCorrect;
    });
    setScores(nextScores);
    setCorrectness(nextCorrect);
    for (const a of objective) {
      try {
        await gradeAnswer(a.id, { score: nextScores[a.id], is_correct: nextCorrect[a.id] });
      } catch (e) {
        // 单题失败不中断，继续其余题目
      }
    }
    message.success(`已自动判分 ${objective.length} 道客观题`);
    onChanged?.();
  };

  const handleFinalize = async () => {
    if (!record) return;
    try {
      await finalizeRecord(record.id);
      message.success('终评成功');
      onChanged?.();
      onClose();
    } catch (error) {
      message.error('终评失败');
    }
  };

  const totalEarned = answers.reduce((sum, a) => sum + (scores[a.id] ?? 0), 0);
  const totalFull = answers.reduce((sum, a) => sum + (a.question?.score || 0), 0);

  return (
    <Drawer
      title={record ? `${record.student?.name || record.student_id} 的答卷` : ''}
      width={720}
      open={open}
      onClose={onClose}
      extra={
        <Space>
          <Button icon={<CheckSquareOutlined />} onClick={handleAutoGrade}>
            自动判分客观题
          </Button>
          <Button type="primary" icon={<AuditOutlined />} onClick={handleFinalize}>
            终评
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {record && (
          <>
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="学生">
                {record.student?.name}（{record.student?.username}）
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[record.status]?.color}>{statusMap[record.status]?.text || record.status}</Tag>
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
              <div key={a.id} style={{ border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, marginBottom: 16, background: '#fff', boxShadow: 'var(--shadow-card)' }}>
                <Tag color={typeMap[a.question?.type ?? 'blank']?.color}>
                  {typeMap[a.question?.type ?? 'blank']?.text}
                </Tag>
                <strong>第 {index + 1} 题</strong>
                <span>（{a.question?.score}分）</span>
                <p style={{ margin: '8px 0' }}>{a.question?.content}</p>
                {Array.isArray(a.question?.options) && (a.question?.options?.length ?? 0) > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {a.question?.options?.map((opt, i) => (
                      <div key={i}>{String.fromCharCode(65 + i)}. {opt}</div>
                    ))}
                  </div>
                )}
                <p style={{ marginBottom: 4 }}>
                  <strong>正确答案：</strong>{a.question?.answer || '（无）'}
                </p>
                <p style={{ marginBottom: 0 }}>
                  <strong>学生答案：</strong>{a.student_answer || '（未作答）'}
                </p>
                <Space align="center" style={{ marginTop: 12 }}>
                  {['single', 'multiple', 'judge'].includes(a.question?.type ?? '') && (
                    <>
                      <span>正确</span>
                      <Switch
                        checked={correctness[a.id]}
                        onChange={(v: boolean) => setCorrectness((p) => ({ ...p, [a.id]: v }))}
                      />
                    </>
                  )}
                  <span>得分</span>
                  <InputNumber
                    min={0}
                    max={a.question?.score}
                    value={scores[a.id]}
                    onChange={(v: number | null) => setScores((p) => ({ ...p, [a.id]: v ?? 0 }))}
                  />
                  <span>/ {a.question?.score}</span>
                  <Button
                    type="primary"
                    size="small"
                    icon={<SaveOutlined />}
                    loading={savingId === a.id}
                    onClick={() => handleSave(a)}
                  >
                    保存
                  </Button>
                </Space>
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
