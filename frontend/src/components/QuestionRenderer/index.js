import React from 'react';
import { Radio, Checkbox, Input, Tag } from 'antd';
import './index.css';

const typeMap = {
  single: { text: '单选题', color: 'blue' },
  multiple: { text: '多选题', color: 'geekblue' },
  judge: { text: '判断题', color: 'orange' },
  blank: { text: '填空题', color: 'purple' },
  essay: { text: '简答题', color: 'green' },
};

const QuestionRenderer = ({ question, value, onChange, index = 0 }) => {
  const { type, content, options, score } = question;
  const typeInfo = typeMap[type] || { text: type, color: 'default' };

  const renderAnswerInput = () => {
    switch (type) {
      case 'single':
        return (
          <Radio.Group value={value} onChange={(e) => onChange(e.target.value)}>
            {options?.map((opt, i) => (
              <Radio key={i} value={String.fromCharCode(65 + i)}>
                {String.fromCharCode(65 + i)}. {opt}
              </Radio>
            ))}
          </Radio.Group>
        );
      case 'multiple':
        return (
          <Checkbox.Group value={value || []} onChange={onChange}>
            {options?.map((opt, i) => (
              <Checkbox key={i} value={String.fromCharCode(65 + i)}>
                {String.fromCharCode(65 + i)}. {opt}
              </Checkbox>
            ))}
          </Checkbox.Group>
        );
      case 'judge':
        return (
          <Radio.Group value={value} onChange={(e) => onChange(e.target.value)}>
            <Radio value="对">对</Radio>
            <Radio value="错">错</Radio>
          </Radio.Group>
        );
      case 'blank':
        return (
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="请输入答案" />
        );
      case 'essay':
        return (
          <Input.TextArea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            placeholder="请输入答案"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="question-card">
      <div className="question-card-head">
        <span className="question-card-index">第 {index + 1} 题</span>
        <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
        <Tag>{score} 分</Tag>
      </div>
      <div className="question-card-content">{content}</div>
      <div className="question-card-options">{renderAnswerInput()}</div>
    </div>
  );
};

export default QuestionRenderer;
