import React from 'react';
import { Radio, Checkbox, Input, Typography } from 'antd';

const { Text } = Typography;

const QuestionRenderer = ({ question, value, onChange }) => {
  const { type, content, options, score } = question;

  const renderAnswerInput = () => {
    switch (type) {
      case 'single':
        return (
          <Radio.Group value={value} onChange={(e) => onChange(e.target.value)}>
            {options?.map((opt, index) => (
              <Radio key={index} value={String.fromCharCode(65 + index)}>
                {String.fromCharCode(65 + index)}. {opt}
              </Radio>
            ))}
          </Radio.Group>
        );
      case 'multiple':
        return (
          <Checkbox.Group value={value || []} onChange={onChange}>
            {options?.map((opt, index) => (
              <Checkbox key={index} value={String.fromCharCode(65 + index)}>
                {String.fromCharCode(65 + index)}. {opt}
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
        return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="请输入答案" />;
      case 'essay':
        return <Input.TextArea value={value} onChange={(e) => onChange(e.target.value)} rows={4} placeholder="请输入答案" />;
      default:
        return null;
    }
  };

  return (
    <div style={{ marginBottom: 24, padding: 16, border: '1px solid #d9d9d9', borderRadius: 8 }}>
      <Text strong>{content}</Text>
      <Text type="secondary" style={{ marginLeft: 8 }}>({score}分)</Text>
      <div style={{ marginTop: 12 }}>
        {renderAnswerInput()}
      </div>
    </div>
  );
};

export default QuestionRenderer;
