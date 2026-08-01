import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Space, Modal, message, Tag } from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getPaper, saveAnswers, submitExam, recordSwitch } from '../../../api/exams';
import QuestionRenderer from '../../../components/QuestionRenderer';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const ExamTaking = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [paper, setPaper] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() => {
    const duration = location.state?.duration;
    return duration ? duration * 60 : 0;
  });

  // 切屏检测
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        await recordSwitch(examId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [examId]);

  const handleSubmit = useCallback(async () => {
    Modal.confirm({
      title: '确认交卷？',
      content: '交卷后将无法修改答案',
      onOk: async () => {
        setLoading(true);
        try {
          const res = await submitExam(examId);
          message.success(`交卷成功，得分：${res.data.score}`);
          navigate('/my-records');
        } catch (error) {
          message.error('交卷失败');
        } finally {
          setLoading(false);
        }
      },
    });
  }, [examId, navigate]);

  // 倒计时
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit]);

  // 自动保存
  useEffect(() => {
    const timer = setInterval(async () => {
      if (Object.keys(answers).length > 0) {
        await saveAnswers(examId, answers);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [answers, examId]);

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        const res = await getPaper(examId);
        setPaper(res.data);
        setAnswers(res.data.saved_answers || {});
      } catch (error) {
        message.error('获取试卷失败');
        navigate('/');
      }
    };
    fetchPaper();
  }, [examId, navigate]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  if (!paper) return null;

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <span>考试进行中</span>
            <Tag color="processing">剩余时间：{formatTime(timeLeft)}</Tag>
          </Space>
        }
        extra={
          <Button type="primary" danger onClick={handleSubmit} loading={loading}>
            交卷
          </Button>
        }
      >
        {paper.questions.map((q, index) => (
          <QuestionRenderer
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(value) => handleAnswerChange(q.id, value)}
          />
        ))}
      </Card>
    </div>
  );
};

export default ExamTaking;
